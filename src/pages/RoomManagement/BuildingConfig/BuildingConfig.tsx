import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import {
  Plus, Edit, Trash2, Layers, LayoutTemplate, BedDouble,
  X as LucideX, Building, Home, Tag, Upload, Eye,
  ChevronLeft, ChevronRight, History, AlertTriangle, CheckCircle, Settings
} from "lucide-react";
import "./BuildingConfig.css";

import { AppModal } from '../../../components/common/Modal';
import { useToast } from '../../../components/common/Toast';

const API_BASE_URL = "http://localhost:9999/api";

const IMAGE_LABELS = [
  "Ảnh tổng quan", "Ảnh bếp", "Ảnh giường", "Ảnh bàn học",
  "Ảnh ban công", "Ảnh nhà vệ sinh", "Ảnh khác"
];

interface Floor {
  _id: string;
  name: string;
  description?: string;
  roomCount?: number;
}

interface PriceHistory {
  _id: string;
  name: string;
  price: number;
  startDate: string;
  endDate: string | null;
}

interface RoomType {
  _id: string;
  typeName: string;
  currentPrice: number;
  personMax: number;
  description: string;
  images: string[];
  histories?: PriceHistory[];
}

const BuildingConfig = () => {
  const { showToast } = useToast();

  const [floors, setFloors] = useState<Floor[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showFloorModal, setShowFloorModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [deleteConfig, setDeleteConfig] = useState<{
    type: 'FLOOR' | 'ROOM_TYPE' | null,
    target: any | null
  }>({ type: null, target: null });

  // Viewing/Editing data
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [editingType, setEditingType] = useState<RoomType | null>(null);
  const [viewingType, setViewingType] = useState<RoomType | null>(null);

  // Forms
  const [floorForm, setFloorForm] = useState({ name: "", description: "" });
  const [typeForm, setTypeForm] = useState({
    typeName: "",
    currentPrice: 0,
    personMax: 1,
    description: "",
  });

  const [imageSlots, setImageSlots] = useState<Array<{ file?: File, preview?: string, url?: string } | null>>(Array(7).fill(null));

  // Lightbox
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser?.role || '';
  const canModify = userRole === 'owner';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [floorRes, typeRes, roomRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/floors`),
        axios.get(`${API_BASE_URL}/roomtypes`),
        axios.get(`${API_BASE_URL}/rooms`),
      ]);

      const rawFloors: Floor[] = floorRes.data.data || floorRes.data || [];
      const rawRooms: any[] = roomRes.data.data || roomRes.data || [];

      const roomCountsByFloor: { [key: string]: number } = {};
      rawRooms.forEach((room) => {
        const fId = typeof room.floorId === "object" && room.floorId !== null
          ? room.floorId._id
          : room.floorId;
        if (fId) roomCountsByFloor[fId] = (roomCountsByFloor[fId] || 0) + 1;
      });

      const floorsWithCount = rawFloors.map((floor) => ({
        ...floor,
        roomCount: roomCountsByFloor[floor._id] || 0,
      }));

      setFloors(floorsWithCount);
      setRoomTypes(typeRes.data.data || typeRes.data || []);
    } catch (error) {
      showToast('error', "Lỗi dữ liệu", "Không thể tải thông tin cấu hình tòa nhà.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalRooms = useMemo(() => floors.reduce((acc, f) => acc + (f.roomCount || 0), 0), [floors]);
  const totalFloors = floors.length;
  const totalTypes = roomTypes.length;

  // --- Handlers ---

  const handleOpenFloorModal = (floor?: Floor) => {
    if (floor) {
      setEditingFloor(floor);
      setFloorForm({ name: floor.name, description: floor.description || "" });
    } else {
      setEditingFloor(null);
      setFloorForm({ name: "", description: "" });
    }
    setShowFloorModal(true);
  };

  const handleSaveFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFloor) {
        await axios.put(`${API_BASE_URL}/floors/${editingFloor._id}`, floorForm);
        showToast('success', "Thành công", "Cập nhật tầng thành công!");
      } else {
        await axios.post(`${API_BASE_URL}/floors`, floorForm);
        showToast('success', "Thành công", "Thêm tầng mới thành công!");
      }
      setShowFloorModal(false);
      fetchData();
    } catch (error: any) {
      showToast('error', "Lỗi", error.response?.data?.message || "Không thể lưu thông tin tầng.");
    }
  };

  const handleOpenTypeModal = (type?: RoomType) => {
    if (type) {
      setEditingType(type);
      setTypeForm({
        typeName: type.typeName,
        currentPrice: type.currentPrice,
        personMax: type.personMax,
        description: type.description,
      });
      const slots = Array(7).fill(null);
      if (type.images && type.images.length > 0) {
        type.images.forEach((url, idx) => { if (idx < 7) slots[idx] = { url }; });
      }
      setImageSlots(slots);
    } else {
      setEditingType(null);
      setTypeForm({ typeName: "", currentPrice: 0, personMax: 1, description: "" });
      setImageSlots(Array(7).fill(null));
    }
    setShowTypeModal(true);
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    const filledCount = imageSlots.filter(s => s !== null).length;
    if (filledCount < 7) {
      showToast('warning', "Thiếu ảnh", `Vui lòng cung cấp đủ 7 ảnh (Hiện có ${filledCount}/7).`);
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("typeName", typeForm.typeName);
      formData.append("currentPrice", typeForm.currentPrice.toString());
      formData.append("personMax", typeForm.personMax.toString());
      formData.append("description", typeForm.description);

      imageSlots.forEach((slot) => {
        if (slot?.url) formData.append("oldImages", slot.url);
        if (slot?.file) formData.append("images", slot.file);
      });

      const url = editingType ? `${API_BASE_URL}/roomtypes/${editingType._id}` : `${API_BASE_URL}/roomtypes`;
      const method = editingType ? "PUT" : "POST";

      const res = await fetch(url, { method, body: formData });
      if (!res.ok) throw new Error("Lỗi lưu loại phòng");

      showToast('success', "Thành công", editingType ? "Đã cập nhật loại phòng." : "Đã thêm loại phòng mới.");
      setShowTypeModal(false);
      fetchData();
    } catch (err: any) {
      showToast('error', "Lỗi hệ thống", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (type: 'FLOOR' | 'ROOM_TYPE', item: any) => {
    setDeleteConfig({ type, target: item });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfig.target) return;
    try {
      setLoading(true);
      const endpoint = deleteConfig.type === 'FLOOR' ? 'floors' : 'roomtypes';
      await axios.delete(`${API_BASE_URL}/${endpoint}/${deleteConfig.target._id}`);
      showToast('success', "Xóa thành공", `Đã xóa ${deleteConfig.type === 'FLOOR' ? 'tầng' : 'loại phòng'} thành công.`);
      fetchData();
      setShowDeleteModal(false);
    } catch (err: any) {
      showToast('error', "Lỗi", err.response?.data?.message || "Lỗi khi xóa dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  // --- Image Handlers ---
  const handleSlotFileChange = (index: number, file: File) => {
    const preview = URL.createObjectURL(file);
    setImageSlots(prev => {
      const newSlots = [...prev];
      if (newSlots[index]?.preview) URL.revokeObjectURL(newSlots[index]!.preview!);
      newSlots[index] = { file, preview };
      return newSlots;
    });
  };

  const removeSlot = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setImageSlots(prev => {
      const newSlots = [...prev];
      if (newSlots[index]?.preview) URL.revokeObjectURL(newSlots[index]!.preview!);
      newSlots[index] = null;
      return newSlots;
    });
  };

  // --- Lightbox logic ---
  const images = viewingType?.images || [];
  const nextImage = useCallback(() => images.length > 0 && setPhotoIndex(p => (p + 1) % images.length), [images]);
  const prevImage = useCallback(() => images.length > 0 && setPhotoIndex(p => (p + images.length - 1) % images.length), [images]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "Escape") setIsLightboxOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, nextImage, prevImage]);

  const formatCurrency = (val: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  const formatDate = (ds: string | null) => ds ? new Date(ds).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Hiện tại";

  return (
    <div className="config-container">
      <div className="page-header">
        <div className="page-title-row" style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div className="page-title-icon" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, #3579c6 0%, #2a5fa3 100%)',
            color: '#ffffff',
            flexShrink: 0,
            boxShadow: '0 4px 14px rgba(53, 121, 198, 0.3)'
          }} aria-hidden>
            <Settings size={22} strokeWidth={2} />
          </div>
          <div className="page-title-group">
            <h2 className="page-title">Cấu hình Tòa nhà</h2>
            <p className="page-subtitle">Quản lý sơ đồ tầng và các hạng mục kiến trúc phòng thuê.</p>
          </div>
        </div>

        <div className="stats-summary">
          <div className="stat-item">
            <Building size={18} className="stat-icon icon-primary" />
            <div className="stat-text">
              <span className="stat-value">{totalFloors}</span>
              <span className="stat-label">Tầng</span>
            </div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <Home size={18} className="stat-icon icon-accent" />
            <div className="stat-text">
              <span className="stat-value">{totalRooms}</span>
              <span className="stat-label">Tổng phòng</span>
            </div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <Tag size={18} className="stat-icon icon-success" />
            <div className="stat-text">
              <span className="stat-value">{totalTypes}</span>
              <span className="stat-label">Loại phòng</span>
            </div>
          </div>
        </div>
      </div>

      <div className="config-content">
        {/* SECTION: FLOORS */}
        <section className="section-block">
          <div className="section-header">
            <div className="section-title-wrapper">
              <Layers className="section-icon" size={20} />
              <h3>Quản lý Sơ đồ Tầng</h3>
            </div>
            {canModify && (
              <button className="btn-primary" onClick={() => handleOpenFloorModal()}>
                <Plus size={16} /> Thêm tầng
              </button>
            )}
          </div>

          <div className="table-wrapper">
            <table className="config-table">
              <thead>
                <tr>
                  <th>Tên tầng</th>
                  <th>Số lượng phòng</th>
                  <th>Ghi chú / Mô tả</th>
                  {canModify && <th style={{ textAlign: 'center' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {floors.map(floor => (
                  <tr key={floor._id}>
                    <td>
                      <div className="room-type-name">
                        <Layers size={16} style={{ color: '#3579c6' }} />
                        {floor.name}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BedDouble size={14} className="text-muted" />
                        <span style={{ fontWeight: 600 }}>{floor.roomCount || 0} phòng</span>
                      </div>
                    </td>
                    <td className="text-muted">
                      {floor.description || "—"}
                    </td>
                    {canModify && (
                      <td>
                        <div className="action-group">
                          <button className="btn-icon-sm" onClick={() => handleOpenFloorModal(floor)} title="Sửa">
                            <Edit size={14} />
                          </button>
                          <button className="btn-icon-sm delete" onClick={() => handleDeleteClick('FLOOR', floor)} title="Xóa">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {floors.length === 0 && <div className="text-muted" style={{ padding: '24px', textAlign: 'center' }}>Chưa có tầng nào được cấu hình.</div>}
          </div>
        </section>

        {/* SECTION: ROOM TYPES */}
        <section className="section-block">
          <div className="section-header">
            <div className="section-title-wrapper">
              <LayoutTemplate className="section-icon" size={20} />
              <h3>Danh mục Loại phòng</h3>
            </div>
            {canModify && (
              <button className="btn-primary" onClick={() => handleOpenTypeModal()}>
                <Plus size={16} /> Thêm loại mới
              </button>
            )}
          </div>

          <div className="table-wrapper">
            <table className="config-table">
              <thead>
                <tr>
                  <th>Tên loại phòng</th>
                  <th>Đơn giá thuê</th>
                  <th>Giới hạn người</th>
                  <th>Mô tả</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {roomTypes.map(type => (
                  <tr key={type._id}>
                    <td>
                      <div className="room-type-name">
                        <span className="type-dot"></span>
                        {type.typeName}
                      </div>
                    </td>
                    <td className="text-price">{formatCurrency(type.currentPrice)}</td>
                    <td>{type.personMax} người</td>
                    <td className="text-muted">{type.description}</td>
                    <td>
                      <div className="action-group">
                        <button className="btn-icon-sm" onClick={() => { setViewingType(type); setShowDetailModal(true); }} title="Chi tiết">
                          <Eye size={14} />
                        </button>
                        <button className="btn-icon-sm" onClick={() => { setViewingType(type); setShowHistoryModal(true); }} title="Lịch sử giá">
                          <History size={14} />
                        </button>
                        {canModify && (
                          <>
                            <button className="btn-icon-sm" onClick={() => handleOpenTypeModal(type)} title="Sửa">
                              <Edit size={14} />
                            </button>
                            <button className="btn-icon-sm delete" onClick={() => handleDeleteClick('ROOM_TYPE', type)} title="Xóa">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {roomTypes.length === 0 && <div className="text-muted" style={{ padding: '24px', textAlign: 'center' }}>Chưa có loại phòng nào được cấu hình.</div>}
          </div>
        </section>
      </div>

      {/* --- MODALS --- */}

      {/* 1. Modal Tầng */}
      <AppModal
        open={showFloorModal}
        onClose={() => setShowFloorModal(false)}
        title={editingFloor ? "Cập nhật Tầng" : "Thêm Tầng Mới"}
        icon={<Layers size={18} />}
        color="blue"
        footer={
          <>
            <button className="ms-btn ms-btn--ghost" onClick={() => setShowFloorModal(false)}>Hủy</button>
            <button className="ms-btn ms-btn--primary" onClick={handleSaveFloor}>
              {editingFloor ? <CheckCircle size={16} /> : <Plus size={16} />}
              {editingFloor ? "Lưu thay đổi" : "Thêm tầng mới"}
            </button>
          </>
        }
      >
        <div className="ms-field">
          <label className="ms-label">Tên tầng <span className="ms-label-required">*</span></label>
          <input
            className="ms-input" placeholder="Ví dụ: Tầng 1, Tầng G..."
            value={floorForm.name} onChange={e => setFloorForm({ ...floorForm, name: e.target.value })}
          />
        </div>
        <div className="ms-field" style={{ marginTop: '16px' }}>
          <label className="ms-label">Mô tả thêm</label>
          <textarea
            className="ms-textarea" placeholder="Ghi chú về tầng này..."
            value={floorForm.description} onChange={e => setFloorForm({ ...floorForm, description: e.target.value })}
          />
        </div>
      </AppModal>

      {/* 2. Modal Loại Phòng */}
      <AppModal
        open={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        title={editingType ? "Sửa Loại Phòng" : "Thêm Loại Phòng mới"}
        icon={<LayoutTemplate size={18} />}
        color="blue"
        size="lg"
        footer={
          <>
            <button className="ms-btn ms-btn--ghost" onClick={() => setShowTypeModal(false)}>Hủy bỏ</button>
            <button className="ms-btn ms-btn--primary" onClick={handleSaveType} disabled={loading}>
              {loading ? "Đang lưu..." : (editingType ? <CheckCircle size={16} /> : <Plus size={16} />)}
              {loading ? "" : (editingType ? " Lưu cập nhật" : " Thêm loại mới")}
            </button>
          </>
        }
      >
        <div className="ms-field">
          <label className="ms-label">Tên loại phòng <span className="ms-label-required">*</span></label>
          <input className="ms-input" value={typeForm.typeName} onChange={e => setTypeForm({ ...typeForm, typeName: e.target.value })} />
        </div>
        <div className="ms-field-row" style={{ marginTop: '16px' }}>
          <div className="ms-field">
            <label className="ms-label">Giá thuê niêm yết (VNĐ)</label>
            <input className="ms-input" type="number" value={typeForm.currentPrice} onChange={e => setTypeForm({ ...typeForm, currentPrice: Number(e.target.value) })} />
          </div>
          <div className="ms-field">
            <label className="ms-label">Người tối đa</label>
            <input className="ms-input" type="number" value={typeForm.personMax} onChange={e => setTypeForm({ ...typeForm, personMax: Number(e.target.value) })} />
          </div>
        </div>
        <div className="ms-field" style={{ marginTop: '16px' }}>
          <label className="ms-label">Mô tả hạng mục</label>
          <textarea className="ms-textarea" value={typeForm.description} onChange={e => setTypeForm({ ...typeForm, description: e.target.value })} />
        </div>

        <div style={{ marginTop: '20px' }}>
          <label className="ms-label" style={{ marginBottom: '10px' }}>Thư viện ảnh minh họa (7 ảnh) <span className="ms-label-required">*</span></label>
          <div className="image-upload-grid">
            {IMAGE_LABELS.map((label, index) => {
              const slot = imageSlots[index];
              return (
                <div key={index} className="image-slot" onClick={() => document.getElementById(`buslot-${index}`)?.click()}>
                  <input type="file" id={`buslot-${index}`} hidden accept="image/*"
                    onChange={e => e.target.files && handleSlotFileChange(index, e.target.files[0])} />
                  {slot ? (
                    <>
                      <img src={slot.url || slot.preview} alt={label} />
                      <button type="button" className="remove-slot-btn" onClick={e => removeSlot(index, e)}>
                        <LucideX size={14} />
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
                      <Upload size={24} />
                      <span style={{ fontSize: '10px', marginTop: '4px' }}>Thêm ảnh</span>
                    </div>
                  )}
                  <div className="image-slot-badge">{label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </AppModal>

      {/* 3. Modal Chi Tiết */}
      <AppModal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Chi tiết hạng mục"
        icon={<Eye size={18} />}
        color="blue"
        size="md"
        footer={<button className="ms-btn ms-btn--primary" onClick={() => setShowDetailModal(false)}>Đóng</button>}
      >
        {viewingType && (
          <div className="detail-body">
            <div className="detail-info-grid">
              <div className="info-item">
                <label>Tên loại phòng</label>
                <div className="info-value">{viewingType.typeName}</div>
              </div>
              <div className="info-item">
                <label>Giá hiện tại</label>
                <div className="info-value text-price">{formatCurrency(viewingType.currentPrice)}</div>
              </div>
              <div className="info-item">
                <label>Số người tối đa</label>
                <div className="info-value">{viewingType.personMax} người</div>
              </div>
              <div className="info-item">
                <label>Ghi chú</label>
                <div className="info-value">{viewingType.description || "Không có"}</div>
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <label className="ms-label">Hình ảnh thực tế</label>
              <div className="detail-image-grid">
                {viewingType.images.map((url, i) => (
                  <div key={i} className="detail-image-item" onClick={() => { setPhotoIndex(i); setIsLightboxOpen(true); }}>
                    <img src={url} alt={`Detail ${i}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </AppModal>

      {/* 4. Modal Lịch sử giá */}
      <AppModal
        open={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Lịch sử thay đổi giá"
        icon={<History size={18} />}
        color="blue"
        footer={<button className="ms-btn ms-btn--primary" onClick={() => setShowHistoryModal(false)}>Hoàn tất</button>}
      >
        {viewingType && (
          <div className="table-wrapper">
            <table className="config-table">
              <thead>
                <tr>
                  <th>Đợt cập nhật</th>
                  <th>Giá áp dụng</th>
                  <th>Từ ngày</th>
                  <th>Đến ngày</th>
                </tr>
              </thead>
              <tbody>
                {viewingType.histories?.length ? viewingType.histories.map((h, i) => (
                  <tr key={h._id}>
                    <td>Lần {i + 1}</td>
                    <td className="text-price">{formatCurrency(h.price)}</td>
                    <td className="text-muted">{formatDate(h.startDate)}</td>
                    <td className="text-muted">{formatDate(h.endDate)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>Chưa có biến động giá.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </AppModal>

      {/* 5. Modal Xóa */}
      <AppModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Xác nhận gỡ bỏ"
        icon={<AlertTriangle size={18} />}
        color="red"
        footer={
          <>
            <button className="ms-btn ms-btn--ghost" onClick={() => setShowDeleteModal(false)}>Hủy bỏ</button>
            <button className="ms-btn ms-btn--danger" onClick={confirmDelete} disabled={loading}>
              {loading ? "Đang xóa..." : "Xác nhận xóa"}
            </button>
          </>
        }
      >
        <div className="bc-delete-notice">
          <div className="bc-delete-notice-icon">
            <AlertTriangle size={24} color="#f59e0b" />
          </div>
          <p className="bc-delete-notice-text">
            Mục này sẽ bị xóa vĩnh viễn khỏi cấu hình tòa nhà. Bạn chắc chắn chứ?
          </p>
        </div>
      </AppModal>

      {/* Lightbox UI */}
      {isLightboxOpen && (
        <div className="lightbox-overlay" onClick={() => setIsLightboxOpen(false)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setIsLightboxOpen(false)}><X size={32} /></button>
            <img src={images[photoIndex]} className="lightbox-image" alt="Zoom" />
            <button className="lightbox-nav-btn prev" onClick={prevImage}><ChevronLeft size={32} /></button>
            <button className="lightbox-nav-btn next" onClick={nextImage}><ChevronRight size={32} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuildingConfig;
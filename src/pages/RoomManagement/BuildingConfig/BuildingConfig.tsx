import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import toastr from 'toastr';
import {
  Plus,
  Edit,
  Trash2,
  Layers,
  LayoutTemplate,
  BedDouble,
  MoreVertical,
  X,
  Building,
  Home,
  Tag,
  Upload,
  Eye,
  ChevronLeft,
  ChevronRight,
  History, 
  CalendarClock, 
} from "lucide-react";
import "./BuildingConfig.css";

const API_BASE_URL = "http://localhost:9999/api";

const IMAGE_LABELS = [
  "Ảnh tổng quan", 
  "Ảnh bếp", 
  "Ảnh giường", 
  "Ảnh bàn học", 
  "Ảnh ban công", 
  "Ảnh nhà vệ sinh", 
  "Ảnh khác"
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

interface Room {
  _id: string;
  name: string;
  floorId: string | { _id: string; name: string };
  roomTypeId: string;
  status: string;
}

const BuildingConfig = () => {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(false);

  const [showFloorModal, setShowFloorModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // --- [MỚI] STATE CHO MODAL XÁC NHẬN XÓA TÙY CHỈNH ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'DELETE_FLOOR' | 'DELETE_TYPE' | null;
    targetId: string | null;
    message: string;
  }>({ isOpen: false, action: null, targetId: null, message: '' });

  const [viewingHistoryType, setViewingHistoryType] = useState<RoomType | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [editingType, setEditingType] = useState<RoomType | null>(null);
  const [viewingType, setViewingType] = useState<RoomType | null>(null);

  const [floorName, setFloorName] = useState("");
  const [floorDesc, setFloorDesc] = useState("");

  const [typeForm, setTypeForm] = useState({
    typeName: "",
    currentPrice: 0,
    personMax: 1,
    description: "",
  });

  const [imageSlots, setImageSlots] = useState<Array<{ file?: File, preview?: string, url?: string } | null>>(Array(7).fill(null));

  useEffect(() => {
    toastr.options = {
      closeButton: true,
      progressBar: true,
      positionClass: "toast-top-right",
      timeOut: 3000,
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [floorRes, typeRes, roomRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/floors`),
        axios.get(`${API_BASE_URL}/roomtypes`),
        axios.get(`${API_BASE_URL}/rooms`),
      ]);

      const rawFloors: Floor[] = floorRes.data.data || floorRes.data || [];
      const rawRooms: Room[] = roomRes.data.data || roomRes.data || [];

      const roomCountsByFloor: { [key: string]: number } = {};
      rawRooms.forEach((room) => {
        const fId =
          typeof room.floorId === "object" && room.floorId !== null
            ? room.floorId._id
            : (room.floorId as string);
        if (fId) roomCountsByFloor[fId] = (roomCountsByFloor[fId] || 0) + 1;
      });

      const floorsWithCount = rawFloors.map((floor) => ({
        ...floor,
        roomCount: roomCountsByFloor[floor._id] || 0,
      }));

      setFloors(floorsWithCount);
      setRoomTypes(typeRes.data.data || typeRes.data || []);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
      toastr.error("Lỗi khi tải dữ liệu từ máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalRooms = floors.reduce((acc, floor) => acc + (floor.roomCount || 0), 0);
  const totalFloors = floors.length;
  const totalTypes = roomTypes.length;

  const currentImages = viewingType?.images || [];

  const openLightbox = (index: number) => {
    setPhotoIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => setIsLightboxOpen(false);

  const nextImage = useCallback(() => {
    if (currentImages.length > 0) {
      setPhotoIndex((prev) => (prev + 1) % currentImages.length);
    }
  }, [currentImages]);

  const prevImage = useCallback(() => {
    if (currentImages.length > 0) {
      setPhotoIndex((prev) => (prev + currentImages.length - 1) % currentImages.length);
    }
  }, [currentImages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, nextImage, prevImage]);

  const handleOpenFloorModal = (floor?: Floor) => {
    if (floor) {
      setEditingFloor(floor);
      setFloorName(floor.name);
      setFloorDesc(floor.description || "");
    } else {
      setEditingFloor(null);
      setFloorName("");
      setFloorDesc("");
    }
    setShowFloorModal(true);
  };

  const handleSaveFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name: floorName, description: floorDesc };
      if (editingFloor) {
        await axios.put(`${API_BASE_URL}/floors/${editingFloor._id}`, payload);
        toastr.success("Cập nhật tầng thành công!");
      } else {
        await axios.post(`${API_BASE_URL}/floors`, payload);
        toastr.success("Thêm tầng mới thành công!");
      }
      setShowFloorModal(false);
      fetchData();
    } catch (error: any) {
      toastr.error(error.response?.data?.message || "Lỗi khi lưu thông tin tầng.");
    }
  };

  // --- [MỚI] MỞ HỘP THOẠI XÁC NHẬN XÓA TẦNG ---
  const handleOpenDeleteFloorConfirm = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      action: 'DELETE_FLOOR',
      targetId: id,
      message: `Bạn có chắc chắn muốn xóa "${name}" không? Thao tác này không thể hoàn tác.`
    });
  };

  // --- [MỚI] MỞ HỘP THOẠI XÁC NHẬN XÓA LOẠI PHÒNG ---
  const handleOpenDeleteTypeConfirm = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      action: 'DELETE_TYPE',
      targetId: id,
      message: `Bạn có chắc chắn muốn xóa loại phòng "${name}" không? Thao tác này không thể hoàn tác.`
    });
  };

  // --- [MỚI] THỰC THI HÀNH ĐỘNG SAU KHI XÁC NHẬN ---
  const executeConfirmAction = async () => {
    if (!confirmModal.targetId) return;

    setLoading(true);
    try {
      if (confirmModal.action === 'DELETE_FLOOR') {
        await axios.delete(`${API_BASE_URL}/floors/${confirmModal.targetId}`);
        toastr.success("Đã xóa tầng thành công!");
      } else if (confirmModal.action === 'DELETE_TYPE') {
        await axios.delete(`${API_BASE_URL}/roomtypes/${confirmModal.targetId}`);
        toastr.success("Đã xóa loại phòng thành công!");
      }
      fetchData();
    } catch (error: any) {
      toastr.error(error.response?.data?.message || "Lỗi khi thực hiện thao tác xóa.");
    } finally {
      setLoading(false);
      setConfirmModal({ isOpen: false, action: null, targetId: null, message: '' });
    }
  };

  const handleViewDetail = (type: RoomType) => {
    setViewingType(type);
    setShowDetailModal(true);
  };

  const handleViewHistory = (type: RoomType) => {
    setViewingHistoryType(type);
    setShowHistoryModal(true);
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
        type.images.forEach((imgUrl, idx) => {
          if (idx < 7) slots[idx] = { url: imgUrl };
        });
      }
      setImageSlots(slots);
    } else {
      setEditingType(null);
      setTypeForm({
        typeName: "",
        currentPrice: 0,
        personMax: 1,
        description: "",
      });
      setImageSlots(Array(7).fill(null));
    }
    setShowTypeModal(true);
  };

  const handleSlotFileChange = (index: number, file: File) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setImageSlots((prev) => {
      const newSlots = [...prev];
      if (newSlots[index]?.preview) {
        URL.revokeObjectURL(newSlots[index]!.preview!);
      }
      newSlots[index] = { file, preview };
      return newSlots;
    });
  };

  const handleRemoveSlot = (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setImageSlots((prev) => {
      const newSlots = [...prev];
      if (newSlots[index]?.preview) {
        URL.revokeObjectURL(newSlots[index]!.preview!);
      }
      newSlots[index] = null;
      return newSlots;
    });
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();

    const filledSlotsCount = imageSlots.filter(slot => slot !== null).length;
    if (filledSlotsCount !== 7) {
      toastr.warning(`Vui lòng cung cấp đủ 7 ảnh cho loại phòng vào các ô tương ứng. (Hiện đang có ${filledSlotsCount}/7 ảnh)`);
      return; 
    }

    try {
      const formData = new FormData();
      formData.append("typeName", typeForm.typeName);
      formData.append("currentPrice", typeForm.currentPrice.toString());
      formData.append("personMax", typeForm.personMax.toString());
      formData.append("description", typeForm.description);
      
      imageSlots.forEach((slot) => {
        if (slot?.url) {
          formData.append("oldImages", slot.url); 
        }
        if (slot?.file) {
          formData.append("images", slot.file); 
        }
      });

      const url = editingType
        ? `${API_BASE_URL}/roomtypes/${editingType._id}`
        : `${API_BASE_URL}/roomtypes`;
      
      const method = editingType ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error?.message || "Lỗi lưu loại phòng.");
      }

      toastr.success(editingType ? "Cập nhật loại phòng thành công!" : "Thêm mới loại phòng thành công!");
      setShowTypeModal(false);
      fetchData();
      
    } catch (error: any) {
      console.error("Lỗi:", error);
      toastr.error(error.message || "Lỗi hệ thống khi lưu loại phòng.");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Hiện tại";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="config-container">
      <div className="page-header">
        <div>
          <h2 className="page-title">Cấu hình tòa nhà</h2>
          <p className="page-subtitle">Quản lý danh sách tầng và các hạng mục loại phòng</p>
        </div>
        <div className="stats-summary">
          <div className="stat-item">
            <Building size={16} className="stat-icon icon-primary" />
            <div className="stat-text">
              <span className="stat-value">{totalFloors}</span>
              <span className="stat-label">Tầng</span>
            </div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <Home size={16} className="stat-icon icon-accent" />
            <div className="stat-text">
              <span className="stat-value">{totalRooms}</span>
              <span className="stat-label">Phòng</span>
            </div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <Tag size={16} className="stat-icon icon-success" />
            <div className="stat-text">
              <span className="stat-value">{totalTypes}</span>
              <span className="stat-label">Loại phòng</span>
            </div>
          </div>
        </div>
      </div>

      <div className="config-content">
        <section className="section-block">
          <div className="section-header">
            <div className="section-title-wrapper">
              <Layers className="section-icon" size={20} />
              <h3>Danh sách Tầng</h3>
            </div>
            <button className="btn-primary" onClick={() => handleOpenFloorModal()}>
              <Plus size={16} /> Thêm tầng
            </button>
          </div>
          <div className="floor-grid">
            {floors.map((floor) => (
              <div key={floor._id} className="floor-card">
                <div className="floor-card-header">
                  <span className="floor-icon-bg">
                    <Layers size={24} />
                  </span>
                  <button className="btn-icon">
                    <MoreVertical size={16} />
                  </button>
                </div>
                <div className="floor-info">
                  <h4>{floor.name}</h4>
                  {floor.description && (
                    <p className="floor-desc" title={floor.description}>
                      {floor.description}
                    </p>
                  )}
                  <p className="floor-meta">
                    <BedDouble size={14} style={{ marginRight: 4 }} />
                    {floor.roomCount || 0} phòng
                  </p>
                </div>
                <div className="floor-actions">
                  <button className="btn-action edit" onClick={() => handleOpenFloorModal(floor)}>Sửa</button>
                  {/* Dùng Modal Custom thay cho window.confirm */}
                  <button className="btn-action delete" onClick={() => handleOpenDeleteFloorConfirm(floor._id, floor.name)}>Xóa</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section-block mt-8">
          <div className="section-header">
            <div className="section-title-wrapper">
              <LayoutTemplate className="section-icon" size={20} />
              <h3>Danh sách Loại phòng</h3>
            </div>
            <button className="btn-primary" onClick={() => handleOpenTypeModal()}>
              <Plus size={16} /> Thêm loại phòng
            </button>
          </div>

          <div className="table-wrapper">
            <table className="config-table">
              <thead>
                <tr>
                  <th>Tên loại phòng</th>
                  <th>Đơn giá</th>
                  <th>Số người tối đa</th>
                  <th>Mô tả</th>
                  <th style={{ width: "160px", textAlign: "center" }}>Thao tác</th> 
                </tr>
              </thead>
              <tbody>
                {roomTypes.map((type) => (
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
                        <button className="btn-icon-sm view" onClick={() => handleViewDetail(type)} title="Xem chi tiết">
                          <Eye size={16} />
                        </button>
                        <button className="btn-icon-sm history" onClick={() => handleViewHistory(type)} title="Lịch sử giá">
                          <History size={16} />
                        </button>
                        <button className="btn-icon-sm edit" onClick={() => handleOpenTypeModal(type)} title="Sửa">
                          <Edit size={16} />
                        </button>
                        {/* Dùng Modal Custom thay cho window.confirm */}
                        <button className="btn-icon-sm delete" onClick={() => handleOpenDeleteTypeConfirm(type._id, type.typeName)} title="Xóa">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* --- CÁC MODAL HIỆN TẠI GIỮ NGUYÊN --- */}
      {showFloorModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingFloor ? "Sửa Tầng" : "Thêm Tầng Mới"}</h3>
              <button onClick={() => setShowFloorModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveFloor}>
              <div className="form-group">
                <label>Tên tầng</label>
                <input
                  type="text"
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                  required
                  placeholder="Ví dụ: Tầng 1"
                />
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  rows={2}
                  value={floorDesc}
                  onChange={(e) => setFloorDesc(e.target.value)}
                  placeholder="Ghi chú thêm..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowFloorModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTypeModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h3>{editingType ? "Sửa Loại Phòng" : "Thêm Loại Phòng"}</h3>
              <button onClick={() => setShowTypeModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveType}>
              <div className="form-group">
                <label>Tên loại phòng</label>
                <input
                  type="text"
                  value={typeForm.typeName}
                  onChange={(e) => setTypeForm({ ...typeForm, typeName: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Giá phòng</label>
                  <input
                    type="number"
                    value={typeForm.currentPrice}
                    onChange={(e) => setTypeForm({ ...typeForm, currentPrice: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Số người tối đa</label>
                  <input
                    type="number"
                    value={typeForm.personMax}
                    onChange={(e) => setTypeForm({ ...typeForm, personMax: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  rows={2}
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Thư viện ảnh minh họa ({imageSlots.filter(s => s !== null).length}/7)
                  <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: 'normal' }}>
                    *Bắt buộc upload đủ 7 ô ảnh
                  </span>
                </label>
                
                <div style={{ fontSize: '13px', color: '#0369a1', background: '#e0f2fe', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #bae6fd' }}>
                  <strong>*Lưu ý quan trọng:</strong> Vui lòng upload 7 ảnh theo đúng thứ tự: <br/>
                  (1) Ảnh tổng quan, (2) Ảnh bếp, (3) Ảnh giường, (4) Ảnh bàn học, (5) Ảnh ban công (view), (6) Ảnh nhà vệ sinh, (7) Ảnh tiện ích khác.
                </div>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                  gap: '16px', 
                  marginTop: '12px' 
                }}>
                  {IMAGE_LABELS.map((label, index) => {
                    const slot = imageSlots[index];
                    return (
                      <div 
                        key={index} 
                        style={{ 
                          border: slot ? 'none' : '2px dashed #cbd5e1', 
                          borderRadius: '8px', 
                          height: '140px', 
                          position: 'relative', 
                          cursor: 'pointer', 
                          overflow: 'hidden', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          backgroundColor: slot ? '#fff' : '#f8fafc',
                          boxShadow: slot ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
                          transition: 'all 0.2s'
                        }} 
                        onClick={() => document.getElementById(`slot-${index}`)?.click()}
                      >
                        <input 
                          type="file" 
                          id={`slot-${index}`} 
                          style={{ display: 'none' }} 
                          accept="image/*" 
                          onChange={(e) => { 
                            if (e.target.files && e.target.files[0]) {
                              handleSlotFileChange(index, e.target.files[0]); 
                            }
                            e.target.value = ''; 
                          }} 
                        />
                        {slot ? (
                          <>
                            <img 
                              src={slot.url || slot.preview} 
                              alt={label}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                            <button 
                              type="button" 
                              onClick={(e) => handleRemoveSlot(index, e)} 
                              style={{ 
                                position: 'absolute', top: 6, right: 6, 
                                backgroundColor: '#ef4444', color: '#ffffff', 
                                border: 'none', borderRadius: '50%', width: 24, height: 24, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', zIndex: 10, padding: 0 
                              }}
                            > 
                              <X size={14} color="#ffffff" strokeWidth={3} /> 
                            </button>
                            <div style={{ 
                              position: 'absolute', bottom: 0, left: 0, right: 0, 
                              background: 'rgba(15, 23, 42, 0.75)', color: 'white', 
                              fontSize: '12px', fontWeight: 500, textAlign: 'center', padding: '6px' 
                            }}>
                              {label}
                            </div>
                          </>
                        ) : (
                          <>
                            <Upload size={28} color="#94a3b8" />
                            <span style={{ 
                              fontSize: '12px', color: '#475569', marginTop: '12px', 
                              textAlign: 'center', padding: '0 8px', fontWeight: 500 
                            }}>
                              + {label}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowTypeModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && viewingType && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h3>Chi tiết Loại phòng: {viewingType.typeName}</h3>
              <button onClick={() => setShowDetailModal(false)}><X size={20} /></button>
            </div>
            
            <div className="detail-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                <div className="info-group">
                  <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Tên loại phòng</label>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{viewingType.typeName}</div>
                </div>
                <div className="info-group">
                  <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Giá hiện tại</label>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#2563eb' }}>{formatCurrency(viewingType.currentPrice)}</div>
                </div>
                <div className="info-group">
                  <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Số người tối đa</label>
                  <div style={{ fontSize: '16px', fontWeight: 500, color: '#0f172a' }}>{viewingType.personMax} người</div>
                </div>
                <div className="info-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Mô tả</label>
                  <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.5' }}>{viewingType.description || "Không có mô tả"}</div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', display: 'block', color: '#0f172a' }}>
                  Hình ảnh minh họa ({viewingType.images?.length || 0}/7)
                </label>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                  gap: '16px' 
                }}>
                  {IMAGE_LABELS.map((label, idx) => {
                    const img = viewingType.images?.[idx];
                    return (
                      <div 
                        key={idx} 
                        onClick={() => img && openLightbox(idx)} 
                        style={{ 
                          border: img ? 'none' : '1px dashed #cbd5e1', 
                          borderRadius: '8px', 
                          height: '140px', 
                          position: 'relative', 
                          cursor: img ? 'pointer' : 'default', 
                          overflow: 'hidden', 
                          backgroundColor: '#f8fafc',
                          boxShadow: img ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                        }}
                      >
                        {img ? (
                          <>
                            <img src={img} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{
                              position: 'absolute', bottom: 0, left: 0, right: 0,
                              background: 'rgba(15, 23, 42, 0.75)', color: 'white',
                              fontSize: '12px', fontWeight: 500, textAlign: 'center', padding: '6px'
                            }}>
                              {label}
                            </div>
                          </>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                            <span style={{ fontSize: '12px' }}>Không có ảnh</span>
                            <span style={{ fontSize: '11px', marginTop: '4px' }}>({label})</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowDetailModal(false)}>Đóng</button>
              <button type="button" className="btn-primary" onClick={() => { setShowDetailModal(false); handleOpenTypeModal(viewingType); }}>
                <Edit size={16} /> Chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && viewingHistoryType && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CalendarClock size={24} className="text-primary" />
                <h3>Lịch sử thay đổi giá: {viewingHistoryType.typeName}</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)}><X size={20} /></button>
            </div>

            <div className="detail-body">
              {viewingHistoryType.histories && viewingHistoryType.histories.length > 0 ? (
                <div className="history-list">
                  <div className="history-header-row">
                    <span>Thời điểm bắt đầu</span>
                    <span>Thời điểm kết thúc</span>
                    <span style={{ textAlign: "right" }}>Giá áp dụng</span>
                  </div>
                  {[...viewingHistoryType.histories].reverse().map((history, idx) => (
                      <div key={history._id} className={`history-item ${!history.endDate ? "current" : ""}`}>
                        <div className="history-date">{formatDate(history.startDate)}</div>
                        <div className="history-date">
                          {history.endDate ? formatDate(history.endDate) : <span className="tag-active">Đang áp dụng</span>}
                        </div>
                        <div className="history-price">{formatCurrency(history.price)}</div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-empty">Chưa có dữ liệu lịch sử giá.</div>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowHistoryModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {isLightboxOpen && (
        <div className="lightbox-overlay">
          <button className="lightbox-close-btn" onClick={closeLightbox}><X size={32} /></button>
          <button className="lightbox-nav-btn prev" onClick={prevImage}><ChevronLeft size={48} /></button>
          <div className="lightbox-content">
            <img src={currentImages[photoIndex]} alt="Full view" className="lightbox-image" />
            <div className="lightbox-counter">
              {IMAGE_LABELS[photoIndex] || `Ảnh ${photoIndex + 1}`} ({photoIndex + 1} / {currentImages.length})
            </div>
          </div>
          <button className="lightbox-nav-btn next" onClick={nextImage}><ChevronRight size={48} /></button>
        </div>
      )}

      {/* --- [MỚI] MODAL HỘP THOẠI XÁC NHẬN XÓA (THAY CHO WINDOW.CONFIRM) --- */}
      {confirmModal.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ width: '400px', textAlign: 'center', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ background: '#fee2e2', padding: '12px', borderRadius: '50%' }}>
                <Trash2 size={32} color="#ef4444" />
              </div>
            </div>
            <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '18px' }}>Xác nhận xóa</h3>
            <p style={{ color: '#475569', margin: '16px 0 24px 0', lineHeight: '1.5' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setConfirmModal({ isOpen: false, action: null, targetId: null, message: '' })}
              >
                Hủy bỏ
              </button>
              <button 
                style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                onClick={executeConfirmAction}
                disabled={loading}
              >
                {loading ? 'Đang xử lý...' : 'Xóa dữ liệu'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BuildingConfig;
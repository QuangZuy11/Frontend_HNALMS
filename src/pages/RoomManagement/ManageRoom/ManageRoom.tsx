import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Plus, Edit, Trash2, Eye,
  ChevronDown, ChevronRight,
  CheckCircle, AlertCircle, Wrench, X,
  Building, Home, Tag,
  Power,
  Download, FileSpreadsheet
} from 'lucide-react';
import './ManageRoom.css';

import OwnerSidebar from '../../../components/layout/Sidebar/OwnerSidebar/OwnerSidebar';
import HeaderDashboard from '../../../components/layout/Header/HeaderDashboard/HeaderDashboard';

const API_BASE_URL = 'http://localhost:9999/api';

// --- INTERFACES ---
interface Floor {
  _id: string;
  name: string;
}

interface RoomType {
  _id: string;
  typeName: string;
  currentPrice: number;
  personMax: number;
  images: string[];
}

interface Room {
  _id: string;
  roomCode: string;
  name: string;
  floorId: string | Floor;
  roomTypeId: string | RoomType;
  status: 'Available' | 'Occupied' | 'Maintenance';
  description?: string;
  isActive: boolean;
}

const ManageRoom = () => {
  // --- States ---
  const [rooms, setRooms] = useState<Room[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(false);

  // [MỚI] Ref cho input file ẩn
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State đóng/mở tầng
  const [expandedFloors, setExpandedFloors] = useState<string[]>([]);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [viewingRoom, setViewingRoom] = useState<Room | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
    roomCode: '',
    name: '', floorId: '', roomTypeId: '', status: 'Available', description: '',
    isActive: true
  });

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const [roomsRes, floorsRes, typesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/room`),
        axios.get(`${API_BASE_URL}/floors`),
        axios.get(`${API_BASE_URL}/roomtypes`)
      ]);

      setRooms(roomsRes.data.data || roomsRes.data || []);
      const floorsData = floorsRes.data.data || floorsRes.data || [];
      setFloors(floorsData);
      setRoomTypes(typesRes.data.data || typesRes.data || []);

      setExpandedFloors(floorsData.map((f: Floor) => f._id));

    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- TÍNH TOÁN THỐNG KÊ ---
  const totalFloors = floors.length;
  const totalRooms = rooms.length;
  const totalTypes = roomTypes.length;

  // --- HANDLERS ---
  const toggleFloor = (floorId: string) => {
    setExpandedFloors(prev =>
      prev.includes(floorId) ? prev.filter(id => id !== floorId) : [...prev, floorId]
    );
  };

  const getRoomTypeDetail = (idOrObj: string | RoomType | any) => {
    if (typeof idOrObj === 'object' && idOrObj !== null) {
      if (idOrObj.typeName) return idOrObj as RoomType;
      return roomTypes.find(t => t._id === idOrObj._id);
    }
    return roomTypes.find(t => t._id === idOrObj);
  };

  const getFloorName = (idOrObj: string | Floor) => {
    if (typeof idOrObj === 'object') return idOrObj.name;
    return floors.find(f => f._id === idOrObj)?.name || "---";
  };

  const formatCurrency = (amount: any) => {
    const value = Number(amount);
    if (isNaN(value)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'Available': return <span className="status-badge available"><CheckCircle size={12} /> Trống</span>;
      case 'Occupied': return <span className="status-badge occupied"><AlertCircle size={12} /> Đang thuê</span>;
      case 'Maintenance': return <span className="status-badge maintenance"><Wrench size={12} /> Bảo trì</span>;
      default: return <span>{status}</span>;
    }
  };

  // --- [MỚI] HANDLERS EXCEL ---

  // 1. Tải mẫu Excel
  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/excel/template`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Mau_Nhap_Phong.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      alert("Lỗi tải file mẫu.");
    }
  };

  // 2. Kích hoạt input file
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 3. Upload file Excel
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset value để cho phép chọn lại file cũ
    e.target.value = '';

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/excel/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(res.data.message);
      fetchData(); // Load lại dữ liệu sau khi nhập
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Lỗi khi nhập file.";
      const detailErrors = error.response?.data?.errors;

      if (detailErrors && detailErrors.length > 0) {
        alert(`${msg}\n\nChi tiết lỗi:\n- ${detailErrors.join('\n- ')}`);
      } else {
        alert(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- CRUD HANDLERS ---
  const handleOpenAdd = () => {
    if (floors.length === 0 || roomTypes.length === 0) {
      alert("Vui lòng tạo Tầng và Loại phòng trước!");
      return;
    }
    setIsEditing(false); setCurrentRoom(null);
    setFormData({
      roomCode: '', name: '',
      floorId: floors[0]?._id || '',
      roomTypeId: roomTypes[0]?._id || '',
      status: 'Available', description: '',
      isActive: true
    });
    setShowModal(true);
  };

  const handleOpenEdit = (room: Room) => {
    setIsEditing(true); setCurrentRoom(room);
    setFormData({
      roomCode: room.roomCode || '',
      name: room.name,
      floorId: typeof room.floorId === 'object' ? room.floorId._id : room.floorId,
      roomTypeId: typeof room.roomTypeId === 'object' ? room.roomTypeId._id : room.roomTypeId,
      status: room.status, description: room.description || '',
      isActive: room.isActive
    });
    setShowModal(true);
  };

  const handleViewDetail = (room: Room) => {
    setViewingRoom(room);
    setShowDetailModal(true);
  };

  const handleToggleActive = async (room: Room) => {
    const action = room.isActive ? "vô hiệu hóa" : "kích hoạt";
    if (!window.confirm(`Bạn có chắc muốn ${action} phòng ${room.name} không?`)) return;

    try {
      await axios.put(`${API_BASE_URL}/room/${room._id}`, { isActive: !room.isActive });
      fetchData();
    } catch (error: any) {
      alert("Lỗi cập nhật trạng thái: " + error.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && currentRoom) {
        await axios.put(`${API_BASE_URL}/room/${currentRoom._id}`, formData);
      } else {
        await axios.post(`${API_BASE_URL}/room`, formData);
      }
      setShowModal(false); fetchData();
    } catch (error: any) { alert("Lỗi lưu dữ liệu: " + error.message); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Xóa phòng này?")) {
      try { await axios.delete(`${API_BASE_URL}/room/${id}`); fetchData(); }
      catch (e) { alert("Lỗi xóa phòng"); }
    }
  };

  return (
    <div className="manager-dashboard-wrapper">
      <OwnerSidebar />

      <div className="manager-dashboard-body">
        <HeaderDashboard />
        <main className="manager-dashboard-main">
          <div className="room-container">

            <div className="page-header">
              <div>
                <h2 className="page-title">Quản lý danh sách phòng</h2>
                <p className="page-subtitle">Nhóm theo tầng - Xem dạng bảng</p>
              </div>

              <div className="stats-summary">
                <div className="stat-item">
                  <Building size={16} className="stat-icon icon-primary" />
                  <div className="stat-text"><span className="stat-value">{totalFloors}</span><span className="stat-label">Tầng</span></div>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <Home size={16} className="stat-icon icon-accent" />
                  <div className="stat-text"><span className="stat-value">{totalRooms}</span><span className="stat-label">Phòng</span></div>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <Tag size={16} className="stat-icon icon-success" />
                  <div className="stat-text"><span className="stat-value">{totalTypes}</span><span className="stat-label">Loại phòng</span></div>
                </div>
              </div>
            </div>

            {/* THANH CÔNG CỤ (TOOLBAR) */}
            <div className="toolbar-actions">

              {/* [MỚI] Button Tải Mẫu */}
              <button className="btn-secondary" onClick={handleDownloadTemplate}>
                <Download size={18} /> Tải mẫu Excel
              </button>

              {/* [MỚI] Button Nhập File */}
              <button className="btn-success" onClick={triggerFileInput}>
                <FileSpreadsheet size={18} /> Nhập Excel
              </button>
              {/* Input ẩn */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
              />

              {/* Button Thêm thủ công */}
              <button className="btn-primary" onClick={handleOpenAdd}>
                <Plus size={18} /> Thêm phòng mới
              </button>
            </div>

            <div className="floor-list-container">
              {floors.length === 0 && !loading && <div className="empty-floor">Chưa có dữ liệu tầng.</div>}

              {floors.map(floor => {
                const floorRooms = rooms.filter(r => {
                  const fId = typeof r.floorId === 'object' ? r.floorId._id : r.floorId;
                  return fId === floor._id;
                });

                const isExpanded = expandedFloors.includes(floor._id);

                return (
                  <div key={floor._id} className="floor-group">
                    <div className={`floor-header ${isExpanded ? 'active' : ''}`} onClick={() => toggleFloor(floor._id)}>
                      <div className="floor-title">
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        <span>{floor.name}</span>
                        <span className="room-count-badge">{floorRooms.length} phòng</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="floor-body">
                        {floorRooms.length > 0 ? (
                          <table className="room-table">
                            <thead>
                              <tr>
                                <th style={{ width: '100px' }}>Mã phòng</th>
                                <th style={{ width: '150px' }}>Tên phòng</th>
                                <th style={{ width: '150px' }}>Loại phòng</th>
                                <th style={{ width: '120px' }}>Giá niêm yết</th>
                                <th style={{ width: '120px' }}>Trạng thái</th>
                                <th>Mô tả</th>
                                <th style={{ width: '140px', textAlign: 'center' }}>Thao tác</th>
                              </tr>
                            </thead>
                            <tbody>
                              {floorRooms.map(room => {
                                const typeDetail = getRoomTypeDetail(room.roomTypeId);
                                const rowOpacity = room.isActive ? 1 : 0.5;

                                return (
                                  <tr key={room._id} style={{ opacity: rowOpacity }}>
                                    <td style={{ fontFamily: 'monospace', color: '#64748b', fontWeight: 600 }}>
                                      {room.roomCode || '---'}
                                    </td>

                                    <td className="font-bold">{room.name}</td>

                                    <td>{typeDetail ? typeDetail.typeName : <span style={{ color: 'red' }}>Lỗi</span>}</td>

                                    <td className="text-price">
                                      {typeDetail ? formatCurrency(typeDetail.currentPrice) : '---'}
                                    </td>

                                    <td>{renderStatus(room.status)}</td>

                                    <td className="text-desc">
                                      {room.description || <span className="text-muted-italic">Không có mô tả</span>}
                                    </td>

                                    <td>
                                      <div className="action-group">
                                        <button
                                          className={`btn-icon-sm power ${room.isActive ? 'active' : 'inactive'}`}
                                          onClick={() => handleToggleActive(room)}
                                          title={room.isActive ? "Vô hiệu hóa" : "Kích hoạt lại"}
                                        >
                                          <Power size={16} />
                                        </button>

                                        <button className="btn-icon-sm view" onClick={() => handleViewDetail(room)} title="Chi tiết">
                                          <Eye size={16} />
                                        </button>
                                        <button className="btn-icon-sm edit" onClick={() => handleOpenEdit(room)} title="Sửa">
                                          <Edit size={16} />
                                        </button>
                                        <button className="btn-icon-sm delete" onClick={() => handleDelete(room._id)} title="Xóa">
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div className="empty-floor">Chưa có phòng nào ở tầng này.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* --- MODAL ADD/EDIT --- */}
            {showModal && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <div className="modal-header">
                    <h3>{isEditing ? 'Sửa Phòng' : 'Thêm Phòng Mới'}</h3>
                    <button onClick={() => setShowModal(false)}><X size={20} /></button>
                  </div>
                  <form onSubmit={handleSave}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Mã phòng <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" value={formData.roomCode} onChange={e => setFormData({ ...formData, roomCode: e.target.value })} required placeholder="VD: R101" />
                      </div>
                      <div className="form-group">
                        <label>Tên hiển thị <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="VD: Phòng 101" />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Tầng</label>
                        <select value={formData.floorId} onChange={e => setFormData({ ...formData, floorId: e.target.value })}>
                          {floors.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Loại phòng</label>
                        <select value={formData.roomTypeId} onChange={e => setFormData({ ...formData, roomTypeId: e.target.value })}>
                          {roomTypes.map(t => <option key={t._id} value={t._id}>{t.typeName}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Trạng thái</label>
                      <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                        <option value="Available">Trống</option>
                        <option value="Occupied">Đang thuê</option>
                        <option value="Maintenance">Bảo trì</option>
                      </select>
                    </div>

                    {isEditing && (
                      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <input
                          type="checkbox"
                          id="chkActive"
                          checked={formData.isActive}
                          onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                          style={{ width: 'auto', margin: 0 }}
                        />
                        <label htmlFor="chkActive" style={{ margin: 0, cursor: 'pointer' }}>Đang hoạt động (Active)</label>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Mô tả</label>
                      <textarea rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                    <div className="modal-actions">
                      <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                      <button type="submit" className="btn-primary">Lưu</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* --- MODAL XEM CHI TIẾT --- */}
            {showDetailModal && viewingRoom && (
              <div className="modal-overlay" style={{ zIndex: 1100 }}>
                <div className="modal-content detail-view">
                  <div className="modal-header">
                    <h3>Chi tiết Phòng: {viewingRoom.name}</h3>
                    <button onClick={() => setShowDetailModal(false)}><X size={20} /></button>
                  </div>
                  <div className="detail-body">
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Mã phòng:</label><span>{viewingRoom.roomCode || '---'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Trạng thái:</label><span>{renderStatus(viewingRoom.status)}</span>
                      </div>
                      <div className="detail-item">
                        <label>Kích hoạt:</label>
                        <span style={{ color: viewingRoom.isActive ? 'green' : 'red', fontWeight: 600 }}>
                          {viewingRoom.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                        </span>
                      </div>
                      <div className="detail-item">
                        <label>Thuộc Tầng:</label><span>{getFloorName(viewingRoom.floorId)}</span>
                      </div>
                      <div className="detail-item">
                        <label>Loại phòng:</label><span>{getRoomTypeDetail(viewingRoom.roomTypeId)?.typeName || '---'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Giá niêm yết:</label>
                        <span className="text-price">
                          {getRoomTypeDetail(viewingRoom.roomTypeId) ? formatCurrency(getRoomTypeDetail(viewingRoom.roomTypeId)!.currentPrice) : '---'}
                        </span>
                      </div>
                      <div className="detail-item full">
                        <label>Mô tả:</label><p>{viewingRoom.description || "Không có mô tả."}</p>
                      </div>
                    </div>
                    <div className="detail-images-area">
                      <h4>Hình ảnh tham khảo (Theo loại phòng)</h4>
                      {(() => {
                        const typeDetail = getRoomTypeDetail(viewingRoom.roomTypeId);
                        const images = typeDetail?.images || [];
                        if (images.length === 0) return <p className="text-muted-italic">Chưa có hình ảnh.</p>;
                        return (
                          <div className="detail-image-list">
                            {images.map((img, idx) => (
                              <div key={idx} className="detail-img-item"><img src={img} alt="img" /></div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>Đóng</button>
                    <button className="btn-primary" onClick={() => { setShowDetailModal(false); handleOpenEdit(viewingRoom); }}>
                      <Edit size={16} /> Chỉnh sửa
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

export default ManageRoom;
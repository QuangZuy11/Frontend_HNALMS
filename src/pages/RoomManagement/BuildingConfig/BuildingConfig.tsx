import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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
  History, // [NEW] Icon lịch sử
  CalendarClock // [NEW] Icon cho modal lịch sử
} from 'lucide-react';
import './BuildingConfig.css';

const API_BASE_URL = 'http://localhost:9999/api';

// --- INTERFACES ---
interface Floor {
  _id: string;
  name: string;
  description?: string;
  roomCount?: number;
}

// [NEW] Interface cho lịch sử giá
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
  histories?: PriceHistory[]; // [NEW] Thêm trường histories
}

interface Room {
  _id: string;
  name: string;
  floorId: string | { _id: string, name: string };
  roomTypeId: string;
  status: string;
}

const BuildingConfig = () => {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(false);

  // --- MODAL STATES ---
  const [showFloorModal, setShowFloorModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // [NEW] History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [viewingHistoryType, setViewingHistoryType] = useState<RoomType | null>(null);

  // --- LIGHTBOX STATES ---
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [editingType, setEditingType] = useState<RoomType | null>(null);
  const [viewingType, setViewingType] = useState<RoomType | null>(null);

  // --- FORM DATA ---
  const [floorName, setFloorName] = useState('');
  const [floorDesc, setFloorDesc] = useState('');

  const [typeForm, setTypeForm] = useState({
    typeName: '',
    currentPrice: 0,
    personMax: 1,
    description: ''
  });

  // Upload images
  const [oldImages, setOldImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const [floorRes, typeRes, roomRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/floors`),
        axios.get(`${API_BASE_URL}/roomtypes`),
        axios.get(`${API_BASE_URL}/room`)
      ]);

      const rawFloors: Floor[] = floorRes.data.data || floorRes.data || [];
      const rawRooms: Room[] = roomRes.data.data || roomRes.data || [];

      const roomCountsByFloor: { [key: string]: number } = {};
      rawRooms.forEach(room => {
        const fId = typeof room.floorId === 'object' && room.floorId !== null
          ? room.floorId._id
          : room.floorId as string;
        if (fId) roomCountsByFloor[fId] = (roomCountsByFloor[fId] || 0) + 1;
      });

      const floorsWithCount = rawFloors.map(floor => ({
        ...floor,
        roomCount: roomCountsByFloor[floor._id] || 0
      }));

      setFloors(floorsWithCount);
      setRoomTypes(typeRes.data.data || typeRes.data || []);

    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
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

  // --- LIGHTBOX LOGIC ---
  const currentImages = viewingType?.images || [];

  const openLightbox = (index: number) => {
    setPhotoIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

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
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, nextImage, prevImage]);


  // --- HANDLERS (FLOOR) ---
  const handleOpenFloorModal = (floor?: Floor) => {
    if (floor) {
      setEditingFloor(floor);
      setFloorName(floor.name);
      setFloorDesc(floor.description || '');
    } else {
      setEditingFloor(null);
      setFloorName('');
      setFloorDesc('');
    }
    setShowFloorModal(true);
  };

  const handleSaveFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name: floorName, description: floorDesc };
      if (editingFloor) {
        await axios.put(`${API_BASE_URL}/floors/${editingFloor._id}`, payload);
      } else {
        await axios.post(`${API_BASE_URL}/floors`, payload);
      }
      setShowFloorModal(false);
      fetchData();
    } catch (error) {
      alert("Lỗi cập nhật tầng.");
    }
  };

  const handleDeleteFloor = async (id: string) => {
    if (!window.confirm("Xóa tầng này?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/floors/${id}`);
      fetchData();
    } catch (error) {
      alert("Lỗi xóa tầng.");
    }
  };

  // --- HANDLERS (ROOM TYPE) ---

  const handleViewDetail = (type: RoomType) => {
    setViewingType(type);
    setShowDetailModal(true);
  };

  // [NEW] Handler mở modal lịch sử
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
        description: type.description
      });
      setOldImages(type.images || []);
      setNewFiles([]);
      setPreviewUrls([]);
    } else {
      setEditingType(null);
      setTypeForm({ typeName: '', currentPrice: 0, personMax: 1, description: '' });
      setOldImages([]);
      setNewFiles([]);
      setPreviewUrls([]);
    }
    setShowTypeModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (oldImages.length + newFiles.length + filesArray.length > 10) {
        alert("Tối đa 10 ảnh!");
        return;
      }
      setNewFiles(prev => [...prev, ...filesArray]);
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveOldImage = (index: number) => {
    setOldImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewImage = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('typeName', typeForm.typeName);
      formData.append('currentPrice', typeForm.currentPrice.toString());
      formData.append('personMax', typeForm.personMax.toString());
      formData.append('description', typeForm.description);
      oldImages.forEach(url => formData.append('images', url));
      newFiles.forEach(file => formData.append('images', file));

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editingType) {
        await axios.put(`${API_BASE_URL}/roomtypes/${editingType._id}`, formData, config);
      } else {
        await axios.post(`${API_BASE_URL}/roomtypes`, formData, config);
      }
      setShowTypeModal(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert("Lỗi lưu loại phòng.");
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!window.confirm("Xóa loại phòng này?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/roomtypes/${id}`);
      fetchData();
    } catch (error) {
      alert("Lỗi xóa loại phòng.");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Helper format ngày tháng
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Hiện tại";
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="config-container">
      {/* ... (Header & Stats giữ nguyên) ... */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Cấu hình tòa nhà</h2>
          <p className="page-subtitle">Quản lý danh sách tầng và các hạng mục loại phòng</p>
        </div>
        <div className="stats-summary">
           {/* ... stats ... */}
           <div className="stat-item"><Building size={16} className="stat-icon icon-primary" /><div className="stat-text"><span className="stat-value">{totalFloors}</span><span className="stat-label">Tầng</span></div></div>
           <div className="stat-divider"></div>
           <div className="stat-item"><Home size={16} className="stat-icon icon-accent" /><div className="stat-text"><span className="stat-value">{totalRooms}</span><span className="stat-label">Phòng</span></div></div>
           <div className="stat-divider"></div>
           <div className="stat-item"><Tag size={16} className="stat-icon icon-success" /><div className="stat-text"><span className="stat-value">{totalTypes}</span><span className="stat-label">Loại phòng</span></div></div>
        </div>
      </div>

      <div className="config-content">
        {/* ... (Section Tầng giữ nguyên) ... */}
        <section className="section-block">
           <div className="section-header">
             <div className="section-title-wrapper"><Layers className="section-icon" size={20} /><h3>Danh sách Tầng</h3></div>
             <button className="btn-primary" onClick={() => handleOpenFloorModal()}><Plus size={16} /> Thêm tầng</button>
           </div>
           <div className="floor-grid">
             {floors.map((floor) => (
               <div key={floor._id} className="floor-card">
                 <div className="floor-card-header"><span className="floor-icon-bg"><Layers size={24} /></span><button className="btn-icon"><MoreVertical size={16} /></button></div>
                 <div className="floor-info"><h4>{floor.name}</h4>{floor.description && <p className="floor-desc" title={floor.description}>{floor.description}</p>}<p className="floor-meta"><BedDouble size={14} style={{ marginRight: 4 }} />{floor.roomCount || 0} phòng</p></div>
                 <div className="floor-actions"><button className="btn-action edit" onClick={() => handleOpenFloorModal(floor)}>Sửa</button><button className="btn-action delete" onClick={() => handleDeleteFloor(floor._id)}>Xóa</button></div>
               </div>
             ))}
           </div>
        </section>

        {/* SECTION LOẠI PHÒNG */}
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
                  <th style={{ width: '160px', textAlign: 'center' }}>Thao tác</th> {/* Tăng width để chứa thêm nút */}
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
                        
                        {/* [NEW] Nút xem lịch sử giá */}
                        <button className="btn-icon-sm history" onClick={() => handleViewHistory(type)} title="Lịch sử giá">
                          <History size={16} />
                        </button>

                        <button className="btn-icon-sm edit" onClick={() => handleOpenTypeModal(type)} title="Sửa">
                          <Edit size={16} />
                        </button>
                        <button className="btn-icon-sm delete" onClick={() => handleDeleteType(type._id)} title="Xóa">
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

      {/* ... (Các Modal cũ giữ nguyên: Tầng, Loại phòng, Chi tiết) ... */}
      {showFloorModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h3>{editingFloor ? 'Sửa Tầng' : 'Thêm Tầng Mới'}</h3><button onClick={() => setShowFloorModal(false)}><X size={20}/></button></div>
            <form onSubmit={handleSaveFloor}>
              <div className="form-group"><label>Tên tầng</label><input type="text" value={floorName} onChange={(e) => setFloorName(e.target.value)} required placeholder="Ví dụ: Tầng 1" /></div>
              <div className="form-group"><label>Mô tả</label><textarea rows={2} value={floorDesc} onChange={(e) => setFloorDesc(e.target.value)} placeholder="Ghi chú thêm..." /></div>
              <div className="modal-actions"><button type="button" className="btn-secondary" onClick={() => setShowFloorModal(false)}>Hủy</button><button type="submit" className="btn-primary">Lưu lại</button></div>
            </form>
          </div>
        </div>
      )}

      {showTypeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header"><h3>{editingType ? 'Sửa Loại Phòng' : 'Thêm Loại Phòng'}</h3><button onClick={() => setShowTypeModal(false)}><X size={20}/></button></div>
            <form onSubmit={handleSaveType}>
              <div className="form-group"><label>Tên loại phòng</label><input type="text" value={typeForm.typeName} onChange={(e) => setTypeForm({ ...typeForm, typeName: e.target.value })} required /></div>
              <div className="form-row">
                <div className="form-group"><label>Giá phòng</label><input type="number" value={typeForm.currentPrice} onChange={(e) => setTypeForm({ ...typeForm, currentPrice: Number(e.target.value) })} required /></div>
                <div className="form-group"><label>Số người tối đa</label><input type="number" value={typeForm.personMax} onChange={(e) => setTypeForm({ ...typeForm, personMax: Number(e.target.value) })} required /></div>
              </div>
              <div className="form-group"><label>Mô tả</label><textarea rows={3} value={typeForm.description} onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })} /></div>
              <div className="form-group"><label>Hình ảnh ({oldImages.length + newFiles.length}/10)</label>
                <div className="image-upload-container"><div className="upload-btn-wrapper"><button type="button" className="btn-upload"><Upload size={24} /><span className="upload-hint">Click chọn ảnh hoặc kéo thả vào đây</span></button><input type="file" multiple accept="image/*" onChange={handleFileChange} /></div>
                  <div className="image-preview-grid">{oldImages.map((url, idx) => (<div key={`old-${idx}`} className="preview-item"><img src={url} alt="Old" /><button type="button" className="remove-image-btn" onClick={() => handleRemoveOldImage(idx)}><X size={12} /></button></div>))}{previewUrls.map((url, idx) => (<div key={`new-${idx}`} className="preview-item"><img src={url} alt="New" /><button type="button" className="remove-image-btn" onClick={() => handleRemoveNewImage(idx)}><X size={12} /></button></div>))}</div>
                </div>
              </div>
              <div className="modal-actions"><button type="button" className="btn-secondary" onClick={() => setShowTypeModal(false)}>Hủy</button><button type="submit" className="btn-primary">Lưu lại</button></div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && viewingType && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content">
            <div className="modal-header"><h3>Chi tiết Loại phòng</h3><button onClick={() => setShowDetailModal(false)}><X size={20} /></button></div>
            <div className="detail-body">
              <div className="detail-info-grid">
                <div className="info-item"><label>Tên loại phòng</label><div className="info-value text-bold">{viewingType.typeName}</div></div>
                <div className="info-item"><label>Giá hiện tại</label><div className="info-value text-price">{formatCurrency(viewingType.currentPrice)}</div></div>
                <div className="info-item"><label>Số người tối đa</label><div className="info-value">{viewingType.personMax} người</div></div>
                <div className="info-item full-width"><label>Mô tả</label><div className="info-value text-desc">{viewingType.description || "Không có mô tả"}</div></div>
              </div>
              <div className="detail-images-section"><label className="section-label">Hình ảnh ({viewingType.images?.length || 0})</label>{viewingType.images && viewingType.images.length > 0 ? (<div className="detail-image-grid">{viewingType.images.map((img, idx) => (<div key={idx} className="detail-image-item" onClick={() => openLightbox(idx)}><img src={img} alt={`Room ${idx}`} /></div>))}</div>) : (<p className="text-empty-small">Chưa có hình ảnh nào.</p>)}</div>
            </div>
            <div className="modal-actions"><button type="button" className="btn-secondary" onClick={() => setShowDetailModal(false)}>Đóng</button><button type="button" className="btn-primary" onClick={() => {setShowDetailModal(false);handleOpenTypeModal(viewingType);}}><Edit size={16} /> Chỉnh sửa</button></div>
          </div>
        </div>
      )}

      {/* [NEW] MODAL: LỊCH SỬ GIÁ */}
      {showHistoryModal && viewingHistoryType && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CalendarClock size={24} className="text-primary" />
                <h3>Lịch sử thay đổi giá: {viewingHistoryType.typeName}</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)}><X size={20}/></button>
            </div>
            
            <div className="detail-body">
              {viewingHistoryType.histories && viewingHistoryType.histories.length > 0 ? (
                <div className="history-list">
                  {/* Header */}
                  <div className="history-header-row">
                    <span>Thời điểm bắt đầu</span>
                    <span>Thời điểm kết thúc</span>
                    <span style={{textAlign: 'right'}}>Giá áp dụng</span>
                  </div>
                  
                  {/* Danh sách sort ngược (Mới nhất lên đầu) */}
                  {[...viewingHistoryType.histories].reverse().map((history, idx) => (
                    <div key={history._id} className={`history-item ${!history.endDate ? 'current' : ''}`}>
                      <div className="history-date">
                        {formatDate(history.startDate)}
                      </div>
                      <div className="history-date">
                        {history.endDate ? formatDate(history.endDate) : <span className="tag-active">Đang áp dụng</span>}
                      </div>
                      <div className="history-price">
                        {formatCurrency(history.price)}
                      </div>
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

      {/* ... (Lightbox giữ nguyên) ... */}
      {isLightboxOpen && (
        <div className="lightbox-overlay">
          <button className="lightbox-close-btn" onClick={closeLightbox}><X size={32} /></button>
          <button className="lightbox-nav-btn prev" onClick={prevImage}><ChevronLeft size={48} /></button>
          <div className="lightbox-content"><img src={currentImages[photoIndex]} alt="Full view" className="lightbox-image" /><div className="lightbox-counter">{photoIndex + 1} / {currentImages.length}</div></div>
          <button className="lightbox-nav-btn next" onClick={nextImage}><ChevronRight size={48} /></button>
        </div>
      )}
    </div>
  );
};

export default BuildingConfig;
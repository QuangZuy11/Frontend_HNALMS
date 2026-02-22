import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Plus, Search, Edit, Trash2,
  Package, Zap, X,
  Filter, ArrowUpDown,
  History, CalendarClock,
  AlertTriangle // [MỚI] Icon cảnh báo cho modal xóa
} from 'lucide-react';
import './ManageService.css';

// [TOASTR] Import thư viện Toastr
import toastr from 'toastr';
import 'toastr/build/toastr.min.css';

const API_BASE_URL = 'http://localhost:9999/api';

// Interface cho lịch sử giá
interface PriceHistory {
  _id: string;
  name: string;
  price: number;
  startDate: string;
  endDate: string | null;
}

// Interface Service
interface Service {
  _id: string;
  name: string;
  currentPrice: number;
  description?: string;
  type: 'Fixed' | 'Extension';
  isActive: boolean;
  histories?: PriceHistory[];
}

const ManageService = () => {
  // --- States ---
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Sort State
  const [sortOption, setSortOption] = useState('newest');

  // Modal & Form States
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', currentPrice: 0, description: '', type: 'Fixed', isActive: true
  });

  // Modal History States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [viewingHistoryService, setViewingHistoryService] = useState<Service | null>(null);

  // [MỚI] State cho Modal Xóa (Thay thế window.confirm)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // --- Cấu hình Toastr & Fetch Data ---
  useEffect(() => {
    toastr.options = {
      closeButton: true,
      progressBar: true,
      positionClass: "toast-top-right",
      timeOut: 3000,
      extendedTimeOut: 1000,
    };
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/services`);
      setServices(res.data.data || res.data || []);
    } catch (error) { 
      console.error(error);
      toastr.error("Không thể tải danh sách dịch vụ!", "Lỗi kết nối"); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- Logic Xử lý dữ liệu (Filter + Sort) ---
  const processedServices = useMemo(() => {
    let result = [...services];

    // 1. Lọc
    result = result.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'ALL' || s.type === filterType;
      return matchSearch && matchType;
    });

    // 2. Sắp xếp
    switch (sortOption) {
      case 'price-asc': result.sort((a, b) => a.currentPrice - b.currentPrice); break;
      case 'price-desc': result.sort((a, b) => b.currentPrice - a.currentPrice); break;
      case 'name-asc': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'newest': default: break;
    }
    return result;
  }, [services, searchTerm, filterType, sortOption]);


  // --- Handlers ---
  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({ name: '', currentPrice: 0, description: '', type: 'Fixed', isActive: true });
    setShowModal(true);
  };

  const handleOpenEdit = (service: Service) => {
    setIsEditing(true);
    setCurrentId(service._id);
    setFormData({
      name: service.name,
      currentPrice: service.currentPrice,
      description: service.description || '',
      type: service.type,
      isActive: service.isActive
    });
    setShowModal(true);
  };

  const handleViewHistory = (service: Service) => {
    setViewingHistoryService(service);
    setShowHistoryModal(true);
  };

  // [MỚI] 1. Khi bấm nút thùng rác -> Mở Modal (Không xóa ngay)
  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  // [MỚI] 2. Khi bấm "Xóa" trong Modal -> Gọi API
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    
    try { 
      await axios.delete(`${API_BASE_URL}/services/${itemToDelete}`); 
      toastr.success("Xóa dịch vụ thành công!", "Thành công");
      fetchServices();
      setShowDeleteModal(false); // Đóng modal
      setItemToDelete(null);
    }
    catch (e) { 
      toastr.error("Có lỗi xảy ra khi xóa dịch vụ.", "Lỗi"); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && currentId) {
        await axios.put(`${API_BASE_URL}/services/${currentId}`, formData);
        toastr.success("Cập nhật dịch vụ thành công!", "Thành công");
      } else {
        await axios.post(`${API_BASE_URL}/services`, formData);
        toastr.success("Thêm mới dịch vụ thành công!", "Thành công");
      }
      setShowModal(false); 
      fetchServices();
    } catch (e: any) { 
      const errorMessage = e.response?.data?.message || "Không thể lưu thông tin dịch vụ.";
      toastr.error(errorMessage, "Lỗi hệ thống"); 
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Hiện tại";
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="service-container">

      {/* HEADER */}
      <div className="service-header">
        <div className="service-title">
          <h2>Quản lý Dịch vụ & Tiện ích</h2>
          <div className="service-stats">
            <span className="stat-badge">Tổng số: {services.length}</span>
            <span className="stat-badge" style={{ color: '#2563eb' }}>
              Cố định: {services.filter(s => s.type === 'Fixed').length}
            </span>
            <span className="stat-badge" style={{ color: '#d97706' }}>
              Phụ trội: {services.filter(s => s.type === 'Extension').length}
            </span>
          </div>
        </div>
        <button className="btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Thêm Dịch vụ
        </button>
      </div>

      {/* TOOLBAR */}
      <div className="service-toolbar-wrapper">
        <div className="toolbar-left">
          <div className="search-container">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm kiếm tên dịch vụ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="toolbar-right">
          <div className="control-group">
            <Filter size={16} className="text-gray-400" />
            <span className="control-label">Lọc:</span>
            <select
              className="custom-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">Tất cả loại</option>
              <option value="Fixed">Cố định (Fixed)</option>
              <option value="Extension">Phụ trội (Extension)</option>
            </select>
          </div>

          <div className="control-group">
            <ArrowUpDown size={16} className="text-gray-400" />
            <span className="control-label">Xếp:</span>
            <select
              className="custom-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="newest">Mới nhất</option>
              <option value="price-asc">Giá: Thấp đến Cao</option>
              <option value="price-desc">Giá: Cao đến Thấp</option>
              <option value="name-asc">Tên: A - Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* GRID VIEW */}
      <div className="service-grid">
        {processedServices.map(service => (
          <div key={service._id} className={`service-card ${!service.isActive ? 'inactive-card' : ''}`}>
            <div className="card-header">
              <div className={`service-icon-wrapper ${service.type === 'Fixed' ? 'icon-fixed' : 'icon-extension'}`}>
                {service.type === 'Fixed' ? <Package size={24} /> : <Zap size={24} />}
              </div>
              <div className="service-price">
                {formatCurrency(service.currentPrice)}
              </div>
            </div>

            <div className="service-name">{service.name}</div>
            <div className="service-desc">{service.description || "Chưa có mô tả"}</div>

            <div className="card-footer">
              <span className={`type-badge ${service.type === 'Fixed' ? 'badge-fixed' : 'badge-extension'}`}>
                {service.type === 'Fixed' ? 'Cố định / Tháng' : 'Phụ trội'}
              </span>

              <div className="card-actions">
                <button className="btn-icon btn-history" onClick={() => handleViewHistory(service)} title="Lịch sử giá">
                    <History size={16} />
                </button>

                <button className="btn-icon btn-edit" onClick={() => handleOpenEdit(service)} title="Sửa">
                  <Edit size={16} />
                </button>
                {/* Thay đổi handler: gọi handleDeleteClick thay vì window.confirm */}
                <button className="btn-icon btn-delete" onClick={() => handleDeleteClick(service._id)} title="Xóa">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {processedServices.length === 0 && !loading && (
        <div style={{ textAlign: 'center', marginTop: 60, color: '#94a3b8' }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>Không tìm thấy kết quả nào.</p>
          <p style={{ fontSize: 14 }}>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
        </div>
      )}

      {/* --- MODAL ADD/EDIT --- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{isEditing ? 'Cập nhật Dịch vụ' : 'Thêm Dịch vụ Mới'}</h3>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên dịch vụ <span style={{ color: 'red' }}>*</span></label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Giá (VNĐ) <span style={{ color: 'red' }}>*</span></label>
                  <input type="number" required min="0" value={formData.currentPrice} onChange={e => setFormData({ ...formData, currentPrice: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Loại dịch vụ</label>
                  <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                    <option value="Fixed">Cố định (Fixed)</option>
                    <option value="Extension">Phụ trội (Extension)</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="activeChk" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} style={{ width: 'auto', margin: 0 }} />
                <label htmlFor="activeChk" style={{ margin: 0, cursor: 'pointer' }}>Đang hoạt động</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL LỊCH SỬ GIÁ --- */}
      {showHistoryModal && viewingHistoryService && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CalendarClock size={24} style={{ color: '#3579c6' }} />
                <h3>Lịch sử thay đổi giá: {viewingHistoryService.name}</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)}><X size={20} /></button>
            </div>

            <div className="detail-body" style={{ padding: '24px 32px', overflowY: 'auto' }}>
              {viewingHistoryService.histories && viewingHistoryService.histories.length > 0 ? (
                <div className="history-list" style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  <div className="history-header-row" style={{ 
                      display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', 
                      padding: '12px 16px', backgroundColor: '#f1f5f9', 
                      fontWeight: 700, fontSize: 13, color: '#64748b', textTransform: 'uppercase'
                  }}>
                    <span>Ngày bắt đầu</span>
                    <span>Ngày kết thúc</span>
                    <span style={{ textAlign: 'right' }}>Giá áp dụng</span>
                  </div>
                  
                  {[...viewingHistoryService.histories].reverse().map((history) => (
                    <div key={history._id} className="history-item" style={{ 
                        display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', 
                        padding: '12px 16px', borderBottom: '1px solid #f1f5f9', alignItems: 'center', fontSize: 14,
                        backgroundColor: !history.endDate ? '#f0fdf4' : 'transparent'
                    }}>
                      <div>{formatDate(history.startDate)}</div>
                      <div>
                        {history.endDate ? formatDate(history.endDate) : (
                          <span style={{ backgroundColor: '#dcfce7', color: '#166534', fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                            Đang áp dụng
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: !history.endDate ? '#16a34a' : '#1e293b' }}>
                        {formatCurrency(history.price)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-empty" style={{ textAlign: 'center', padding: 40, color: '#64748b', fontStyle: 'italic', background: '#f8fafc', borderRadius: 8, border: '1px dashed #e2e8f0' }}>
                  Chưa có dữ liệu lịch sử giá.
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowHistoryModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* --- [MỚI] MODAL XÁC NHẬN XÓA (Thay thế window.confirm) --- */}
      {showDeleteModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '400px', padding: '24px', textAlign: 'center' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                <div style={{ backgroundColor: '#fee2e2', padding: '12px', borderRadius: '50%' }}>
                    <AlertTriangle size={32} color="#ef4444" />
                </div>
            </div>
            
            <h3 style={{ marginBottom: '8px', fontSize: '18px', color: '#1e293b' }}>Xác nhận xóa?</h3>
            <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>
                Bạn có chắc chắn muốn xóa dịch vụ này không? Hành động này không thể hoàn tác.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                className="btn-secondary" 
                onClick={() => { setShowDeleteModal(false); setItemToDelete(null); }}
                style={{ width: '100px' }}
              >
                Hủy
              </button>
              <button 
                className="btn-primary" 
                onClick={handleConfirmDelete}
                style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', width: '100px', justifyContent: 'center' }}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageService;
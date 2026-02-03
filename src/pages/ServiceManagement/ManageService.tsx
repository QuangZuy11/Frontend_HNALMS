import React, { useState, useEffect, useMemo } from 'react'; // Thêm useMemo
import axios from 'axios';
import {
  Plus, Search, Edit, Trash2,
  Package, Zap, X,
  Filter, ArrowUpDown,
  History, CalendarClock // [MỚI] Thêm icon
} from 'lucide-react';
import './ManageService.css';

const API_BASE_URL = 'http://localhost:9999/api';

// [MỚI] Interface cho lịch sử giá
interface PriceHistory {
  _id: string;
  name: string; // Tên đợt cập nhật (VD: Giá khởi tạo, Cập nhật...)
  price: number;
  startDate: string;
  endDate: string | null;
}

// ... (Interface Service Cập nhật thêm histories) ...
interface Service {
  _id: string;
  name: string;
  currentPrice: number;
  description?: string;
  type: 'Fixed' | 'Extension';
  isActive: boolean;
  histories?: PriceHistory[]; // [MỚI] Thêm trường histories
}

const ManageService = () => {
  // --- States ---
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // [MỚI] Sort State
  // values: 'newest', 'price-asc', 'price-desc', 'name-asc'
  const [sortOption, setSortOption] = useState('newest');

  // Modal & Form States (Giữ nguyên)
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', currentPrice: 0, description: '', type: 'Fixed', isActive: true
  });

  // [MỚI] Modal History States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [viewingHistoryService, setViewingHistoryService] = useState<Service | null>(null);

  // --- Fetch Data (Giữ nguyên) ---
  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/services`);
      setServices(res.data.data || res.data || []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchServices(); }, []);

  // --- [MỚI] Logic Xử lý dữ liệu (Filter + Sort) ---
  // Dùng useMemo để tối ưu hiệu năng, chỉ tính toán lại khi dependency thay đổi
  const processedServices = useMemo(() => {
    let result = [...services];

    // 1. Lọc theo Search & Type
    result = result.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'ALL' || s.type === filterType;
      return matchSearch && matchType;
    });

    // 2. Sắp xếp (Sort)
    switch (sortOption) {
      case 'price-asc': // Giá thấp -> cao
        result.sort((a, b) => a.currentPrice - b.currentPrice);
        break;
      case 'price-desc': // Giá cao -> thấp
        result.sort((a, b) => b.currentPrice - a.currentPrice);
        break;
      case 'name-asc': // Tên A-Z
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest': // Mặc định (thường là mới nhất nếu API trả về đúng)
      default:
        // Nếu API trả về đã sort sẵn theo ngày tạo thì không cần làm gì, 
        // hoặc có thể sort theo _id (MongoID chứa timestamp)
        break;
    }

    return result;
  }, [services, searchTerm, filterType, sortOption]);


  // --- Handlers (CRUD - Giữ nguyên) ---
  const handleOpenAdd = () => { /* ...code cũ */
    setIsEditing(false);
    setFormData({ name: '', currentPrice: 0, description: '', type: 'Fixed', isActive: true });
    setShowModal(true);
  };
  const handleOpenEdit = (service: Service) => { /* ...code cũ */
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

  // [MỚI] Mở modal lịch sử
  const handleViewHistory = (service: Service) => {
    setViewingHistoryService(service);
    setShowHistoryModal(true);
  };

  const handleDelete = async (id: string) => { /* ...code cũ */
    if (window.confirm("Xóa?")) {
      try { await axios.delete(`${API_BASE_URL}/services/${id}`); fetchServices(); }
      catch (e) { alert("Lỗi xóa"); }
    }
  };
  const handleSubmit = async (e: React.FormEvent) => { /* ...code cũ */
    e.preventDefault();
    try {
      if (isEditing && currentId) await axios.put(`${API_BASE_URL}/services/${currentId}`, formData);
      else await axios.post(`${API_BASE_URL}/services`, formData);
      setShowModal(false); fetchServices();
    } catch (e) { alert("Lỗi lưu"); }
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
            <span className="stat-badge" style={{ color: '#2563eb' }}>Cố định: {services.filter(s => s.type === 'Fixed').length}</span>
            {/* [MỚI] Thêm thống kê Extension */}
            <span className="stat-badge" style={{ color: '#d97706' }}>
                Phụ trội: {services.filter(s => s.type === 'Extension').length}
            </span>
          </div>
        </div>
        <button className="btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Thêm Dịch vụ
        </button>
      </div>

      {/* --- [MỚI] TOOLBAR ĐẸP HƠN --- */}
      <div className="service-toolbar-wrapper">

        {/* Bên trái: Tìm kiếm */}
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

        {/* Bên phải: Filter & Sort */}
        <div className="toolbar-right">

          {/* Filter Loại */}
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

          {/* Sort Giá */}
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

      {/* GRID VIEW (Dùng processedServices thay vì filteredServices) */}
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
                {service.type === 'Fixed' ? 'Cố định / Lần' : 'Điện / Nước'}
              </span>

              <div className="card-actions">
                {/* [MỚI] Nút xem lịch sử giá */}
                <button className="btn-icon btn-history" onClick={() => handleViewHistory(service)} title="Lịch sử thay đổi giá">
                    <History size={16} />
                </button>

                <button className="btn-icon btn-edit" onClick={() => handleOpenEdit(service)}>
                  <Edit size={16} />
                </button>
                <button className="btn-icon btn-delete" onClick={() => handleDelete(service._id)}>
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

      {/* --- MODAL (Giữ nguyên code cũ, không thay đổi) --- */}
      {showModal && (
        <div className="modal-overlay">
          {/* ... Paste lại nội dung Modal cũ vào đây ... */}
          {/* (Vì phần này dài và không thay đổi logic nên tôi lược bớt để code gọn) */}
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

      {/* --- [MỚI] MODAL LỊCH SỬ GIÁ --- */}
      {showHistoryModal && viewingHistoryService && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CalendarClock size={24} style={{color: '#3579c6'}} />
                <h3>Lịch sử thay đổi giá: {viewingHistoryService.name}</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)}><X size={20}/></button>
            </div>
            
            <div className="detail-body" style={{ padding: '24px 32px', overflowY: 'auto' }}>
              {viewingHistoryService.histories && viewingHistoryService.histories.length > 0 ? (
                <div className="history-list" style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  {/* Header Row */}
                  <div className="history-header-row" style={{ 
                      display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', 
                      padding: '12px 16px', backgroundColor: '#f1f5f9', 
                      fontWeight: 700, fontSize: 13, color: '#64748b', textTransform: 'uppercase'
                  }}>
                    <span>Ngày bắt đầu</span>
                    <span>Ngày kết thúc</span>
                    <span style={{textAlign: 'right'}}>Giá áp dụng</span>
                  </div>
                  
                  {/* Data Rows (Đảo ngược để cái mới nhất lên đầu) */}
                  {[...viewingHistoryService.histories].reverse().map((history) => (
                    <div key={history._id} className="history-item" style={{ 
                        display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', 
                        padding: '12px 16px', borderBottom: '1px solid #f1f5f9', alignItems: 'center', fontSize: 14,
                        backgroundColor: !history.endDate ? '#f0fdf4' : 'transparent' // Highlight dòng hiện tại
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

    </div>
  );
};

export default ManageService; 
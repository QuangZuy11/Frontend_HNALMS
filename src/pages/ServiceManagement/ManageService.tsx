import React, { useState, useEffect, useMemo } from 'react'; // Thêm useMemo
import axios from 'axios';
import {
  Plus, Search, Edit, Trash2,
  Package, Zap, X,
  Filter, ArrowUpDown // [MỚI] Thêm icon
} from 'lucide-react';
import './ManageService.css';

const API_BASE_URL = 'http://localhost:9999/api';

// ... (Interface Service giữ nguyên) ...
interface Service {
  _id: string;
  name: string;
  currentPrice: number;
  description?: string;
  type: 'Fixed' | 'Extension';
  isActive: boolean;
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


  return (
    <div className="service-container">

      {/* HEADER */}
      <div className="service-header">
        <div className="service-title">
          <h2>Quản lý Dịch vụ & Tiện ích</h2>
          <div className="service-stats">
            <span className="stat-badge">Tổng số: {services.length}</span>
            <span className="stat-badge" style={{ color: '#2563eb' }}>Cố định: {services.filter(s => s.type === 'Fixed').length}</span>
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
    </div>
  );
};

export default ManageService;
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Plus, Search, Edit, Trash2, X,
  Filter, ArrowUpDown, History, CalendarClock,
  AlertTriangle, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight // [MỚI] Icon phân trang
} from 'lucide-react';
import './ManageService.css';

import toastr from 'toastr';
import 'toastr/build/toastr.min.css';

const API_BASE_URL = 'http://localhost:9999/api';

interface PriceHistory {
  _id: string;
  name: string;
  price: number;
  startDate: string;
  endDate: string | null;
}

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
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  
  // --- Filter & Sort States ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterPrice, setFilterPrice] = useState('ALL'); // [MỚI] State lọc theo giá
  const [sortOption, setSortOption] = useState('newest');

  // --- Pagination States ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- Modal States ---
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', currentPrice: 0, description: '', type: 'Fixed', isActive: true
  });

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [viewingHistoryService, setViewingHistoryService] = useState<Service | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser?.role || ''; 
  const canModify = userRole === 'owner';

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
      toastr.error("Không thể tải danh sách dịch vụ!", "Lỗi kết nối"); 
    } finally { 
      setLoading(false); 
    }
  };

  // Reset trang về 1 khi thay đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterPrice, sortOption]);

  const processedServices = useMemo(() => {
    let result = [...services];
    
    // 1. Lọc theo Tên/Mô tả & Loại
    result = result.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'ALL' || s.type === filterType;
      return matchSearch && matchType;
    });

    // 2. Lọc theo Khoảng Giá
    if (filterPrice !== 'ALL') {
      if (filterPrice === 'under50k') result = result.filter(s => s.currentPrice < 50000);
      else if (filterPrice === '50k-100k') result = result.filter(s => s.currentPrice >= 50000 && s.currentPrice <= 100000);
      else if (filterPrice === 'over100k') result = result.filter(s => s.currentPrice > 100000);
    }

    // 3. Sắp xếp
    switch (sortOption) {
      case 'price-asc': result.sort((a, b) => a.currentPrice - b.currentPrice); break;
      case 'price-desc': result.sort((a, b) => b.currentPrice - a.currentPrice); break;
      case 'name-asc': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'newest': default: break;
    }
    return result;
  }, [services, searchTerm, filterType, filterPrice, sortOption]);

  // Phân trang
  const totalPages = Math.ceil(processedServices.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedServices.slice(startIndex, startIndex + itemsPerPage);
  }, [processedServices, currentPage]);

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

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try { 
      await axios.delete(`${API_BASE_URL}/services/${itemToDelete}`); 
      toastr.success("Xóa dịch vụ thành công!", "Thành công");
      
      // Chuyển trang nếu xóa phần tử cuối cùng của trang
      if (currentItems.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }

      fetchServices();
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (e) { 
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
        
        {canModify && (
          <button className="btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} /> Thêm Dịch vụ
          </button>
        )}
      </div>

      {/* TOOLBAR LỌC & TÌM KIẾM */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', backgroundColor: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          <div className="search-box" style={{ minWidth: '250px', flex: 1 }}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm kiếm tên dịch vụ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="#64748b" />
            <select
              className="custom-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: '8px 32px 8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#334155' }}
            >
              <option value="ALL">Tất cả loại</option>
              <option value="Fixed">Cố định (Fixed)</option>
              <option value="Extension">Phụ trội (Extension)</option>
            </select>
          </div>

          {/* Lọc theo giá */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              className="custom-select"
              value={filterPrice}
              onChange={(e) => setFilterPrice(e.target.value)}
              style={{ padding: '8px 32px 8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#334155' }}
            >
              <option value="ALL">Tất cả mức giá</option>
              <option value="under50k">Dưới 50.000đ</option>
              <option value="50k-100k">50.000đ - 100.000đ</option>
              <option value="over100k">Trên 100.000đ</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowUpDown size={16} color="#64748b" />
          <select
            className="custom-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            style={{ padding: '8px 32px 8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#334155' }}
          >
            <option value="newest">Mới nhất</option>
            <option value="price-asc">Giá: Thấp đến Cao</option>
            <option value="price-desc">Giá: Cao đến Thấp</option>
            <option value="name-asc">Tên: A - Z</option>
          </select>
        </div>
      </div>

      {/* BẢNG DỮ LIỆU (TABLE VIEW) */}
      <div className="service-table-container">
        <table className="service-table">
          <thead>
            <tr>
              <th style={{ width: '5%', textAlign: 'center' }}>STT</th>
              <th style={{ width: '20%', textAlign: 'left' }}>Tên dịch vụ</th>
              <th style={{ width: '15%', textAlign: 'center' }}>Loại dịch vụ</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Giá hiện tại</th>
              <th style={{ width: '25%', textAlign: 'left' }}>Mô tả</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Trạng thái</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((service, index) => (
                <tr key={service._id} className={!service.isActive ? 'inactive-row' : ''}>
                  {/* STT */}
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  
                  <td style={{ fontWeight: 600, color: '#1e293b', textAlign: 'left' }}>
                    {service.name}
                  </td>
                  
                  <td style={{ textAlign: 'center' }}>
                    <span className={`type-badge ${service.type === 'Fixed' ? 'badge-fixed' : 'badge-extension'}`}>
                      {service.type === 'Fixed' ? 'Cố định / Tháng' : 'Phụ trội'}
                    </span>
                  </td>
                  
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                    {formatCurrency(service.currentPrice)}
                  </td>
                  
                  <td style={{ color: '#64748b', fontSize: '13px', textAlign: 'left', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.4' }}>
                    {service.description || <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>Không có mô tả</span>}
                  </td>
                  
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {service.isActive ? (
                        <span className="status-badge active"><CheckCircle2 size={14}/> Hoạt động</span>
                      ) : (
                        <span className="status-badge inactive"><XCircle size={14}/> Tạm ngưng</span>
                      )}
                    </div>
                  </td>
                  
                  <td style={{ textAlign: 'center' }}>
                    <div className="table-actions" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button className="btn-icon btn-history" onClick={() => handleViewHistory(service)} title="Lịch sử giá">
                        <History size={16} />
                      </button> 
                      {canModify && (
                        <>
                          <button className="btn-icon btn-edit" onClick={() => handleOpenEdit(service)} title="Sửa">
                            <Edit size={16} />
                          </button>
                          <button className="btn-icon btn-delete" onClick={() => handleDeleteClick(service._id)} title="Xóa">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{textAlign: 'center', padding: '40px', color: '#94a3b8'}}>
                  {loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy dịch vụ nào phù hợp.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* PHÂN TRANG (PAGINATION) */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              Hiển thị <span style={{ fontWeight: 600, color: '#0f172a' }}>{(currentPage - 1) * itemsPerPage + 1}</span> đến <span style={{ fontWeight: 600, color: '#0f172a' }}>{Math.min(currentPage * itemsPerPage, processedServices.length)}</span> trong tổng số <span style={{ fontWeight: 600, color: '#0f172a' }}>{processedServices.length}</span> dịch vụ
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === 1 ? '#f1f5f9' : '#fff', color: currentPage === 1 ? '#94a3b8' : '#334155', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <ChevronLeft size={16} /> Trước
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontWeight: 600, color: '#0f172a' }}>
                Trang {currentPage} / {totalPages}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === totalPages ? '#f1f5f9' : '#fff', color: currentPage === totalPages ? '#94a3b8' : '#334155', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
              >
                Sau <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          CÁC MODAL 
          ========================================================================= */}

      {/* 1. Modal Thêm/Sửa Dịch vụ */}
      {showModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isEditing ? 'Cập nhật Dịch vụ' : 'Thêm Dịch vụ Mới'}</h3>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên dịch vụ <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  disabled={isEditing && formData.type === 'Fixed'} 
                />
                {isEditing && formData.type === 'Fixed' && (
                  <small style={{ color: '#94a3b8', marginTop: '4px' }}>Dịch vụ cố định không được đổi tên</small>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Giá (VNĐ) <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="number" 
                    required 
                    min="0" 
                    value={formData.currentPrice} 
                    onChange={e => setFormData({ ...formData, currentPrice: Number(e.target.value) })} 
                  />
                </div>
                <div className="form-group">
                  <label>Loại dịch vụ</label>
                  <select 
                    value={formData.type} 
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                    disabled={isEditing && formData.type === 'Fixed'}
                  >
                    <option value="Fixed">Cố định (Fixed)</option>
                    <option value="Extension">Phụ trội (Extension)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Mô tả (Tối đa 100 ký tự)</label>
                <textarea 
                  rows={3} 
                  maxLength={100}
                  value={formData.description} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })} 
                  placeholder="Nhập mô tả ngắn gọn..."
                />
                <div style={{ textAlign: 'right', fontSize: '12px', color: (formData.description?.length || 0) === 100 ? '#ef4444' : '#94a3b8' }}>
                  {formData.description?.length || 0}/100
                </div>
              </div>

              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <input 
                  type="checkbox" 
                  id="activeChk" 
                  checked={formData.isActive} 
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })} 
                  style={{ width: 'auto', margin: 0 }}
                />
                <label htmlFor="activeChk" style={{ margin: 0, cursor: 'pointer' }}>
                  Đang hoạt động
                </label>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', margin: 0 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ width: '120px', padding: '10px 0', textAlign: 'center' }}>Hủy</button>
                <button type="submit" className="btn-primary" style={{ width: '120px', padding: '10px 0', textAlign: 'center', justifyContent: 'center' }}>Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Lịch Sử Giá */}
      {showHistoryModal && viewingHistoryService && (
         <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CalendarClock size={24} style={{ color: '#3579c6' }} />
                <h3>Lịch sử thay đổi giá: {viewingHistoryService.name}</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)}><X size={20} /></button>
            </div>

            <div className="detail-body" style={{ padding: '24px 32px', overflowY: 'auto', maxHeight: '60vh' }}>
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

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowHistoryModal(false)} style={{ width: '120px', padding: '10px 0', textAlign: 'center' }}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Xác Nhận Xóa */}
      {showDeleteModal && (
         <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => { setShowDeleteModal(false); setItemToDelete(null); }}>
          <div className="modal-content" style={{ maxWidth: '400px', padding: '24px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
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
              <button className="btn-secondary" onClick={() => { setShowDeleteModal(false); setItemToDelete(null); }} style={{ width: '120px' }}>Hủy</button>
              <button className="btn-primary" onClick={handleConfirmDelete} style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', width: '120px', justifyContent: 'center' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageService;
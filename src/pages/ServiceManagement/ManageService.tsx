import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Plus, Search, Edit, Trash2, X,
  Filter, ArrowUpDown, History, CalendarClock,
  AlertTriangle, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight,
  SwatchBook,
  LayoutGrid,
  CalendarDays,
  Sparkles,
  FileText,
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
  const itemsPerPage = 8;

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

  const totalCount = services.length;
  const fixedCount = services.filter((s) => s.type === 'Fixed').length;
  const extensionCount = services.filter((s) => s.type === 'Extension').length;

  return (
    <div className="service-container">
      {/* HEADER */}
      <div className="service-header">
        <div className="service-header-top">
          <div className="service-title-block">
            <div className="service-title-row">
              <div className="service-title-icon" aria-hidden>
                <SwatchBook size={22} strokeWidth={2} />
              </div>
              <div className="service-title-text">
                <h2>Quản lý Dịch vụ & Tiện ích</h2>
                <p className="service-subtitle">
                  Quản lý danh mục dịch vụ và lịch sử thay đổi cho tòa nhà Hoàng Nam.
                </p>
              </div>
            </div>
          </div>

          <div className="service-header-aside">
            <div className="stats-summary">
              <div className="stat-item">
                <FileText size={16} className="stat-icon icon-primary" />
                <div className="stat-text">
                  <span className="stat-value">{totalCount}</span>
                  <span className="stat-label">Tổng số</span>
                </div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <LayoutGrid size={16} className="stat-icon icon-accent" />
                <div className="stat-text">
                  <span className="stat-value">{fixedCount}</span>
                  <span className="stat-label">Cố định</span>
                </div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <Sparkles size={16} className="stat-icon icon-warning" />
                <div className="stat-text">
                  <span className="stat-value">{extensionCount}</span>
                  <span className="stat-label">Phụ trội</span>
                </div>
              </div>
            </div>

            {canModify && (
              <button type="button" className="btn-primary service-header-add-btn" onClick={handleOpenAdd}>
                <Plus size={18} /> Thêm Dịch vụ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TOOLBAR LỌC & TÌM KIẾM */}
      <div className="service-toolbar">
        <div className="service-toolbar-left">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm kiếm tên dịch vụ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="control-group">
            <Filter size={16} className="service-toolbar-icon" aria-hidden />
            <select
              className="custom-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">Tất cả loại</option>
              <option value="Fixed">Cố định </option>
              <option value="Extension">Phụ trội </option>
            </select>
          </div>

          <div className="control-group">
            <select
              className="custom-select"
              value={filterPrice}
              onChange={(e) => setFilterPrice(e.target.value)}
            >
              <option value="ALL">Tất cả mức giá</option>
              <option value="under50k">Dưới 50.000đ</option>
              <option value="50k-100k">50.000đ - 100.000đ</option>
              <option value="over100k">Trên 100.000đ</option>
            </select>
          </div>
        </div>

        <div className="service-toolbar-right">
          <ArrowUpDown size={16} className="service-toolbar-icon" aria-hidden />
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

      {/* BẢNG DỮ LIỆU (TABLE VIEW) */}
      <div className="service-table-container">
        <table className="service-table">
          <thead>
            <tr>
              <th className="cell-stt">STT</th>
              <th className="cell-name">Tên dịch vụ</th>
              <th className="cell-type">Loại dịch vụ</th>
              <th className="cell-price">Giá hiện tại</th>
              <th className="cell-desc">Mô tả</th>
              <th className="cell-status">Trạng thái</th>
              <th className="cell-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((service, index) => (
                <tr key={service._id} className={!service.isActive ? 'inactive-row' : ''}>
                  <td className="cell-stt">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>

                  <td className="cell-name">
                    {service.name}
                  </td>

                  <td className="cell-type">
                    <span className={`type-badge ${service.type === 'Fixed' ? 'badge-fixed' : 'badge-extension'}`}>
                      {service.type === 'Fixed' ? 'Cố định' : 'Phụ trội'}
                    </span>
                  </td>

                  <td className="cell-price">
                    {formatCurrency(service.currentPrice)}
                  </td>

                  <td className="cell-desc">
                    {service.description || <span className="desc-empty">Không có mô tả</span>}
                  </td>

                  <td className="cell-status">
                    {service.isActive ? (
                      <span className="status-badge active"><CheckCircle2 size={14} /> Hoạt động</span>
                    ) : (
                      <span className="status-badge inactive"><XCircle size={14} /> Tạm ngưng</span>
                    )}
                  </td>

                  <td className="cell-actions">
                    <div className="table-actions">
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
                <td colSpan={7} className="table-empty-cell">
                  {loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy dịch vụ nào phù hợp.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* PHÂN TRANG (PAGINATION) */}
        {totalPages > 1 && (
          <div className="service-pagination">
            <div className="service-pagination-info">
              Hiển thị{' '}
              <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> đến{' '}
              <strong>{Math.min(currentPage * itemsPerPage, processedServices.length)}</strong> trong tổng số{' '}
              <strong>{processedServices.length}</strong> dịch vụ
            </div>

            <div className="service-pagination-nav">
              <button
                type="button"
                className="service-page-btn"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} /> Trước
              </button>

              <span className="service-page-indicator">
                Trang {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                className="service-page-btn"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
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
        <div className="modal-overlay modal-z-base" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-content--w500" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isEditing ? 'Cập nhật Dịch vụ' : 'Thêm Dịch vụ Mới'}</h3>
              <button type="button" onClick={() => setShowModal(false)} aria-label="Đóng"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên dịch vụ <span className="form-required">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  disabled={isEditing && formData.type === 'Fixed'}
                />
                {isEditing && formData.type === 'Fixed' && (
                  <small className="form-hint">Dịch vụ cố định không được đổi tên</small>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Giá (VNĐ) <span className="form-required">*</span></label>
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
                <div className={`form-char-count ${(formData.description?.length || 0) === 100 ? 'form-char-count--limit' : ''}`}>
                  {formData.description?.length || 0}/100
                </div>
              </div>

              <div className="form-group form-group--checkbox">
                <input
                  type="checkbox"
                  id="activeChk"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <label htmlFor="activeChk">
                  Đang hoạt động
                </label>
              </div>

              <div className="ms-form-actions">
                <button type="button" className="btn-secondary ms-btn-fixed" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary ms-btn-fixed">Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Lịch Sử Giá */}
      {showHistoryModal && viewingHistoryService && (
        <div className="modal-overlay modal-z-history" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content modal-content--w600" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="ms-history-title">
                <CalendarClock size={24} className="ms-history-icon" aria-hidden />
                <h3>Lịch sử thay đổi giá: {viewingHistoryService.name}</h3>
              </div>
              <button type="button" onClick={() => setShowHistoryModal(false)} aria-label="Đóng"><X size={20} /></button>
            </div>

            <div className="ms-history-body">
              {viewingHistoryService.histories && viewingHistoryService.histories.length > 0 ? (
                <div className="ms-history-table">
                  <div className="ms-history-thead">
                    <span>Ngày bắt đầu</span>
                    <span>Ngày kết thúc</span>
                    <span>Giá áp dụng</span>
                  </div>

                  {[...viewingHistoryService.histories].reverse().map((history) => (
                    <div
                      key={history._id}
                      className={`ms-history-row ${!history.endDate ? 'ms-history-row--current' : ''}`}
                    >
                      <div>{formatDate(history.startDate)}</div>
                      <div>
                        {history.endDate ? formatDate(history.endDate) : (
                          <span className="ms-history-pill">Đang áp dụng</span>
                        )}
                      </div>
                      <div className={`ms-history-price ${!history.endDate ? 'ms-history-price--active' : ''}`}>
                        {formatCurrency(history.price)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ms-history-empty">
                  Chưa có dữ liệu lịch sử giá.
                </div>
              )}
            </div>

            <div className="ms-modal-footer">
              <button type="button" className="btn-secondary ms-btn-fixed" onClick={() => setShowHistoryModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Xác Nhận Xóa */}
      {showDeleteModal && (
        <div className="modal-overlay modal-z-delete" onClick={() => { setShowDeleteModal(false); setItemToDelete(null); }}>
          <div className="modal-content modal-content--delete" onClick={(e) => e.stopPropagation()}>
            <div className="ms-delete-wrap">
              <div className="ms-delete-icon-ring">
                <AlertTriangle size={32} color="#ef4444" />
              </div>
            </div>
            <h3 className="ms-delete-title">Xác nhận xóa?</h3>
            <p className="ms-delete-text">
              Bạn có chắc chắn muốn xóa dịch vụ này không? Hành động này không thể hoàn tác.
            </p>
            <div className="ms-modal-actions-row">
              <button type="button" className="btn-secondary ms-btn-fixed" onClick={() => { setShowDeleteModal(false); setItemToDelete(null); }}>Hủy</button>
              <button type="button" className="btn-primary btn-danger ms-btn-fixed" onClick={handleConfirmDelete}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageService;
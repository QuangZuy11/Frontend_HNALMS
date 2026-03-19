import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Eye, Plus, X } from 'lucide-react';
import { Autocomplete, TextField, createFilterOptions } from '@mui/material';
import violateService, { Violation, type CreateViolationPayload } from '../../services/violateService';
import api from '../../services/api';
import './ViolationList.css';

interface Contract {
  _id: string;
  contractCode: string;
  roomId: {
    _id: string;
    name: string;
  };
  tenantId: {
    _id: string;
    username: string;
    fullname?: string;
    email: string;
    phoneNumber?: string;
  };
}

interface ViolationWithDetails extends Violation {
  roomName?: string;
  tenantName?: string;
  tenantPhone?: string;
}

export default function ViolationList() {
  const [violations, setViolations] = useState<ViolationWithDetails[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<ViolationWithDetails | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Unpaid' | 'Paid'>('ALL');
  const [roomSearch, setRoomSearch] = useState<string>('');
  const [tenantSearch, setTenantSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(11);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [violationCode, setViolationCode] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);

  // Create form state
  const [formData, setFormData] = useState<{
    contractId: string;
    title: string;
    totalAmount: string;
    dueDate: string;
  }>({
    contractId: '',
    title: '',
    totalAmount: '',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [formErrors, setFormErrors] = useState<{
    contractId: string;
    title: string;
    totalAmount: string;
    dueDate: string;
  }>({
    contractId: '',
    title: '',
    totalAmount: '',
    dueDate: '',
  });

  // Scroll to top on mount
  useEffect(() => {
    const main = document.querySelector('.dashboard-layout-main') as HTMLElement | null;
    if (main) {
      main.scrollTop = 0;
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const fetchViolations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await violateService.getViolations({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page: currentPage,
        limit: itemsPerPage,
        type: 'violation',
      });

      if (response.success && Array.isArray(response.data)) {
        const transformedData = response.data.map((v: Violation) => ({
          ...v,
          roomName: v.contractId?.roomId?.name || '-',
          tenantName: v.contractId?.tenantId?.fullname || v.contractId?.tenantId?.username || '-',
          tenantPhone: v.contractId?.tenantId?.phoneNumber || '-',
        }));
        setViolations(transformedData);
        setTotalItems(response.total || response.data.length);
        setTotalPages(response.totalPages || Math.ceil(response.data.length / itemsPerPage));
      } else {
        setViolations([]);
        setTotalItems(0);
        setTotalPages(0);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách vi phạm:', err);
      const msg = err?.response?.data?.message || 'Không thể tải danh sách vi phạm';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [toast]);

  const fetchContracts = useCallback(async () => {
    try {
      setLoadingContracts(true);
      const response = await api.get('/contracts', { params: { status: 'Active' } });
      if (response.data.success && Array.isArray(response.data.data)) {
        setContracts(response.data.data);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách hợp đồng:', err);
    } finally {
      setLoadingContracts(false);
    }
  }, []);

  const openCreateModal = async () => {
    fetchContracts();
    try {
      const response = await violateService.getNextViolationCode();
      if (response?.success) {
        setViolationCode(response.data?.invoiceCode || '');
      }
    } catch (err) {
      console.error('Lỗi khi lấy mã vi phạm:', err);
      setViolationCode('');
    }
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setViolationCode('');
    setUploadedImages([]);
    setFormData({
      contractId: '',
      title: '',
      totalAmount: '',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setFormErrors({
      contractId: '',
      title: '',
      totalAmount: '',
      dueDate: '',
    });
  };

  const validateForm = () => {
    const errors = {
      contractId: '',
      title: '',
      totalAmount: '',
      dueDate: '',
    };
    let isValid = true;

    if (!formData.contractId) {
      errors.contractId = 'Vui lòng chọn phòng';
      isValid = false;
    }

    if (!formData.title.trim()) {
      errors.title = 'Vui lòng nhập tiêu đề vi phạm';
      isValid = false;
    }

    if (!formData.totalAmount || formData.totalAmount.trim() === '') {
      errors.totalAmount = 'Vui lòng nhập số tiền';
      isValid = false;
    } else {
      const amount = parseFloat(formData.totalAmount);
      if (isNaN(amount) || amount <= 0) {
        errors.totalAmount = 'Số tiền phải lớn hơn 0';
        isValid = false;
      }
    }

    if (!formData.dueDate) {
      errors.dueDate = 'Vui lòng chọn hạn thanh toán';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: CreateViolationPayload = {
        contractId: formData.contractId,
        title: formData.title.trim(),
        totalAmount: parseFloat(formData.totalAmount),
        dueDate: formData.dueDate,
        invoiceCode: violationCode || undefined,
        images: uploadedImages,
        type: 'violation',
        status: 'Unpaid',
      };

      const response = await violateService.createViolation(payload);

      if (response.success) {
        setToast({
          title: 'Thành công',
          message: 'Tạo vi phạm thành công!',
        });
        closeCreateModal();
        fetchViolations();
      }
    } catch (err: any) {
      console.error('Lỗi khi tạo vi phạm:', err);
      const msg = err?.response?.data?.message || 'Không thể tạo vi phạm';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleRoomSelect = (value: string) => {
    setFormData((prev) => ({ ...prev, contractId: value }));
    if (formErrors.contractId) {
      setFormErrors((prev) => ({ ...prev, contractId: '' }));
    }
  };

  const handleImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) {
      return;
    }

    try {
      setUploadingImages(true);
      const formDataUpload = new FormData();
      files.forEach((file) => formDataUpload.append('images', file));

      const response = await api.post('/upload/images', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.success) {
        setUploadedImages((prev) => [...prev, ...(response.data.data?.urls || [])]);
      }
    } catch (err) {
      console.error('Lỗi upload ảnh vi phạm:', err);
      setError('Không thể upload ảnh vi phạm');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (url: string) => {
    setUploadedImages((prev) => prev.filter((item) => item !== url));
  };

  const roomFilterOptions = createFilterOptions<Contract>({
    limit: 10,
    stringify: (option) => {
      const roomName = option.roomId?.name || '';
      const tenantName = option.tenantId?.fullname || option.tenantId?.username || '';
      const contractCode = option.contractCode || '';
      return `${roomName} ${tenantName} ${contractCode}`;
    },
  });

  // Reset về trang 1 khi thay đổi filter
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, roomSearch, tenantSearch]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (limit: number) => {
    setItemsPerPage(limit);
    setCurrentPage(1);
  };

  const getVisiblePages = () => {
    const pages: number[] = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 2) end = Math.min(totalPages, 5);
    if (currentPage >= totalPages - 1) start = Math.max(1, totalPages - 4);

    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusLabel = (status: string) => {
    if (status === 'Unpaid') return 'Chờ thanh toán';
    if (status === 'Paid') return 'Đã thanh toán';
    return status;
  };

  const handleViewDetail = (violation: ViolationWithDetails) => {
    setSelectedViolation(violation);
  };

  const handleCloseDetail = () => {
    setSelectedViolation(null);
    setSelectedImage(null);
  };

  const filteredViolations = violations.filter((v) => {
    if (roomSearch && !v.roomName?.toLowerCase().includes(roomSearch.toLowerCase())) {
      return false;
    }
    if (tenantSearch && !v.tenantName?.toLowerCase().includes(tenantSearch.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Get selected contract for display
  const selectedContract = contracts.find(c => c._id === formData.contractId);

  return (
    <div className="violation-requests-page">
      {toast && (
        <div className="success-toast" role="status" aria-live="polite">
          <div className="success-toast-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="success-toast-content">
            <div className="success-toast-title">{toast.title}</div>
            <div className="success-toast-message">{toast.message}</div>
          </div>
          <button
            type="button"
            className="success-toast-close"
            onClick={() => setToast(null)}
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      )}

      <div className="violation-requests-card">
        <div className="violation-requests-header">
          <div>
            <h1>Danh sách xử lý vi phạm</h1>
            <p className="subtitle">
              Quản lý các vi phạm và bồi thường của cư dân
            </p>
          </div>
          <button className="btn-create-violation" onClick={openCreateModal}>
            <Plus size={20} />
            Tạo vi phạm mới
          </button>
        </div>

        <div className="violation-requests-filters">
          <div className="violation-filter-wrapper">
            <label htmlFor="tenant-search" className="violation-filter-label">
              Cư dân:
            </label>
            <input
              type="text"
              id="tenant-search"
              className="violation-filter-select"
              placeholder="Nhập tên cư dân"
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
            />
          </div>
          <div className="violation-filter-wrapper">
            <label htmlFor="room-search" className="violation-filter-label">
              Phòng:
            </label>
            <input
              type="text"
              id="room-search"
              className="violation-filter-select"
              placeholder="Nhập số phòng"
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
            />
          </div>
          <div className="violation-filter-wrapper">
            <label htmlFor="status-filter" className="violation-filter-label">
              Trạng thái:
            </label>
            <select
              id="status-filter"
              className="violation-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'Unpaid' | 'Paid')}
            >
              <option value="ALL">Tất cả</option>
              <option value="Unpaid">Chờ thanh toán</option>
              <option value="Paid">Đã thanh toán</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="violation-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && violations.length === 0 && (
          <div className="violation-empty">
            <p>Chưa có vi phạm nào.</p>
          </div>
        )}

        {!loading && !error && violations.length > 0 && (
          <div className="violation-table-wrap">
            <table className="violation-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã vi phạm</th>
                  <th>Cư dân</th>
                  <th>Phòng</th>
                  <th>Tiêu đề</th>
                  <th>Số tiền (VNĐ)</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Hạn thanh toán</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredViolations.map((v, index) => (
                  <tr key={v._id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>
                      <div className="cell-main">
                        <div className="cell-title">{v.invoiceCode}</div>
                      </div>
                    </td>
                    <td>
                      <div className="cell-main">
                        <div className="cell-title">{v.tenantName}</div>
                      </div>
                    </td>
                    <td>
                      <div className="cell-main">
                        <div className="cell-title">{v.roomName}</div>
                      </div>
                    </td>
                    <td>
                      <div className="cell-main">
                        <div className="cell-title">{v.title}</div>
                      </div>
                    </td>
                    <td>{v.totalAmount?.toLocaleString('vi-VN') || 0}</td>
                    <td>
                      <span className={`status-badge status-${v.status.toLowerCase()}`}>
                        {getStatusLabel(v.status)}
                      </span>
                    </td>
                    <td>{formatDate(v.createdAt)}</td>
                    <td>{formatDate(v.dueDate)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn-view-detail"
                          onClick={() => handleViewDetail(v)}
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="violation-pagination violation-pagination--manager">
            <div className="violation-pagination-info">
              <span>
                Hiển thị <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> -{' '}
                <strong>{Math.min(currentPage * itemsPerPage, totalItems)}</strong> trong{' '}
                <strong>{totalItems}</strong> kết quả
              </span>
            </div>
            <div className="violation-pagination-items-per-page">
            </div>
            <div className="violation-pagination-controls">
              <button
                type="button"
                className="pagination-arrow-btn"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                <span className="repair-page-arrow">«</span>
              </button>
              <button
                type="button"
                className="pagination-arrow-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <span className="repair-page-arrow">‹</span>
              </button>
              {getVisiblePages().map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`violation-pagination-number ${currentPage === page ? 'active' : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                className="pagination-arrow-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <span className="repair-page-arrow">›</span>
              </button>
              <button
                type="button"
                className="pagination-arrow-btn"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                <span className="repair-page-arrow">»</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal xem chi tiết */}
        {selectedViolation && (
          <div className="violation-modal-overlay" onClick={handleCloseDetail}>
            <div className="violation-modal violation-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="violation-modal-header">
                <h2>Chi tiết vi phạm</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={handleCloseDetail}
                  aria-label="Đóng"
                >
                  ×
                </button>
              </div>
              <div className="violation-modal-body">
                <div className="detail-grid-layout">
                  {/* Thông tin vi phạm */}
                  <div className="detail-section">
                    <div className="detail-section-header">
                      <div className="detail-section-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10 9 9 9 8 9"/>
                        </svg>
                      </div>
                      <span className="detail-section-title">Thông tin vi phạm</span>
                    </div>
                    <div className="detail-grid-fields">
                      <div className="detail-field">
                        <span className="detail-field-label">Mã vi phạm</span>
                        <span className="detail-field-value">{selectedViolation.invoiceCode}</span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-field-label">Trạng thái</span>
                        <span className="detail-field-value">
                          <span className={`status-badge status-${selectedViolation.status.toLowerCase()}`}>
                            {getStatusLabel(selectedViolation.status)}
                          </span>
                        </span>
                      </div>
                      <div className="detail-field" style={{ gridColumn: 'span 2' }}>
                        <span className="detail-field-label">Nội dung vi phạm</span>
                        <span className="detail-email-value">{selectedViolation.title}</span>
                      </div>
                    </div>
                  </div>

                  {/* Thông tin cư dân */}
                  <div className="detail-section">
                    <div className="detail-section-header">
                      <div className="detail-section-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                      <span className="detail-section-title">Thông tin cư dân</span>
                    </div>
                    <div className="detail-grid-fields">
                      <div className="detail-field">
                        <span className="detail-field-label">Cư dân</span>
                        <span className="detail-field-value">{selectedViolation.tenantName}</span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-field-label">Phòng</span>
                        <span className="detail-field-value">{selectedViolation.roomName}</span>
                      </div>
                      <div className="detail-field" style={{ gridColumn: 'span 2' }}>
                        <span className="detail-field-label">Số điện thoại</span>
                        <span className="detail-field-value">{selectedViolation.tenantPhone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Thông tin thanh toán */}
                  <div className="detail-section">
                    <div className="detail-section-header">
                      <div className="detail-section-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="1" x2="12" y2="23"/>
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                      </div>
                      <span className="detail-section-title">Thông tin thanh toán</span>
                    </div>
                    <div className="detail-grid-fields">
                      <div className="detail-field">
                        <span className="detail-field-label">Số tiền</span>
                        <span className="detail-field-value detail-amount">
                          {selectedViolation.totalAmount?.toLocaleString('vi-VN')} VNĐ
                        </span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-field-label">Hạn thanh toán</span>
                        <span className="detail-field-value">{formatDate(selectedViolation.dueDate)}</span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-field-label">Ngày tạo</span>
                        <span className="detail-field-value">{formatDate(selectedViolation.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Hình ảnh */}
                  {selectedViolation.images && selectedViolation.images.length > 0 && (
                    <div className="detail-section">
                      <div className="detail-section-header">
                        <div className="detail-section-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </div>
                        <span className="detail-section-title">Hình ảnh ({selectedViolation.images.length})</span>
                      </div>
                      <div className="detail-images-grid">
                        {selectedViolation.images.map((url) => (
                          <button
                            key={url}
                            type="button"
                            className="detail-image-item"
                            onClick={() => setSelectedImage(url)}
                          >
                            <img src={url} alt="Ảnh vi phạm" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedImage && (
          <div className="violation-modal-overlay" onClick={() => setSelectedImage(null)}>
            <div className="violation-image-modal" onClick={(e) => e.stopPropagation()}>
              <img src={selectedImage} alt="Ảnh vi phạm" />
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedImage(null)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Modal tạo vi phạm mới */}
        {showCreateModal && (
          <div className="violation-modal-overlay" onClick={closeCreateModal}>
            <div className="violation-modal violation-create-modal" onClick={(e) => e.stopPropagation()}>
              <div className="violation-modal-header">
                <h2>Tạo vi phạm mới</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={closeCreateModal}
                  aria-label="Đóng"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="violation-modal-body">
                <form onSubmit={handleCreateSubmit} className="create-violation-form">
                  <div className="form-group">
                    <label htmlFor="violationCode">Mã vi phạm</label>
                    <input
                      type="text"
                      id="violationCode"
                      className="form-input"
                      value={violationCode || ''}
                      placeholder="Đang tạo mã..."
                      readOnly
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="contractId">
                      Số phòng <span className="required">*</span>
                    </label>
                    <Autocomplete
                      id="contractId"
                      options={contracts}
                      value={selectedContract ?? null}
                      loading={loadingContracts}
                      filterOptions={roomFilterOptions}
                      getOptionLabel={(option) => option.roomId?.name || 'Phòng'}
                      isOptionEqualToValue={(option, value) => option._id === value._id}
                      onChange={(_, value) => handleRoomSelect(value?._id || '')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Gõ để tìm số phòng"
                          error={Boolean(formErrors.contractId)}
                          helperText={formErrors.contractId}
                        />
                      )}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="title">
                      Tiêu đề <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      className={`form-input ${formErrors.title ? 'input-error' : ''}`}
                      placeholder="Nhập tiêu đề vi phạm "
                      value={formData.title}
                      onChange={handleInputChange}
                    />
                    {formErrors.title && (
                      <span className="error-message">{formErrors.title}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="totalAmount">
                      Số tiền (VNĐ) <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      id="totalAmount"
                      name="totalAmount"
                      className={`form-input ${formErrors.totalAmount ? 'input-error' : ''}`}
                      placeholder="Nhập số tiền"
                      value={formData.totalAmount}
                      onChange={handleInputChange}
                      min="0"
                      step="1000"
                    />
                    {formErrors.totalAmount && (
                      <span className="error-message">{formErrors.totalAmount}</span>
                    )}
                    {formData.totalAmount && !formErrors.totalAmount && (
                      <span className="helper-text">
                        {parseFloat(formData.totalAmount || '0').toLocaleString('vi-VN')} VNĐ
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="violationImages">Ảnh vi phạm</label>
                    <input
                      type="file"
                      id="violationImages"
                      className="form-input"
                      accept="image/*"
                      multiple
                      onChange={handleImagesChange}
                      disabled={uploadingImages}
                    />
                    {uploadingImages && (
                      <span className="helper-text">Đang upload ảnh...</span>
                    )}
                    {uploadedImages.length > 0 && (
                      <div className="violation-image-list">
                        {uploadedImages.map((url) => (
                          <div key={url} className="violation-image-item">
                            <img src={url} alt="Ảnh vi phạm" />
                            <button
                              type="button"
                              className="btn-remove-image"
                              onClick={() => handleRemoveImage(url)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="dueDate">
                      Hạn thanh toán <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      id="dueDate"
                      name="dueDate"
                      className={`form-input ${formErrors.dueDate ? 'input-error' : ''}`}
                      value={formData.dueDate}
                      onChange={handleInputChange}
                      readOnly
                    />
                    {formErrors.dueDate && (
                      <span className="error-message">{formErrors.dueDate}</span>
                    )}
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={closeCreateModal}
                      disabled={submitting}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="btn-submit"
                      disabled={submitting || loadingContracts}
                    >
                      {submitting ? 'Đang tạo...' : 'Tạo vi phạm'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

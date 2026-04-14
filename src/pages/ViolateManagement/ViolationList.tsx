import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Eye, X,
  Filter, ArrowUpDown,
  ShieldAlert,
  CheckCircle2,
  FileText,
  LayoutGrid,
  Image as ImageIcon,
  DollarSign,
  Clock,
} from 'lucide-react';
import { Autocomplete, TextField, createFilterOptions } from '@mui/material';
import { AppModal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import { useToast } from '../../components/common/Toast';
import violateService, { type Violation, type CreateViolationPayload } from '../../services/violateService';
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
  const { showToast } = useToast();
  const [violations, setViolations] = useState<ViolationWithDetails[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<ViolationWithDetails | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Unpaid' | 'Paid'>('ALL');
  const [roomSearch, setRoomSearch] = useState<string>('');
  const [tenantSearch, setTenantSearch] = useState<string>('');
  const [sortOption, setSortOption] = useState('newest');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 11;

  const [violationCode, setViolationCode] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      } else {
        setViolations([]);
      }
    } catch (err: unknown) {
      console.error('Lỗi khi tải danh sách vi phạm:', err);
      const e = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi', e.response?.data?.message || 'Không thể tải danh sách vi phạm.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, currentPage, showToast]);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, roomSearch, tenantSearch, sortOption]);

  const fetchContracts = useCallback(async () => {
    try {
      setLoadingContracts(true);
      const response = await api.get('/contracts', { params: { status: 'Active' } });
      if (response.data.success && Array.isArray(response.data.data)) {
        setContracts(response.data.data);
      } else {
        setContracts([]);
      }
    } catch {
      console.error('Lỗi khi tải danh sách hợp đồng');
    } finally {
      setLoadingContracts(false);
    }
  }, []);

  const openCreateModal = async () => {
    setShowCreateModal(true);
    await fetchContracts();
    try {
      const response = await violateService.getNextViolationCode();
      if (response?.success) {
        setViolationCode(response.data?.invoiceCode || '');
      }
    } catch {
      console.error('Lỗi khi lấy mã vi phạm');
      setViolationCode('');
    }
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
        showToast('success', 'Thành công', 'Tạo vi phạm thành công!');
        closeCreateModal();
        fetchViolations();
      }
    } catch (err: unknown) {
      console.error('Lỗi khi tạo vi phạm:', err);
      const e = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi hệ thống', e.response?.data?.message || 'Không thể tạo vi phạm.');
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
    if (files.length === 0) return;

    try {
      setUploadingImages(true);
      const fd = new FormData();
      files.forEach((file) => fd.append('images', file));

      const response = await api.post('/upload/images', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.success) {
        setUploadedImages((prev) => [...prev, ...(response.data.data?.urls || [])]);
      }
    } catch {
      console.error('Lỗi upload ảnh vi phạm');
      showToast('error', 'Lỗi', 'Không thể upload ảnh vi phạm.');
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

  // --- Stats ---
  const totalCount = violations.length;
  const unpaidCount = violations.filter((v) => v.status === 'Unpaid').length;
  const paidCount = violations.filter((v) => v.status === 'Paid').length;

  // --- Processed list (client-side search, sort is server-side via API) ---
  const displayedViolations = useMemo(() => {
    let result = [...violations];

    result = result.filter((v) => {
      const matchRoom = !roomSearch || v.roomName?.toLowerCase().includes(roomSearch.toLowerCase());
      const matchTenant = !tenantSearch || v.tenantName?.toLowerCase().includes(tenantSearch.toLowerCase());
      return matchRoom && matchTenant;
    });

    if (sortOption === 'name-asc') {
      result.sort((a, b) => (a.tenantName || '').localeCompare(b.tenantName || ''));
    } else if (sortOption === 'name-desc') {
      result.sort((a, b) => (b.tenantName || '').localeCompare(a.tenantName || ''));
    }

    return result;
  }, [violations, roomSearch, tenantSearch, sortOption]);

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const selectedContract = contracts.find(c => c._id === formData.contractId);

  const hasFilters = roomSearch || tenantSearch || statusFilter !== 'ALL';

  const clearFilters = () => {
    setRoomSearch('');
    setTenantSearch('');
    setStatusFilter('ALL');
  };

  return (
    <div className="violation-container">

      {/* HEADER */}
      <div className="violation-header">
        <div className="violation-header-top">
          <div className="violation-title-block">
            <div className="violation-title-row">
              <div className="violation-title-icon" aria-hidden>
                <ShieldAlert size={22} strokeWidth={2} />
              </div>
              <div className="violation-title-text">
                <h2>Quản lý Xử lý Vi phạm</h2>
                <p className="violation-subtitle">
                  Quản lý các vi phạm và bồi thường của cư dân trong tòa nhà Hoàng Nam.
                </p>
              </div>
            </div>
          </div>

          <div className="violation-header-aside">
            <div className="violation-stats-summary">
              <div className="violation-stat-item">
                <div className="violation-stat-icon icon-accent">
                  <FileText size={16} strokeWidth={2} />
                </div>
                <div className="violation-stat-text">
                  <span className="violation-stat-value">{totalCount}</span>
                  <span className="violation-stat-label">Tổng số</span>
                </div>
              </div>
              <div className="violation-stat-divider" />
              <div className="violation-stat-item">
                <div className="violation-stat-icon icon-warning">
                  <Clock size={16} strokeWidth={2} />
                </div>
                <div className="violation-stat-text">
                  <span className="violation-stat-value">{unpaidCount}</span>
                  <span className="violation-stat-label">Chờ thanh toán</span>
                </div>
              </div>
              <div className="violation-stat-divider" />
              <div className="violation-stat-item">
                <div className="violation-stat-icon icon-primary">
                  <CheckCircle2 size={16} strokeWidth={2} />
                </div>
                <div className="violation-stat-text">
                  <span className="violation-stat-value">{paidCount}</span>
                  <span className="violation-stat-label">Đã thanh toán</span>
                </div>
              </div>
            </div>

            <button type="button" className="btn-primary violation-add-btn" onClick={openCreateModal}>
              <Plus size={18} /> Tạo vi phạm mới
            </button>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="violation-toolbar">
        <div className="violation-toolbar-left">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm theo tên cư dân..."
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
            />
          </div>

          <div className="search-box">
            <LayoutGrid size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm theo số phòng..."
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
            />
          </div>

          <div className="control-group">
            <Filter size={16} className="violation-toolbar-icon" aria-hidden />
            <select
              className="custom-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'Unpaid' | 'Paid')}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Unpaid">Chờ thanh toán</option>
              <option value="Paid">Đã thanh toán</option>
            </select>
          </div>

          {hasFilters && (
            <button type="button" className="violation-btn-clear-filter" onClick={clearFilters}>
              Xóa lọc
            </button>
          )}
        </div>

        <div className="violation-toolbar-right">
          <ArrowUpDown size={16} className="violation-toolbar-icon" aria-hidden />
          <select
            className="custom-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="newest">Mới nhất</option>
            <option value="name-asc">Tên: A - Z</option>
            <option value="name-desc">Tên: Z - A</option>
          </select>
        </div>
      </div>

      {/* BẢNG DỮ LIỆU */}
      <div className="violation-table-container">
        <table className="violation-table">
          <thead>
            <tr>
              <th className="cell-stt">STT</th>
              <th className="cell-code">Mã vi phạm</th>
              <th className="cell-tenant">Cư dân</th>
              <th className="cell-room">Phòng</th>
              <th className="cell-title">Tiêu đề</th>
              <th className="cell-amount">Số tiền (VNĐ)</th>
              <th className="cell-status">Trạng thái</th>
              <th className="cell-date">Ngày tạo</th>
              <th className="cell-due">Hạn thanh toán</th>
              <th className="cell-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {displayedViolations.length > 0 ? (
              displayedViolations.map((v, index) => (
                <tr key={v._id}>
                  <td className="cell-stt">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>

                  <td className="cell-code">
                    <span className="violation-code-text">{v.invoiceCode}</span>
                  </td>

                  <td className="cell-tenant">
                    {v.tenantName || '-'}
                  </td>

                  <td className="cell-room">
                    <span className="room-badge">{v.roomName || '-'}</span>
                  </td>

                  <td className="cell-title">
                    {v.title}
                  </td>

                  <td className="cell-amount">
                    {v.totalAmount?.toLocaleString('vi-VN') || 0}
                  </td>

                  <td className="cell-status">
                    <span className={`status-badge ${v.status === 'Paid' ? 'active' : 'pending'}`}>
                      {v.status === 'Paid' ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <Clock size={14} />
                      )}
                      {getStatusLabel(v.status)}
                    </span>
                  </td>

                  <td className="cell-date">
                    {formatDate(v.createdAt)}
                  </td>

                  <td className="cell-due">
                    {formatDate(v.dueDate)}
                  </td>

                  <td className="cell-actions">
                    <div className="table-actions">
                      <button
                        className="btn-icon btn-view"
                        onClick={() => handleViewDetail(v)}
                        title="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="table-empty-cell">
                  {loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy vi phạm nào phù hợp.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={displayedViolations.length}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ==================================================================
          CÁC MODAL
          ================================================================== */}

      {/* 1. Modal Chi tiết vi phạm */}
      <AppModal
        open={!!selectedViolation}
        onClose={handleCloseDetail}
        title="Chi tiết vi phạm"
        icon={<ShieldAlert size={18} />}
        color="blue"
        size="md"
        footer={
          <button type="button" className="ms-btn ms-btn--ghost" onClick={handleCloseDetail}>
            Đóng
          </button>
        }
      >
        {selectedViolation && (
          <div className="vl-detail-body">
            {/* Profile strip */}
            <div className="vl-profile-strip">
              <div className="vl-avatar">
                {(selectedViolation.tenantName || '?').charAt(0).toUpperCase()}
              </div>
              <div className="vl-profile-info">
                <div className="vl-profile-name">{selectedViolation.tenantName}</div>
                <div className="vl-profile-meta">
                  <span className="vl-meta-tag">{selectedViolation.roomName}</span>
                  <span className={`vl-status-tag ${selectedViolation.status === 'Paid' ? 'vl-status-paid' : 'vl-status-unpaid'}`}>
                    {selectedViolation.status === 'Paid' ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <Clock size={12} />
                    )}
                    {getStatusLabel(selectedViolation.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Info sections */}
            <div className="vl-two-col">
              {/* Left */}
              <div className="vl-col-left">
                <div className="vl-section">
                  <div className="vl-section-title">
                    <ShieldAlert size={15} />
                    Thông tin vi phạm
                  </div>
                  <div className="vl-rows">
                    <div className="vl-row">
                      <span className="vl-label">Mã vi phạm</span>
                      <span className="vl-value">{selectedViolation.invoiceCode}</span>
                    </div>
                    <div className="vl-row">
                      <span className="vl-label">Tiêu đề</span>
                      <span className="vl-value vl-value--break">{selectedViolation.title}</span>
                    </div>
                  </div>
                </div>

                <div className="vl-section">
                  <div className="vl-section-title">
                    <DollarSign size={15} />
                    Thông tin thanh toán
                  </div>
                  <div className="vl-rows">
                    <div className="vl-row">
                      <span className="vl-label">Số tiền</span>
                      <span className="vl-value vl-value--amount">
                        {selectedViolation.totalAmount?.toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                    <div className="vl-row">
                      <span className="vl-label">Hạn thanh toán</span>
                      <span className="vl-value">{formatDate(selectedViolation.dueDate)}</span>
                    </div>
                    <div className="vl-row">
                      <span className="vl-label">Ngày tạo</span>
                      <span className="vl-value">{formatDate(selectedViolation.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right */}
              <div className="vl-col-right">
                <div className="vl-section">
                  <div className="vl-section-title">
                    <ImageIcon size={15} />
                    Hình ảnh ({selectedViolation.images?.length || 0})
                  </div>
                  {selectedViolation.images && selectedViolation.images.length > 0 ? (
                    <div className="vl-images-grid">
                      {selectedViolation.images.map((url) => (
                        <button
                          key={url}
                          type="button"
                          className="vl-image-btn"
                          onClick={() => setSelectedImage(url)}
                        >
                          <img src={url} alt="Ảnh vi phạm" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="vl-images-empty">Chưa có hình ảnh.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </AppModal>

      {/* 2. Modal Xem ảnh fullscreen */}
      <AppModal
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        size="md"
        hideClose
      >
        <div className="vl-image-fullscreen">
          <img src={selectedImage || ''} alt="Ảnh vi phạm" />
        </div>
      </AppModal>

      {/* 3. Modal Tạo vi phạm mới */}
      <AppModal
        open={showCreateModal}
        onClose={closeCreateModal}
        title="Tạo vi phạm mới"
        icon={<Plus size={18} />}
        color="blue"
        size="md"
        footer={
          <>
            <button type="button" className="ms-btn ms-btn--ghost" onClick={closeCreateModal}>
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="vl-create-form"
              className="ms-btn ms-btn--primary"
              disabled={submitting || loadingContracts}
            >
              <CheckCircle2 size={16} />
              {submitting ? 'Đang tạo...' : 'Tạo vi phạm'}
            </button>
          </>
        }
      >
        <form id="vl-create-form" onSubmit={handleCreateSubmit}>
          <div className="ms-field">
            <label className="ms-label">Mã vi phạm</label>
            <div className="ms-input-wrap">
              <input
                type="text"
                className="ms-input"
                value={violationCode || ''}
                placeholder="Đang tạo mã..."
                readOnly
              />
            </div>
          </div>

          <div className="ms-field">
            <label className="ms-label">
              Số phòng <span className="ms-label-required">*</span>
            </label>
            <Autocomplete
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
              slotProps={{
                popper: { modifiers: [{ name: 'flip', enabled: false }], style: { zIndex: 10000 } },
              }}
            />
          </div>

          <div className="ms-field">
            <label className="ms-label">
              Tiêu đề <span className="ms-label-required">*</span>
            </label>
            <div className="ms-input-wrap">
              <input
                type="text"
                className={`ms-input ${formErrors.title ? 'ms-input--error' : ''}`}
                placeholder="Nhập tiêu đề vi phạm"
                value={formData.title}
                onChange={handleInputChange}
                name="title"
              />
            </div>
            {formErrors.title && (
              <span className="ms-error-text">{formErrors.title}</span>
            )}
          </div>

          <div className="ms-field-row">
            <div className="ms-field">
              <label className="ms-label">
                Số tiền (VNĐ) <span className="ms-label-required">*</span>
              </label>
              <div className="ms-input-wrap ms-input-wrap--prefix">
                <span className="ms-input-prefix">₫</span>
                <input
                  type="number"
                  className={`ms-input ms-input--prefix ${formErrors.totalAmount ? 'ms-input--error' : ''}`}
                  placeholder="0"
                  value={formData.totalAmount}
                  onChange={handleInputChange}
                  name="totalAmount"
                  min="0"
                  step="1000"
                />
              </div>
              {formErrors.totalAmount && (
                <span className="ms-error-text">{formErrors.totalAmount}</span>
              )}
            </div>

            <div className="ms-field">
              <label className="ms-label">
                Hạn thanh toán <span className="ms-label-required">*</span>
              </label>
              <div className="ms-input-wrap">
                <input
                  type="date"
                  className={`ms-input ${formErrors.dueDate ? 'ms-input--error' : ''}`}
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  name="dueDate"
                  readOnly
                />
              </div>
              {formErrors.dueDate && (
                <span className="ms-error-text">{formErrors.dueDate}</span>
              )}
            </div>
          </div>

          <div className="ms-field">
            <label className="ms-label">Ảnh vi phạm</label>
            <div className="ms-input-wrap">
              <input
                type="file"
                className="ms-input"
                accept="image/*"
                multiple
                onChange={handleImagesChange}
                disabled={uploadingImages}
              />
            </div>
            {uploadingImages && (
              <span className="ms-helper-text">Đang upload ảnh...</span>
            )}
            {uploadedImages.length > 0 && (
              <div className="vl-image-list">
                {uploadedImages.map((url) => (
                  <div key={url} className="vl-image-thumb">
                    <img src={url} alt="Ảnh vi phạm" />
                    <button
                      type="button"
                      className="vl-image-remove"
                      onClick={() => handleRemoveImage(url)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </AppModal>
    </div>
  );
}

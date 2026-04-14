import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye, Wrench,
  CheckCircle2, XCircle,
  Clock, AlertCircle,
  Filter, ArrowUpDown,
  Search, LayoutGrid,
  DollarSign,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { AppModal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import { useToast } from '../../components/common/Toast';
import { requestService } from '../../services/requestService';
import { useAuth } from '../../hooks/useAuth';
import './MaintenanceRequestsList.css';

interface MaintenanceRequest {
  _id: string;
  type: 'Sửa chữa' | 'Bảo trì' | string;
  description: string;
  images: string[];
  status: 'Pending' | 'Processing' | 'Done' | 'Unpaid' | string;
  createdDate?: string;
  paymentType?: 'REVENUE' | 'EXPENSE' | null;
  cost?: number;
  notes?: string;
  tenantId?: {
    _id: string;
    username: string;
    email: string;
    phoneNumber?: string;
    fullname?: string | null;
  } | null;
  devicesId?: {
    _id: string;
    name: string;
    brand?: string;
    model?: string;
  } | null;
  room?: {
    _id: string;
    name: string;
    roomCode?: string;
  } | null;
}

export default function MaintenanceRequestsList() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMaintenanceStatusConfirmModal, setShowMaintenanceStatusConfirmModal] = useState(false);
  const [pendingMaintenanceStatusChange, setPendingMaintenanceStatusChange] = useState<{
    request: MaintenanceRequest;
    nextStatus: 'Pending' | 'Processing' | 'Done';
  } | null>(null);
  const [autoPaymentVoucher, setAutoPaymentVoucher] = useState<string>('');
  const [autoPaymentVoucherLoading, setAutoPaymentVoucherLoading] = useState(false);
  const [autoPaymentVoucherError, setAutoPaymentVoucherError] = useState<string>('');
  const [paymentForm, setPaymentForm] = useState({
    financialTitle: '',
    financialAmount: '',
  });
  const [paymentFormErrors, setPaymentFormErrors] = useState({
    financialTitle: '',
    financialAmount: '',
  });
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'Pending' | 'Processing' | 'Unpaid' | 'Done'
  >('ALL');
  const [roomSearch, setRoomSearch] = useState<string>('');
  const [tenantSearch, setTenantSearch] = useState<string>('');
  const [sortOption, setSortOption] = useState('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 11;
  const { isManager } = useAuth();
  const tableRef = useRef<HTMLDivElement | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await requestService.getRepairRequests(
        roomSearch,
        tenantSearch,
        currentPage,
        itemsPerPage,
        'Bảo trì',
      );
      if (response.success && Array.isArray(response.data)) {
        setRequests(response.data as MaintenanceRequest[]);
      } else {
        setRequests([]);
      }
    } catch (err: unknown) {
      console.error('Lỗi khi tải danh sách yêu cầu bảo trì:', err);
      const e = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi', e.response?.data?.message || 'Không thể tải danh sách yêu cầu bảo trì.');
    } finally {
      setLoading(false);
    }
  }, [roomSearch, tenantSearch, currentPage, showToast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    setCurrentPage(1);
  }, [roomSearch, tenantSearch, statusFilter, sortOption]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

  const getStatusLabel = (request: MaintenanceRequest) => {
    if (request.status === 'Pending') return 'Chờ xử lý';
    if (request.status === 'Processing') return 'Đang xử lý';
    if (request.status === 'Unpaid') return 'Chờ thanh toán';
    return 'Đã xử lý';
  };

  const getMaintenanceStatusText = (status: 'Pending' | 'Processing' | 'Done') => {
    if (status === 'Pending') return 'Chờ xử lý';
    if (status === 'Processing') return 'Đang xử lý';
    return 'Đã xử lý';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Pending') return <Clock size={14} />;
    if (status === 'Processing') return <AlertCircle size={14} />;
    if (status === 'Paid') return <CheckCircle2 size={14} />;
    if (status === 'Unpaid') return <XCircle size={14} />;
    return <CheckCircle2 size={14} />;
  };

  const handleViewDetail = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
  };

  const handleCloseDetail = () => {
    setSelectedRequest(null);
  };

  const handleOpenImagePreview = (url: string) => {
    setPreviewImageUrl(url);
  };

  const handleCloseImagePreview = () => {
    setPreviewImageUrl(null);
  };

  const applyMaintenanceStatusUpdate = async (
    request: MaintenanceRequest,
    nextStatus: 'Pending' | 'Processing' | 'Done',
  ) => {
    try {
      setUpdatingId(request._id);
      const response = await requestService.updateRepairStatus(request._id, nextStatus);
      const updated = response.data;

      if (updated?._id) {
        setRequests((prev) =>
          prev.map((r) => (r._id === updated._id ? { ...r, status: updated.status } : r)),
        );
        if (selectedRequest && selectedRequest._id === updated._id) {
          setSelectedRequest((prev) => (prev ? { ...prev, status: updated.status } : prev));
        }
      }
      showToast('success', 'Thành công', 'Cập nhật trạng thái thành công!');
    } catch (err: unknown) {
      console.error('Lỗi khi cập nhật trạng thái:', err);
      const e = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi', e.response?.data?.message || 'Không thể cập nhật trạng thái.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateStatus = async (
    request: MaintenanceRequest,
    nextStatus: 'Pending' | 'Processing' | 'Done',
  ) => {
    if (nextStatus === 'Done') {
      setSelectedRequest(request);
      setShowPaymentModal(true);
      setAutoPaymentVoucher('');
      setAutoPaymentVoucherError('');
      setPaymentForm({ financialTitle: '', financialAmount: '' });
      setPaymentFormErrors({ financialTitle: '', financialAmount: '' });

      (async () => {
        try {
          setAutoPaymentVoucherLoading(true);
          const res = await requestService.getNextMaintenancePaymentVoucher();
          const code = res?.data?.paymentVoucher;
          if (!code) throw new Error('Không thể tạo mã phiếu chi');
          setAutoPaymentVoucher(code);
        } catch (err: unknown) {
          const e = err as { response?: { data?: { message?: string } }; message?: string };
          console.error('Lỗi khi tạo mã phiếu chi:', err);
          setAutoPaymentVoucherError(e.response?.data?.message || e.message || 'Không thể tạo mã phiếu chi');
        } finally {
          setAutoPaymentVoucherLoading(false);
        }
      })();
      return;
    }
    setPendingMaintenanceStatusChange({ request, nextStatus });
    setShowMaintenanceStatusConfirmModal(true);
  };

  const handleConfirmMaintenanceStatusChange = async () => {
    if (!pendingMaintenanceStatusChange) return;
    const { request, nextStatus } = pendingMaintenanceStatusChange;
    setShowMaintenanceStatusConfirmModal(false);
    setPendingMaintenanceStatusChange(null);
    await applyMaintenanceStatusUpdate(request, nextStatus);
    setTimeout(() => { setSelectedRequest(null); }, 600);
  };

  const handleCloseMaintenanceStatusConfirmModal = () => {
    if (updatingId) return;
    setShowMaintenanceStatusConfirmModal(false);
    setPendingMaintenanceStatusChange(null);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedRequest(null);
    setPaymentForm({ financialTitle: '', financialAmount: '' });
    setPaymentFormErrors({ financialTitle: '', financialAmount: '' });
    setAutoPaymentVoucher('');
    setAutoPaymentVoucherError('');
    setAutoPaymentVoucherLoading(false);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedRequest) return;

    const errors = { financialTitle: '', financialAmount: '' };
    let isValid = true;

    if (!paymentForm.financialTitle.trim()) {
      errors.financialTitle = 'Vui lòng nhập tiêu đề phiếu chi';
      isValid = false;
    }
    if (!paymentForm.financialAmount || paymentForm.financialAmount.trim() === '') {
      errors.financialAmount = 'Vui lòng nhập tổng số tiền';
      isValid = false;
    } else {
      const amount = parseFloat(paymentForm.financialAmount);
      if (isNaN(amount) || amount < 0) {
        errors.financialAmount = 'Tổng số tiền phải là số hợp lệ và lớn hơn hoặc bằng 0';
        isValid = false;
      }
    }

    setPaymentFormErrors(errors);
    if (!isValid) return;

    const amountNumber = parseFloat(paymentForm.financialAmount);

    try {
      setUpdatingId(selectedRequest._id);
      const response = await requestService.updateRepairStatus(
        selectedRequest._id, 'Done', amountNumber, 'Bảo trì thiết bị', undefined, {
          financialTitle: paymentForm.financialTitle.trim(),
          financialAmount: amountNumber,
          paymentVoucher: autoPaymentVoucher,
        }, 'EXPENSE',
      );
      const updated = response.data;

      if (updated?._id) {
        setRequests((prev) =>
          prev.map((r) =>
            r._id === updated._id
              ? { ...r, status: updated.status, cost: updated.cost, paymentType: updated.paymentType ?? 'EXPENSE' }
              : r,
          ),
        );
        if (selectedRequest && selectedRequest._id === updated._id) {
          setSelectedRequest((prev) =>
            prev ? { ...prev, status: updated.status, cost: updated.cost, paymentType: updated.paymentType ?? 'EXPENSE' } : prev,
          );
        }
      }

      setShowPaymentModal(false);
      setSelectedRequest(null);
      setPaymentForm({ financialTitle: '', financialAmount: '' });
      setPaymentFormErrors({ financialTitle: '', financialAmount: '' });
      showToast('success', 'Thành công', 'Tạo phiếu chi bảo trì thành công!');
      setTimeout(() => { setSelectedRequest(null); }, 600);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi', e.response?.data?.message || 'Không thể hoàn thành yêu cầu.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRequests = useMemo(() => {
    let result = [...requests];
    if (statusFilter !== 'ALL') result = result.filter((r) => r.status === statusFilter);
    if (sortOption === 'name-asc') {
      result.sort((a, b) => (a.tenantId?.fullname || '').localeCompare(b.tenantId?.fullname || ''));
    } else if (sortOption === 'name-desc') {
      result.sort((a, b) => (b.tenantId?.fullname || '').localeCompare(a.tenantId?.fullname || ''));
    }
    return result;
  }, [requests, statusFilter, sortOption]);

  const totalItems = filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  const hasFilters = roomSearch || tenantSearch || statusFilter !== 'ALL';

  const clearFilters = () => {
    setRoomSearch('');
    setTenantSearch('');
    setStatusFilter('ALL');
  };

  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'Pending').length;
  const doneCount = requests.filter((r) => r.status === 'Done' || r.status === 'Paid').length;

  if (!isManager) {
    return (
      <div className="repair-container">
        <div className="repair-header">
          <div className="repair-title-block">
            <h2 style={{ color: '#dc2626', textAlign: 'center', marginTop: 32 }}>Bạn không có quyền truy cập trang này.</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="repair-container">

      {/* HEADER */}
      <div className="repair-header">
        <div className="repair-header-top">
          <div className="repair-title-block">
            <div className="repair-title-row">
              <div className="repair-title-icon" aria-hidden>
                <Wrench size={22} strokeWidth={2} />
              </div>
              <div className="repair-title-text">
                <h2>Quản lý Yêu cầu Bảo trì</h2>
                <p className="repair-subtitle">
                  Các yêu cầu bảo trì do cư dân gửi lên tòa nhà Hoàng Nam.
                </p>
              </div>
            </div>
          </div>

          <div className="repair-header-aside">
            <div className="repair-stats-summary">
              <div className="repair-stat-item">
                <div className="repair-stat-icon icon-primary">
                  <Wrench size={16} strokeWidth={2} />
                </div>
                <div className="repair-stat-text">
                  <span className="repair-stat-value">{totalCount}</span>
                  <span className="repair-stat-label">Tổng số</span>
                </div>
              </div>
              <div className="repair-stat-divider" />
              <div className="repair-stat-item">
                <div className="repair-stat-icon icon-warning">
                  <Clock size={16} strokeWidth={2} />
                </div>
                <div className="repair-stat-text">
                  <span className="repair-stat-value">{pendingCount}</span>
                  <span className="repair-stat-label">Chờ xử lý</span>
                </div>
              </div>
              <div className="repair-stat-divider" />
              <div className="repair-stat-item">
                <div className="repair-stat-icon icon-primary">
                  <CheckCircle2 size={16} strokeWidth={2} />
                </div>
                <div className="repair-stat-text">
                  <span className="repair-stat-value">{doneCount}</span>
                  <span className="repair-stat-label">Đã xử lý</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="repair-toolbar">
        <div className="repair-toolbar-left">
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
            <Filter size={16} className="repair-toolbar-icon" aria-hidden />
            <select
              className="custom-select"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as typeof statusFilter)
              }
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Pending">Chờ xử lý</option>
              <option value="Processing">Đang xử lý</option>
              <option value="Done">Đã xử lý</option>
              <option value="Unpaid">Chờ thanh toán</option>
            </select>
          </div>

          {hasFilters && (
            <button type="button" className="repair-btn-clear-filter" onClick={clearFilters}>
              Xóa lọc
            </button>
          )}
        </div>

        <div className="repair-toolbar-right">
          <ArrowUpDown size={16} className="repair-toolbar-icon" aria-hidden />
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

      {/* TABLE */}
      <div className="repair-table-container" ref={tableRef}>
        <table className="repair-table">
          <thead>
            <tr>
              <th className="cell-stt">STT</th>
              <th className="cell-tenant">Cư dân</th>
              <th className="cell-room">Phòng</th>
              <th className="cell-device">Thiết bị</th>
              <th className="cell-status">Trạng thái</th>
              <th className="cell-cost">Chi phí (VNĐ)</th>
              <th className="cell-payer">Người thanh toán</th>
              <th className="cell-date">Ngày tạo</th>
              <th className="cell-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length > 0 ? (
              filteredRequests.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage).map((r, index) => (
                <tr key={r._id}>
                  <td className="cell-stt">{(safePage - 1) * itemsPerPage + index + 1}</td>
                  <td className="cell-tenant">{r.tenantId?.fullname || r.tenantId?.username || '-'}</td>
                  <td className="cell-room">
                    <span className="room-badge">{r.room?.name || r.room?.roomCode || '-'}</span>
                  </td>
                  <td className="cell-device">{r.devicesId?.name || '-'}</td>
                  <td className="cell-status">
                    <span className={`status-badge status-${r.status.toLowerCase()}`}>
                      {getStatusIcon(r.status)}
                      {getStatusLabel(r)}
                    </span>
                  </td>
                  <td className="cell-cost">{r.cost?.toLocaleString('vi-VN') || 0}</td>
                  <td className="cell-payer">Kế toán</td>
                  <td className="cell-date">{formatDate(r.createdDate)}</td>
                  <td className="cell-actions">
                    <div className="table-actions">
                      <button
                        className="btn-icon btn-view"
                        onClick={() => handleViewDetail(r)}
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
                <td colSpan={9} className="table-empty-cell">
                  {loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy yêu cầu bảo trì nào phù hợp.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={handlePageChange}
        />
      </div>

      {/* ==================================================================
          MODALS
          ================================================================== */}

      {/* 1. Modal Chi tiết */}
      <AppModal
        open={!!selectedRequest}
        onClose={handleCloseDetail}
        title="Chi tiết yêu cầu bảo trì"
        icon={<Wrench size={18} />}
        color="teal"
        size="md"
        footer={
          <button type="button" className="ms-btn ms-btn--ghost" onClick={handleCloseDetail}>
            Đóng
          </button>
        }
      >
        {selectedRequest && (
          <div className="rr-detail-body">
            {/* Profile strip */}
            <div className="rr-profile-strip">
              <div className="rr-avatar">
                {(selectedRequest.tenantId?.fullname || selectedRequest.tenantId?.username || '?').charAt(0).toUpperCase()}
              </div>
              <div className="rr-profile-info">
                <div className="rr-profile-name">
                  {selectedRequest.tenantId?.fullname || selectedRequest.tenantId?.username || '-'}
                </div>
                <div className="rr-profile-meta">
                  <span className="rr-meta-tag">{selectedRequest.room?.name || selectedRequest.room?.roomCode || '-'}</span>
                  <span className={`rr-status-tag rr-status-${selectedRequest.status.toLowerCase()}`}>
                    {getStatusIcon(selectedRequest.status)}
                    {getStatusLabel(selectedRequest)}
                  </span>
                </div>
              </div>
            </div>

            {/* Info grid */}
            <div className="rr-two-col">
              <div className="rr-col-left">
                <div className="rr-section">
                  <div className="rr-section-title">
                    <Wrench size={15} />
                    Thông tin cơ bản
                  </div>
                  <div className="rr-rows">
                    <div className="rr-row">
                      <span className="rr-label">Loại</span>
                      <span className="rr-value">{selectedRequest.type}</span>
                    </div>
                    <div className="rr-row">
                      <span className="rr-label">Thiết bị</span>
                      <span className="rr-value">{selectedRequest.devicesId?.name || '-'}</span>
                    </div>
                    <div className="rr-row">
                      <span className="rr-label">Chi phí</span>
                      <span className="rr-value rr-value--amount">
                        {selectedRequest.cost?.toLocaleString('vi-VN') || 0} VNĐ
                      </span>
                    </div>
                    <div className="rr-row">
                      <span className="rr-label">Ngày tạo</span>
                      <span className="rr-value">{formatDate(selectedRequest.createdDate)}</span>
                    </div>
                    <div className="rr-row">
                      <span className="rr-label">Người thanh toán</span>
                      <span className="rr-value">Kế toán</span>
                    </div>
                  </div>
                </div>

                {selectedRequest.notes && (
                  <div className="rr-section">
                    <div className="rr-section-title">
                      <AlertCircle size={15} />
                      Ghi chú
                    </div>
                    <p className="rr-description">{selectedRequest.notes}</p>
                  </div>
                )}

                {selectedRequest.images && selectedRequest.images.length > 0 && (
                  <div className="rr-section">
                    <div className="rr-section-title">
                      <ImageIcon size={15} />
                      Hình ảnh ({selectedRequest.images.length})
                    </div>
                    <div className="rr-images-grid">
                      {selectedRequest.images.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="rr-image-btn"
                          onClick={() => handleOpenImagePreview(url)}
                        >
                          <img src={url} alt={`Ảnh ${idx + 1}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rr-col-right">
                <div className="rr-section">
                  <div className="rr-section-title">
                    <AlertCircle size={15} />
                    Mô tả
                  </div>
                  <p className="rr-description">{selectedRequest.description || '-'}</p>
                </div>

                <div className="rr-section">
                  <div className="rr-section-title">
                    <Clock size={15} />
                    Cập nhật trạng thái
                  </div>
                  <div className="rr-status-row">
                    <select
                      className="rr-status-select"
                      value={selectedRequest.status}
                      onChange={(e) =>
                        handleUpdateStatus(
                          selectedRequest,
                          e.target.value as 'Pending' | 'Processing' | 'Done',
                        )
                      }
                      disabled={
                        updatingId === selectedRequest._id ||
                        selectedRequest.status === 'Done'
                      }
                    >
                      <option value="Pending" disabled={selectedRequest.status !== 'Pending'}>Chờ xử lý</option>
                      <option value="Processing" disabled={selectedRequest.status === 'Done'}>Đang xử lý</option>
                      <option value="Done" disabled={false}>Đã xử lý</option>
                    </select>
                    {updatingId === selectedRequest._id && (
                      <span className="rr-updating-text">Đang cập nhật...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppModal>

      {/* 2. Modal Xem ảnh */}
      <AppModal
        open={!!previewImageUrl}
        onClose={handleCloseImagePreview}
        size="md"
        hideClose
      >
        <div className="rr-image-fullscreen">
          <img src={previewImageUrl || ''} alt="Ảnh yêu cầu" />
        </div>
      </AppModal>

      {/* 3. Modal Xác nhận chuyển trạng thái */}
      <AppModal
        open={showMaintenanceStatusConfirmModal}
        onClose={handleCloseMaintenanceStatusConfirmModal}
        title="Xác nhận chuyển trạng thái"
        icon={<AlertCircle size={18} />}
        color="orange"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="ms-btn ms-btn--ghost"
              onClick={handleCloseMaintenanceStatusConfirmModal}
              disabled={!!updatingId}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              className="ms-btn ms-btn--primary"
              onClick={handleConfirmMaintenanceStatusChange}
              disabled={!!updatingId}
            >
              <Check size={16} />
              Xác nhận
            </button>
          </>
        }
      >
        <div className="rr-confirm-body">
          <p className="rr-confirm-text">
            Bạn có chắc muốn chuyển yêu cầu này sang trạng thái{' '}
            <strong>{pendingMaintenanceStatusChange ? getMaintenanceStatusText(pendingMaintenanceStatusChange.nextStatus) : ''}</strong>?
          </p>
        </div>
      </AppModal>

      {/* 4. Modal Tạo phiếu chi */}
      <AppModal
        open={showPaymentModal}
        onClose={handleClosePaymentModal}
        title="Tạo phiếu chi bảo trì"
        icon={<DollarSign size={18} />}
        color="teal"
        size="md"
        footer={
          <>
            <button
              type="button"
              className="ms-btn ms-btn--ghost"
              onClick={handleClosePaymentModal}
              disabled={updatingId === selectedRequest?._id}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="mm-payment-form"
              className="ms-btn ms-btn--primary"
              disabled={
                updatingId === selectedRequest?._id ||
                !paymentForm.financialAmount ||
                autoPaymentVoucherLoading ||
                !!autoPaymentVoucherError ||
                !autoPaymentVoucher
              }
            >
              <CheckCircle2 size={16} />
              {updatingId === selectedRequest?._id ? 'Đang xử lý...' : 'Hoàn thành'}
            </button>
          </>
        }
      >
        <form id="mm-payment-form" onSubmit={(e) => { e.preventDefault(); handlePaymentSubmit(); }}>
          <div className="ms-field">
            <label className="ms-label">Mã phiếu chi</label>
            <div className="ms-input-wrap">
              <input
                type="text"
                className="ms-input"
                value={
                  autoPaymentVoucherLoading
                    ? 'Đang tạo mã phiếu chi...'
                    : autoPaymentVoucher || 'Chưa tạo được mã phiếu chi'
                }
                readOnly
              />
            </div>
            {autoPaymentVoucherError && (
              <div className="rr-retry-row">
                <span className="ms-error-text">{autoPaymentVoucherError}</span>
                <button
                  type="button"
                  className="ms-btn ms-btn--ghost"
                  onClick={() => {
                    if (autoPaymentVoucherLoading) return;
                    setAutoPaymentVoucher('');
                    setAutoPaymentVoucherError('');
                    (async () => {
                      try {
                        setAutoPaymentVoucherLoading(true);
                        const res = await requestService.getNextMaintenancePaymentVoucher();
                        const code = res?.data?.paymentVoucher;
                        if (!code) throw new Error('Không thể tạo mã phiếu chi');
                        setAutoPaymentVoucher(code);
                      } catch (err: unknown) {
                        const e = err as { response?: { data?: { message?: string } }; message?: string };
                        setAutoPaymentVoucherError(e.response?.data?.message || e.message || 'Không thể tạo mã phiếu chi');
                      } finally {
                        setAutoPaymentVoucherLoading(false);
                      }
                    })();
                  }}
                  disabled={autoPaymentVoucherLoading}
                >
                  Thử lại
                </button>
              </div>
            )}
          </div>

          <div className="ms-field">
            <label className="ms-label">Tiêu đề phiếu chi <span className="ms-label-required">*</span></label>
            <div className="ms-input-wrap">
              <input
                type="text"
                className={`ms-input ${paymentFormErrors.financialTitle ? 'ms-input--error' : ''}`}
                placeholder="Nhập tiêu đề phiếu chi"
                value={paymentForm.financialTitle}
                onChange={(e) => {
                  setPaymentForm((prev) => ({ ...prev, financialTitle: e.target.value }));
                  if (paymentFormErrors.financialTitle) setPaymentFormErrors((prev) => ({ ...prev, financialTitle: '' }));
                }}
              />
            </div>
            {paymentFormErrors.financialTitle && (
              <span className="ms-error-text">{paymentFormErrors.financialTitle}</span>
            )}
          </div>

          <div className="ms-field">
            <label className="ms-label">Tổng số tiền (VNĐ) <span className="ms-label-required">*</span></label>
            <div className="ms-input-wrap ms-input-wrap--prefix">
              <span className="ms-input-prefix">₫</span>
              <input
                type="number"
                className={`ms-input ms-input--prefix ${paymentFormErrors.financialAmount ? 'ms-input--error' : ''}`}
                placeholder="0"
                value={paymentForm.financialAmount}
                onChange={(e) => {
                  setPaymentForm((prev) => ({ ...prev, financialAmount: e.target.value }));
                  if (paymentFormErrors.financialAmount) setPaymentFormErrors((prev) => ({ ...prev, financialAmount: '' }));
                }}
                min="0"
                step="1000"
              />
            </div>
            {paymentFormErrors.financialAmount && (
              <span className="ms-error-text">{paymentFormErrors.financialAmount}</span>
            )}
          </div>
        </form>
      </AppModal>
    </div>
  );
}

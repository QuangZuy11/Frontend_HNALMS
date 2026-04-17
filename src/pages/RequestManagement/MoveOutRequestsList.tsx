import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, FileText, CheckCircle } from 'lucide-react';
import { moveOutService } from '../../services/moveOutService';
import './MoveOutRequestsList.css';

// ─── Types ─────────────────────────────────────────────────────────────────
interface MoveOutRequestItem {
  _id: string;
  contractId?: {
    _id: string;
    contractCode?: string;
    startDate?: string;
    endDate?: string;
    duration?: number;
    rentAmount?: number;
    rentPaidUntil?: string;
    depositId?: string;
    roomId?: {
      _id: string;
      name?: string;
      roomCode?: string;
      floorId?: {
        _id: string;
        name?: string;
      };
    } | string | null;
  } | string | null;
  tenantId?: {
    _id: string;
    username?: string;
    fullName?: string;
    fullname?: string;
    email?: string;
    phoneNumber?: string;
    cccd?: string;
  } | null;
  finalInvoiceId?: {
    _id: string;
    invoiceCode?: string;
    totalAmount?: number;
    status?: string;
    dueDate?: string;
    title?: string;
    items?: Array<{
      itemName?: string;
      usage?: number;
      unitPrice?: number;
      amount?: number;
      oldIndex?: number;
      newIndex?: number;
      isIndex?: boolean;
    }>;
  } | string | null;
  requestDate?: string;
  expectedMoveOutDate?: string;
  reason?: string;
  status: 'Requested' | 'InvoiceReleased' | 'Paid' | 'Completed' | 'Cancelled';
  isEarlyNotice?: boolean;
  isUnderMinStay?: boolean;
  isDepositForfeited?: boolean;
  isGapContract?: boolean;
  managerInvoiceNotes?: string;
  accountantNotes?: string;
  paymentMethod?: string;
  paymentTransactionCode?: string;
  paymentDate?: string;
  depositRefundAmount?: number;
  completedDate?: string;
  managerCompletionNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DepositVsInvoice {
  depositId?: string | null;
  depositAmount: number;
  invoiceAmount: number;
  depositRefundAmount: number;
  remainingToPay?: number;
  isDepositForfeited: boolean;
  refundTicket?: {
    id?: string;
    amount?: number;
    status?: string;
    paymentVoucher?: string;
  } | null;
}

interface ReleaseSettlement {
  depositAmount?: number;
  invoiceAmount?: number;
  depositRefundAmount?: number;
  remainingToPay?: number;
  isDepositForfeited?: boolean;
  refundTicket?: {
    id?: string;
    amount?: number;
    status?: string;
    paymentVoucher?: string;
  } | null;
}

type StatusFilter = 'ALL' | 'Requested' | 'InvoiceReleased' | 'Paid' | 'Completed' | 'Cancelled';

// ─── Constants ──────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  Requested: 'Chờ phát hành HĐ',
  InvoiceReleased: 'Đã phát hành HĐ',
  Paid: 'Đã thanh toán',
  Completed: 'Đã hoàn tất',
  Cancelled: 'Đã hủy',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  Requested: 'status-requested',
  InvoiceReleased: 'status-invoicereleased',
  Paid: 'status-paid',
  Completed: 'status-completed',
  Cancelled: 'status-cancelled',
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatMoney = (amount?: number) => {
  if (amount === undefined || amount === null) return '-';
  return amount.toLocaleString('vi-VN') + ' VND';
};

const normalizeReleaseSettlement = (
  settlement: ReleaseSettlement,
  _isDepositForfeited?: boolean
): ReleaseSettlement => {
  // Backend mới KHÔNG cấn trừ cọc nữa — tenant thanh toán hóa đơn riêng,
  // hoàn cọc xử lý riêng. Chỉ cần pass-through và tính remainingToPay = invoiceAmount.
  const invoiceAmount = settlement.invoiceAmount ?? 0;
  return {
    ...settlement,
    remainingToPay: invoiceAmount,
  };
};

export default function MoveOutRequestsList() {
  const [requests, setRequests] = useState<MoveOutRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const tableRef = useRef<HTMLDivElement | null>(null);

  // ── Notification toast ───────────────────────────────────────────────────────
  const [notificationToast, setNotificationToast] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  } | null>(null);

  const showToast = useCallback((type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setNotificationToast({ type, title, message });
    setTimeout(() => setNotificationToast(null), 4000);
  }, []);

  // ── Detail modal ──────────────────────────────────────────────────────────
  const [selectedRequest, setSelectedRequest] = useState<MoveOutRequestItem | null>(null);
  const [depositComparison, setDepositComparison] = useState<DepositVsInvoice | null>(null);

  // ── Release Invoice modal ─────────────────────────────────────────────────
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releasingRequest, setReleasingRequest] = useState<MoveOutRequestItem | null>(null);
  const [electricIndex, setElectricIndex] = useState<string>('');
  const [waterIndex, setWaterIndex] = useState<string>('');
  const [oldElectricIndex, setOldElectricIndex] = useState<{ oldIndex: number; newIndex: number } | null>(null);
  const [oldWaterIndex, setOldWaterIndex] = useState<{ oldIndex: number; newIndex: number } | null>(null);
  const [oldIndexLoading, setOldIndexLoading] = useState(false);
  const [oldIndexError, setOldIndexError] = useState('');
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseError, setReleaseError] = useState('');
  const [releaseSettlement, setReleaseSettlement] = useState<ReleaseSettlement | null>(null);

  // ── Complete modal ────────────────────────────────────────────────────────
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingRequest, setCompletingRequest] = useState<MoveOutRequestItem | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [completeLoading, setCompleteLoading] = useState(false);

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await moveOutService.getAllMoveOutRequests({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search || undefined,
        page: currentPage,
        limit: itemsPerPage,
      });
      if (res.success && Array.isArray(res.data)) {
        setRequests(res.data);
        setTotalItems(res.pagination?.totalCount ?? res.total ?? 0);
        setTotalPages(res.pagination?.totalPages ?? res.totalPages ?? 0);
      } else {
        setRequests([]);
        setTotalItems(0);
        setTotalPages(0);
      }
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      setError(anyErr?.response?.data?.message || 'Không thể tải danh sách yêu cầu trả phòng');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, currentPage, itemsPerPage]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => { setCurrentPage(1); }, [statusFilter, search]);

  // ─── Control body overflow when modal opens ───────────────────────────────
  useEffect(() => {
    const hasOpenModal = selectedRequest || showReleaseModal || showCompleteModal;
    if (hasOpenModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedRequest, showReleaseModal, showCompleteModal]);

  // ─── Event handlers ───────────────────────────────────────────────────────
  const handleSearch = () => setSearch(searchInput);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const getTenantFullName = (req: MoveOutRequestItem) =>
    req.tenantId?.fullName || req.tenantId?.fullname || req.tenantId?.username || '-';

  const getRoomNumber = (req: MoveOutRequestItem) => {
    if (req.contractId && typeof req.contractId === 'object') {
      if (req.contractId.roomId && typeof req.contractId.roomId === 'object') {
        return req.contractId.roomId.name || req.contractId.roomId.roomCode || '-';
      }
    }
    return '-';
  };

  const getRoomId = (req: MoveOutRequestItem): string | null => {
    if (!req.contractId || typeof req.contractId !== 'object') return null;
    const roomRef = req.contractId.roomId;
    if (!roomRef) return null;
    if (typeof roomRef === 'string') return roomRef;
    return roomRef._id ?? null;
  };

  const getContractCode = (req: MoveOutRequestItem) => {
    if (req.contractId && typeof req.contractId === 'object') {
      return req.contractId.contractCode || '-';
    }
    return '-';
  };

  const getTenantEmail = (req: MoveOutRequestItem) => {
    if (req.tenantId && typeof req.tenantId === 'object') {
      return req.tenantId.email || '-';
    }
    return '-';
  };

  const getTenantPhone = (req: MoveOutRequestItem) => {
    if (req.tenantId && typeof req.tenantId === 'object') {
      return req.tenantId.phoneNumber || '-';
    }
    return '-';
  };

  // ── Open detail + load comparison ─────────────────────────────────────────
  const openDetail = async (req: MoveOutRequestItem) => {
    try {
      setLoading(true);
      const res = await moveOutService.getMoveOutRequestById(req._id);
      if (res.success && res.data) {
        setSelectedRequest(res.data);
      } else {
        setSelectedRequest(req);
      }
    } catch {
      setSelectedRequest(req);
    } finally {
      setLoading(false);
    }
    setDepositComparison(null);
    try {
      const res = await moveOutService.getDepositVsInvoice(req._id);
      if (res.success && res.data) setDepositComparison(res.data);
    } catch {
      /* not critical */
    }
  };

  // ── Release Invoice ───────────────────────────────────────────────────────
  const openReleaseModal = async (req: MoveOutRequestItem) => {
    // Validate: ngày hiện tại phải nằm trong khoảng từ requestDate đến endDate
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const reqDate = new Date(req.requestDate ?? '');
    reqDate.setHours(0, 0, 0, 0);

    const contractEndDate = typeof req.contractId === 'object' && req.contractId?.endDate
      ? new Date(req.contractId.endDate)
      : null;
    if (contractEndDate) contractEndDate.setHours(0, 0, 0, 0);

    if (!contractEndDate || todayMs < reqDate.getTime() || todayMs > contractEndDate.getTime()) {
      const reqDateStr = reqDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const endDateStr = contractEndDate ? contractEndDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '?';
      const todayStr = today.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      showToast('warning', 'Chưa đến thời điểm phát hành', `Chỉ có thể phát hành hóa đơn từ ngày ${reqDateStr} đến ngày kết thúc hợp đồng (${endDateStr}). Hôm nay là ${todayStr}.`);
      return;
    }

    setReleasingRequest(req);
    setElectricIndex('');
    setWaterIndex('');
    setOldElectricIndex(null);
    setOldWaterIndex(null);
    setOldIndexError('');
    setReleaseError('');
    setReleaseSettlement(null);
    setShowReleaseModal(true);

    const roomId = getRoomId(req);
    if (!roomId) {
      setOldIndexError('Không xác định được phòng để tải chỉ số cũ.');
      return;
    }

    try {
      setOldIndexLoading(true);
      const servicesRes = await moveOutService.getUtilityServices();
      const serviceList = Array.isArray(servicesRes?.data) ? servicesRes.data : [];

      const electricService = serviceList.find((s: { _id?: string; name?: string; serviceName?: string }) =>
        ['điện', 'dien'].includes((s.name || s.serviceName || '').trim().toLowerCase())
      );
      const waterService = serviceList.find((s: { _id?: string; name?: string; serviceName?: string }) =>
        ['nước', 'nuoc'].includes((s.name || s.serviceName || '').trim().toLowerCase())
      );

      const [electricReadingRes, waterReadingRes] = await Promise.all([
        electricService?._id
          ? moveOutService.getLatestMeterReading(roomId, electricService._id).catch(() => null)
          : Promise.resolve(null),
        waterService?._id
          ? moveOutService.getLatestMeterReading(roomId, waterService._id).catch(() => null)
          : Promise.resolve(null),
      ]);

      const electricReading = electricReadingRes?.data;
      const waterReading = waterReadingRes?.data;

      if (electricReading && typeof electricReading.oldIndex === 'number' && typeof electricReading.newIndex === 'number') {
        setOldElectricIndex({ oldIndex: electricReading.oldIndex, newIndex: electricReading.newIndex });
      }
      if (waterReading && typeof waterReading.oldIndex === 'number' && typeof waterReading.newIndex === 'number') {
        setOldWaterIndex({ oldIndex: waterReading.oldIndex, newIndex: waterReading.newIndex });
      }
    } catch {
      setOldIndexError('Không tải được chỉ số điện nước cũ.');
    } finally {
      setOldIndexLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!releasingRequest) return;

    const payload: {
      electricIndex?: number;
      waterIndex?: number;
    } = {};
    if (electricIndex !== '') {
      const ei = Number(electricIndex);
      if (isNaN(ei) || ei < 0) {
        setReleaseError('Chỉ số điện phải là số không âm');
        return;
      }
      payload.electricIndex = ei;
    }
    if (waterIndex !== '') {
      const wi = Number(waterIndex);
      if (isNaN(wi) || wi < 0) {
        setReleaseError('Chỉ số nước phải là số không âm');
        return;
      }
      payload.waterIndex = wi;
    }

    try {
      setReleaseLoading(true);
      setReleaseError('');
      const res = await moveOutService.releaseFinalInvoice(releasingRequest._id, payload);
      if (res.success && res.data?.settlement) {
        setReleaseSettlement(res.data.settlement);
      }
      fetchRequests();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      setReleaseError(anyErr?.response?.data?.message || 'Phát hành hóa đơn thất bại');
    } finally {
      setReleaseLoading(false);
    }
  };

  // ── Complete Move-Out ─────────────────────────────────────────────────────
  const openCompleteModal = (req: MoveOutRequestItem) => {
    setCompletingRequest(req);
    setCompletionNote('');
    setShowCompleteModal(true);
  };

  const handleComplete = async () => {
    if (!completingRequest) return;
    try {
      setCompleteLoading(true);
      await moveOutService.completeMoveOutRequest(completingRequest._id, {
        managerCompletionNotes: completionNote || undefined,
      });
      setShowCompleteModal(false);
      setCompletingRequest(null);
      fetchRequests();
      if (selectedRequest?._id === completingRequest._id) {
        setSelectedRequest(null);
      }
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Thao tác thất bại', anyErr?.response?.data?.message || 'Hoàn tất trả phòng thất bại');
    } finally {
      setCompleteLoading(false);
    }
  };

  const normalizedReleaseSettlement = releaseSettlement
    ? normalizeReleaseSettlement(releaseSettlement, releasingRequest?.isDepositForfeited)
    : null;

  // ─── Pagination ───────────────────────────────────────────────────────────
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return (
      <div className="mo-pagination">
        <div className="mo-pagination-info">
          <span>Tổng <strong>{totalItems}</strong> yêu cầu</span>
          <div className="mo-pagination-items-per-page">
            <label>Hiển thị:</label>
            <select
              className="mo-pagination-select"
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            >
              {[10, 20, 50].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="mo-pagination-controls">
          <button className="pagination-arrow-btn" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>‹</button>
          {pages.map((p, i) =>
            p === 'ellipsis'
              ? <span key={`e-${i}`} className="mo-pagination-ellipsis">…</span>
              : <button key={p} className={`mo-pagination-number${currentPage === p ? ' active' : ''}`} onClick={() => handlePageChange(p as number)}>{p}</button>
          )}
          <button className="pagination-arrow-btn" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>›</button>
        </div>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="mo-page">
      {/* ── Notification Toast ──────────────────────────────────────────── */}
      {notificationToast && (
        <div className="notification-toast-wrapper">
          <div className={`notification-toast toast-${notificationToast.type}`}>
            <div className="notification-toast-icon">
              <div className="notification-toast-icon-badge">
                {notificationToast.type === 'success' && '✓'}
                {notificationToast.type === 'error' && '✕'}
                {notificationToast.type === 'warning' && '⚠'}
                {notificationToast.type === 'info' && 'i'}
              </div>
              <div className="notification-toast-title">{notificationToast.title}</div>
            </div>
            <div className="notification-toast-message">{notificationToast.message}</div>
            <div className="notification-toast-actions">
              <button className="notification-toast-close" onClick={() => setNotificationToast(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mo-card">
        {/* Header */}
        <div className="mo-header">
          <div>
            <h1>Yêu cầu trả phòng</h1>
            <p className="subtitle">Quản lý các yêu cầu trả phòng của cư dân</p>
          </div>
          <button className="btn-refresh" onClick={fetchRequests} disabled={loading}>
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>

        {/* Filters */}
        <div className="mo-filters">
          <div className="mo-filter-group">
            <label className="mo-filter-label">Trạng thái:</label>
            <select
              className="mo-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="ALL">Tất cả</option>
              <option value="Requested">Chờ phát hành HĐ</option>
              <option value="InvoiceReleased">Đã phát hành HĐ</option>
              <option value="Paid">Đã thanh toán</option>
              <option value="Completed">Đã hoàn tất</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
          </div>
          <div className="mo-search-group">
            <input
              type="text"
              className="mo-search-input"
              placeholder="Tìm kiếm theo tên cư dân..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="btn-search" onClick={handleSearch}>Tìm kiếm</button>
          </div>
        </div>

        {error && <div className="mo-error">{error}</div>}

        {/* Table */}
        <div className="mo-table-wrap" ref={tableRef}>
          {loading ? (
            <div className="mo-loading">Đang tải dữ liệu...</div>
          ) : requests.length === 0 ? (
            <div className="mo-empty">Không có yêu cầu trả phòng nào phù hợp.</div>
          ) : (
            <table className="mo-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Cư dân</th>
                  <th>Phòng</th>
                  <th>Lý do</th>
                  <th>Ngày yêu cầu</th>
                  <th>Ngày trả phòng</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req, idx) => (
                  <tr key={req._id}>
                    <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td><span className="cell-title">{getTenantFullName(req)}</span></td>
                    <td>{getRoomNumber(req)}</td>
                    <td>{req.reason ? (req.reason.length > 40 ? req.reason.substring(0, 40) + '...' : req.reason) : '-'}</td>
                    <td>{formatDate(req.requestDate ?? req.createdAt)}</td>
                    <td>{formatDate(req.expectedMoveOutDate)}</td>
                    <td>
                      <span className={`status-badge ${STATUS_BADGE_CLASS[req.status] ?? ''}`}>
                        {STATUS_LABELS[req.status] ?? req.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {/* View detail */}
                        <button
                          className="btn-view-detail"
                          title="Xem chi tiết"
                          onClick={() => openDetail(req)}
                        >
                          <Eye size={16} />
                        </button>

                        {/* Step 2: Release final invoice */}
                        {req.status === 'Requested' && (
                          <button
                            className="btn-release-invoice"
                            title="Phát hành hóa đơn cuối"
                            onClick={() => openReleaseModal(req)}
                          >
                            <FileText size={15} />
                          </button>
                        )}

                        {req.status === 'Paid' && (
                          <button
                            className="btn-approve"
                            title="Hoàn tất trả phòng"
                            onClick={() => openCompleteModal(req)}
                          >
                            <CheckCircle size={15} />
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {renderPagination()}
      </div>

      {/* ── Detail Modal ──────────────────────────────────────────────────── */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content modal-content--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Chi tiết yêu cầu trả phòng</h2>
              <button className="btn-close" onClick={() => setSelectedRequest(null)}>×</button>
            </div>
            <div className="modal-body">
              {/* ── 1. Thông tin hợp đồng ── */}
              <div className="detail-section">
                <div className="detail-section-title">1. Thông tin hợp đồng</div>
                <div className="detail-grid">
                  <div className="detail-row">
                    <label>Mã hợp đồng:</label>
                    <span>{getContractCode(selectedRequest)}</span>
                  </div>
                  {selectedRequest.contractId && typeof selectedRequest.contractId === 'object' && (
                    <>
                      {selectedRequest.contractId.startDate && (
                        <div className="detail-row">
                          <label>Ngày bắt đầu:</label>
                          <span>{formatDate(selectedRequest.contractId.startDate)}</span>
                        </div>
                      )}
                      {selectedRequest.contractId.endDate && (
                        <div className="detail-row">
                          <label>Ngày kết thúc:</label>
                          <span>{formatDate(selectedRequest.contractId.endDate)}</span>
                        </div>
                      )}
                      {selectedRequest.contractId.duration && (
                        <div className="detail-row">
                          <label>Thời hạn:</label>
                          <span>{selectedRequest.contractId.duration} tháng</span>
                        </div>
                      )}
                      {selectedRequest.contractId.rentAmount !== undefined && (
                        <div className="detail-row">
                          <label>Tiền thuê/tháng:</label>
                          <span>{formatMoney(selectedRequest.contractId.rentAmount)}</span>
                        </div>
                      )}
                      {selectedRequest.contractId.rentPaidUntil && (
                        <div className="detail-row">
                          <label>Tiền phòng đã thanh toán đến:</label>
                          <span>{formatDate(selectedRequest.contractId.rentPaidUntil)}</span>
                        </div>
                      )}
                      {typeof selectedRequest.contractId.roomId === 'object' && selectedRequest.contractId.roomId && (
                        <>
                          <div className="detail-row">
                            <label>Tầng:</label>
                            <span>
                              {typeof selectedRequest.contractId.roomId.floorId === 'object' && selectedRequest.contractId.roomId.floorId?.name
                                ? selectedRequest.contractId.roomId.floorId.name
                                : (selectedRequest.contractId.roomId as any)?.floorId?.name ?? '-'}
                            </span>
                          </div>
                          <div className="detail-row">
                            <label>Phòng:</label>
                            <span>{selectedRequest.contractId.roomId.name || selectedRequest.contractId.roomId.roomCode || '-'}</span>
                          </div>
                          <div className="detail-row">
                            <label>Mã phòng:</label>
                            <span>{selectedRequest.contractId.roomId.roomCode ?? '-'}</span>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* ── 2. Thông tin cư dân ── */}
              <div className="detail-section">
                <div className="detail-section-title">2. Thông tin cư dân</div>
                <div className="detail-grid">
                  <div className="detail-row">
                    <label>Tên cư dân:</label>
                    <span>{getTenantFullName(selectedRequest)}</span>
                  </div>
                  <div className="detail-row">
                    <label>Tên đăng nhập:</label>
                    <span>{(selectedRequest.tenantId as any)?.username ?? '-'}</span>
                  </div>
                  <div className="detail-row">
                    <label>Email:</label>
                    <span>{getTenantEmail(selectedRequest)}</span>
                  </div>
                  <div className="detail-row">
                    <label>SĐT:</label>
                    <span>{getTenantPhone(selectedRequest)}</span>
                  </div>
                  <div className="detail-row">
                    <label>CCCD:</label>
                    <span>{(selectedRequest.tenantId as any)?.cccd ?? '-'}</span>
                  </div>
                </div>
              </div>

              {/* ── 3. Thông tin yêu cầu trả phòng ── */}
              <div className="detail-section">
                <div className="detail-section-title">3. Thông tin yêu cầu trả phòng</div>
                <div className="detail-grid">
                  <div className="detail-row">
                    <label>Ngày tạo yêu cầu:</label>
                    <span>{formatDate(selectedRequest.createdAt)}</span>
                  </div>
                  <div className="detail-row">
                    <label>Ngày yêu cầu trả phòng:</label>
                    <span>{formatDate(selectedRequest.requestDate ?? selectedRequest.createdAt)}</span>
                  </div>
                  <div className="detail-row">
                    <label>Ngày trả phòng:</label>
                    <span>{formatDate(selectedRequest.expectedMoveOutDate)}</span>
                  </div>
                  <div className="detail-row">
                    <label>Trạng thái:</label>
                    <span className={`status-badge ${STATUS_BADGE_CLASS[selectedRequest.status] ?? ''}`}>
                      {STATUS_LABELS[selectedRequest.status] ?? selectedRequest.status}
                    </span>
                  </div>
                  <div className="detail-row">
                    <label>Lý do trả phòng:</label>
                    <span>{selectedRequest.reason ?? '-'}</span>
                  </div>
                </div>
              </div>

              {/* ── 4. Thông tin tiền + Điều kiện hoàn cọc ── */}
              <div className="detail-section">
                <div className="detail-section-title">4. Thông tin tiền & Điều kiện hoàn cọc</div>
                <div className="detail-grid">
                  {/* Hóa đơn cuối */}
                  {selectedRequest.finalInvoiceId && typeof selectedRequest.finalInvoiceId === 'object' && (
                    <>
                      <div className="detail-row">
                        <label>Mã hóa đơn cuối:</label>
                        <span>{(selectedRequest.finalInvoiceId as any)?.invoiceCode ?? '-'}</span>
                      </div>
                      {(selectedRequest.finalInvoiceId as any)?.title && (
                        <div className="detail-row">
                          <label>Tên hóa đơn:</label>
                          <span>{(selectedRequest.finalInvoiceId as any).title}</span>
                        </div>
                      )}
                      {(selectedRequest.finalInvoiceId as any)?.totalAmount !== undefined && (
                        <div className="detail-row">
                          <label>Tổng tiền hóa đơn:</label>
                          <span className="text-danger">{formatMoney((selectedRequest.finalInvoiceId as any).totalAmount)}</span>
                        </div>
                      )}
                      {depositComparison?.remainingToPay !== undefined && (
                        <div className="detail-row">
                          <label>Tiền tenant phải thanh toán:</label>
                          <span className="text-danger">{formatMoney(depositComparison.remainingToPay)}</span>
                        </div>
                      )}
                      <div className="detail-row">
                        <label>Trạng thái hóa đơn:</label>
                        <span>{(selectedRequest.finalInvoiceId as any)?.status ?? '-'}</span>
                      </div>
                      {(selectedRequest.finalInvoiceId as any)?.dueDate && (
                        <div className="detail-row">
                          <label>Ngày đến hạn:</label>
                          <span>{formatDate((selectedRequest.finalInvoiceId as any).dueDate)}</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Tiền cọc */}
                  {depositComparison && (
                    <div className="detail-row">
                      <label>Số tiền cọc hiện giữ:</label>
                      <span>{formatMoney(depositComparison.depositAmount)}</span>
                    </div>
                  )}
                  {(() => {
                    // Case 1: Không mất cọc → depositRefundAmount đã gộp cọc + prepaid
                    const totalRefund = (selectedRequest.depositRefundAmount ?? 0) > 0
                      ? selectedRequest.depositRefundAmount
                      // Case 2: Mất cọc nhưng còn tiền phòng trả trước
                      : (selectedRequest as any).prepaidRentOverpay > 0
                        ? (selectedRequest as any).prepaidRentOverpay
                        : null;
                    return totalRefund != null && totalRefund > 0 ? (
                      <div className="detail-row">
                        <label>Tổng tiền được hoàn:</label>
                        <span className="text-ok">{formatMoney(totalRefund)}</span>
                      </div>
                    ) : null;
                  })()}

                  {/* Thanh toán */}
                  {selectedRequest.status === 'Paid' && (
                    <>
                      {selectedRequest.paymentMethod && (
                        <div className="detail-row">
                          <label>Hình thức thanh toán:</label>
                          <span>{selectedRequest.paymentMethod === 'online' ? 'Online' : 'Offline (tiền mặt)'}</span>
                        </div>
                      )}
                      {selectedRequest.paymentTransactionCode && (
                        <div className="detail-row">
                          <label>Mã giao dịch:</label>
                          <span>{selectedRequest.paymentTransactionCode}</span>
                        </div>
                      )}
                      {selectedRequest.paymentDate && (
                        <div className="detail-row">
                          <label>Ngày thanh toán:</label>
                          <span>{formatDate(selectedRequest.paymentDate)}</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Hoàn tất */}
                  {selectedRequest.status === 'Completed' && selectedRequest.completedDate && (
                    <div className="detail-row">
                      <label>Ngày hoàn tất:</label>
                      <span>{formatDate(selectedRequest.completedDate)}</span>
                    </div>
                  )}

                  {/* Điều kiện hoàn cọc */}
                  <div className="detail-row">
                    <label>Báo gấp (dưới 30 ngày):</label>
                    <span className={selectedRequest.isEarlyNotice ? 'text-danger' : 'text-ok'}>
                      {selectedRequest.isEarlyNotice ? '⚠ Có' : '✓ Không'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <label>Ở chưa đủ 6 tháng:</label>
                    <span className={selectedRequest.isUnderMinStay ? 'text-danger' : 'text-ok'}>
                      {selectedRequest.isUnderMinStay ? '⚠ Có' : '✓ Không'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <label>Tình trạng cọc:</label>
                    <span className={selectedRequest.isDepositForfeited ? 'text-danger' : 'text-ok'}>
                      {selectedRequest.isDepositForfeited ? '❌ Mất cọc' : '✓ Được hoàn cọc'}
                    </span>
                  </div>
                  {selectedRequest.isGapContract && (
                    <div className="detail-row">
                      <label>Gap Contract:</label>
                      <span className="text-ok">✓ Luôn được hoàn cọc</span>
                    </div>
                  )}
                </div>

                {/* Chi tiết hóa đơn */}
                {selectedRequest.finalInvoiceId && typeof selectedRequest.finalInvoiceId === 'object' && (selectedRequest.finalInvoiceId as any)?.items?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>Chi tiết hóa đơn:</label>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6, fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>STT</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Nội dung</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #e2e8f0' }}>SL</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #e2e8f0' }}>Đơn giá</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #e2e8f0' }}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedRequest.finalInvoiceId as any).items.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>{idx + 1}</td>
                            <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>{item.itemName}</td>
                            <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{item.usage ?? '-'}</td>
                            <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{item.unitPrice !== undefined ? formatMoney(item.unitPrice) : '-'}</td>
                            <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{item.amount !== undefined ? formatMoney(item.amount) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── 5. Kết quả cấn trừ cọc ── */}
              {depositComparison && (
                <div className="detail-section" style={{ marginTop: 8 }}>
                  <div className="detail-section-title">5. Kết quả cấn trừ cọc</div>
                  <div className="detail-grid">
                    {depositComparison.invoiceAmount !== undefined && (
                      <div className="detail-row">
                        <label>Hóa đơn cuối (tiền tenant trả):</label>
                        <span>{formatMoney(depositComparison.invoiceAmount)}</span>
                      </div>
                    )}
                    {depositComparison.remainingToPay !== undefined && (
                      <div className="detail-row">
                        <label>Hóa đơn cần thanh toán:</label>
                        <span className={depositComparison.remainingToPay > 0 ? 'text-danger' : 'text-ok'}>
                          {formatMoney(depositComparison.remainingToPay)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Ghi chú ── */}
              {(selectedRequest.managerInvoiceNotes || selectedRequest.accountantNotes || selectedRequest.managerCompletionNotes) && (
                <div className="detail-section">
                  <div className="detail-section-title">Ghi chú</div>
                  <div className="detail-grid">
                    {selectedRequest.managerInvoiceNotes && (
                      <div className="detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <label>Ghi chú phát hành HĐ:</label>
                        <span style={{ marginTop: 4, color: '#374151', fontSize: 13 }}>{selectedRequest.managerInvoiceNotes}</span>
                      </div>
                    )}
                    {selectedRequest.accountantNotes && (
                      <div className="detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <label>Ghi chú kế toán:</label>
                        <span style={{ marginTop: 4, color: '#374151', fontSize: 13 }}>{selectedRequest.accountantNotes}</span>
                      </div>
                    )}
                    {selectedRequest.managerCompletionNotes && (
                      <div className="detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <label>Ghi chú hoàn tất:</label>
                        <span style={{ marginTop: 4, color: '#374151', fontSize: 13 }}>{selectedRequest.managerCompletionNotes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons inside detail modal */}
              <div className="detail-actions">
                {selectedRequest.status === 'Requested' && (() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const todayMs = today.getTime();

                  const reqDate = new Date(selectedRequest.requestDate ?? '');
                  reqDate.setHours(0, 0, 0, 0);

                  const contractEndDate = typeof selectedRequest.contractId === 'object' && selectedRequest.contractId?.endDate
                    ? new Date(selectedRequest.contractId.endDate)
                    : null;
                  if (contractEndDate) contractEndDate.setHours(0, 0, 0, 0);

                  const canRelease = contractEndDate && todayMs >= reqDate.getTime() && todayMs <= contractEndDate.getTime();

                  const reqDateStr = reqDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const endDateStr = contractEndDate ? contractEndDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '?';
                  const todayStr = today.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

                  return (
                    <button
                      className="btn-action-primary"
                      onClick={() => {
                        if (!canRelease) {
                          showToast('warning', 'Chưa đến thời điểm phát hành', `Chỉ có thể phát hành hóa đơn từ ngày ${reqDateStr} đến ngày kết thúc hợp đồng (${endDateStr}). Hôm nay là ${todayStr}.`);
                          return;
                        }
                        setSelectedRequest(null);
                        openReleaseModal(selectedRequest);
                      }}
                      title={canRelease ? 'Phát hành hóa đơn cuối' : `Chỉ được phát hành từ ${reqDateStr} đến ${endDateStr}`}
                    >
                      <FileText size={14} /> Phát hành hóa đơn cuối
                    </button>
                  );
                })()}
                {(() => {
                  if (selectedRequest.status !== 'Paid') return null;
                  
                  const reqExpectedMoveOutDate = selectedRequest.expectedMoveOutDate ? new Date(selectedRequest.expectedMoveOutDate) : null;
                  if (reqExpectedMoveOutDate) reqExpectedMoveOutDate.setHours(0, 0, 0, 0);
                  const canComplete = reqExpectedMoveOutDate && todayMs >= reqExpectedMoveOutDate.getTime();
                  const expectedDateStr = reqExpectedMoveOutDate ? reqExpectedMoveOutDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '?';

                  return (
                    <button
                      className={canComplete ? "btn-action-green" : "btn-action-green disabled-look"}
                      style={!canComplete ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                      onClick={() => { 
                        if (!canComplete) {
                          showToast('warning', 'Chưa đến thời điểm hoàn tất', `Chỉ có thể hoàn tất quy trình từ ngày trả phòng (${expectedDateStr}) trở đi. Hôm nay là ${todayStr}.`);
                          return;
                        }
                        setSelectedRequest(null); 
                        openCompleteModal(selectedRequest); 
                      }}
                      title={canComplete ? 'Hoàn tất trả phòng' : `Chỉ được hoàn tất từ ngày ${expectedDateStr}`}
                    >
                      <CheckCircle size={14} /> Hoàn tất trả phòng
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Release Invoice Modal ─────────────────────────────────────────── */}
      {showReleaseModal && releasingRequest && (
        <div className="modal-overlay" onClick={() => setShowReleaseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>[STEP 2] Phát hành hóa đơn cuối</h2>
              <button className="btn-close" onClick={() => setShowReleaseModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid" style={{ marginBottom: 16 }}>
                <div className="detail-row">
                  <label>Cư dân:</label>
                  <span>{getTenantFullName(releasingRequest)}</span>
                </div>
                <div className="detail-row">
                  <label>Phòng:</label>
                  <span>{getRoomNumber(releasingRequest)}</span>
                </div>
                <div className="detail-row">
                  <label>Ngày trả phòng:</label>
                  <span>{formatDate(releasingRequest.expectedMoveOutDate)}</span>
                </div>
              </div>
              <div className="detail-grid" style={{ marginBottom: 16 }}>
                <div className="detail-row">
                  <label>Chỉ số điện cũ:</label>
                  <span>
                    {oldIndexLoading
                      ? 'Đang tải...'
                      : oldElectricIndex
                        ? `${oldElectricIndex.newIndex}`
                        : '-'}
                  </span>
                </div>
                <div className="detail-row">
                  <label>Chỉ số nước cũ:</label>
                  <span>
                    {oldIndexLoading
                      ? 'Đang tải...'
                      : oldWaterIndex
                        ? `${oldWaterIndex.newIndex}`
                        : '-'}
                  </span>
                </div>
              </div>
              {normalizedReleaseSettlement && (
                <div className="detail-section" style={{ marginTop: 8 }}>
                  <div className="detail-section-title">Kết quả cấn trừ cọc</div>
                  <div className="detail-grid">
                    {normalizedReleaseSettlement.depositAmount !== undefined && (
                      <div className="detail-row">
                        <label>Tiền cọc:</label>
                        <span>{formatMoney(normalizedReleaseSettlement.depositAmount)}</span>
                      </div>
                    )}
                    {normalizedReleaseSettlement.invoiceAmount !== undefined && (
                      <div className="detail-row">
                        <label>Hóa đơn cuối (tiền tenant trả):</label>
                        <span>{formatMoney(normalizedReleaseSettlement.invoiceAmount)}</span>
                      </div>
                    )}
                    {normalizedReleaseSettlement.remainingToPay !== undefined && (
                      <div className="detail-row">
                        <label>Hóa đơn cần thanh toán:</label>
                        <span className={normalizedReleaseSettlement.remainingToPay > 0 ? 'text-danger' : 'text-ok'}>
                          {formatMoney(normalizedReleaseSettlement.remainingToPay)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {oldIndexError && <div className="mo-error" style={{ marginBottom: 8 }}>{oldIndexError}</div>}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Chỉ số điện chốt (tùy chọn):</label>
                <input
                  type="number"
                  className="form-input"
                  value={electricIndex}
                  onChange={(e) => setElectricIndex(e.target.value)}
                  placeholder="VD: 1450"
                  min="0"
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Chỉ số nước chốt (tùy chọn):</label>
                <input
                  type="number"
                  className="form-input"
                  value={waterIndex}
                  onChange={(e) => setWaterIndex(e.target.value)}
                  placeholder="VD: 320"
                  min="0"
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>
              {releaseError && <div className="mo-error" style={{ marginTop: 8 }}>{releaseError}</div>}
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowReleaseModal(false);
                  setReleasingRequest(null);
                }}
              >
                {releaseSettlement ? 'Đóng' : 'Hủy'}
              </button>
              {!releaseSettlement && (
                <button className="btn-action-primary btn-modal-action" onClick={handleRelease} disabled={releaseLoading}>
                  {releaseLoading ? 'Đang xử lý...' : 'Phát hành hóa đơn'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Complete Move-Out Modal ───────────────────────────────────────── */}
      {showCompleteModal && completingRequest && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>[STEP 3] Hoàn tất trả phòng</h2>
              <button className="btn-close" onClick={() => setShowCompleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="info-box info-box--orange">
                <p>Xác nhận hoàn tất sẽ kết thúc quy trình trả phòng cho cư dân này.</p>
              </div>
              <div className="detail-grid" style={{ marginBottom: 16 }}>
                <div className="detail-row">
                  <label>Cư dân:</label>
                  <span>{getTenantFullName(completingRequest)}</span>
                </div>
                <div className="detail-row">
                  <label>Phòng:</label>
                  <span>{getRoomNumber(completingRequest)}</span>
                </div>
                <div className="detail-row">
                  <label>Ngày trả phòng:</label>
                  <span>{formatDate(completingRequest.expectedMoveOutDate)}</span>
                </div>
              </div>
              <div className="form-group">
                <label>Ghi chú hoàn tất (tùy chọn):</label>
                <textarea
                  className="form-textarea"
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="Nhập ghi chú hoàn tất (nếu có)..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCompleteModal(false)} disabled={completeLoading}>Hủy</button>
              <button className="btn-action-green btn-modal-action" onClick={handleComplete} disabled={completeLoading}>
                {completeLoading ? 'Đang xử lý...' : 'Xác nhận hoàn tất'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, CheckCircle, FileText, Banknote } from 'lucide-react';
import { moveOutService } from '../../services/moveOutService';
import './MoveOutRequestsList.css';

// ─── Types ─────────────────────────────────────────────────────────────────
interface MoveOutRequestItem {
  _id: string;
  contractId?: {
    _id: string;
    contractCode?: string;
    roomId?: {
      _id: string;
      name?: string;
      roomCode?: string;
    } | string | null;
  } | string | null;
  tenantId?: {
    _id: string;
    username?: string;
    fullName?: string;
    fullname?: string;
    email?: string;
    phoneNumber?: string;
  } | null;
  finalInvoiceId?: {
    _id: string;
    invoiceCode?: string;
    totalAmount?: number;
    status?: string;
    dueDate?: string;
  } | string | null;
  requestDate?: string;
  expectedMoveOutDate?: string;
  reason?: string;
  status: 'Requested' | 'InvoiceReleased' | 'Paid' | 'Completed' | 'Cancelled';
  isEarlyNotice?: boolean;
  isUnderMinStay?: boolean;
  isDepositForfeited?: boolean;
  managerInvoiceNotes?: string;
  paymentMethod?: string;
  paymentDate?: string;
  paymentTransactionCode?: string;
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
  depositCoversInvoice: boolean;
  remainingToPay: number;
  refundToTenant: number;
  isDepositForfeited: boolean;
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

  // ── Detail modal ──────────────────────────────────────────────────────────
  const [selectedRequest, setSelectedRequest] = useState<MoveOutRequestItem | null>(null);
  const [depositComparison, setDepositComparison] = useState<DepositVsInvoice | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

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

  // ── Check Payment Status modal ────────────────────────────────────────────
  const [showCheckPaymentModal, setShowCheckPaymentModal] = useState(false);
  const [checkingRequest, setCheckingRequest] = useState<MoveOutRequestItem | null>(null);
  const [checkPaymentLoading, setCheckPaymentLoading] = useState(false);
  const [checkPaymentResult, setCheckPaymentResult] = useState<{
    isPaid?: boolean;
    invoiceStatus?: string;
    invoiceAmount?: number;
    error?: string;
  } | null>(null);

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

  const getInvoiceId = (req: MoveOutRequestItem): string | null => {
    if (!req.finalInvoiceId) return null;
    if (typeof req.finalInvoiceId === 'string') return req.finalInvoiceId;
    return req.finalInvoiceId._id ?? null;
  };

  // ── Open detail + load comparison ─────────────────────────────────────────
  const openDetail = async (req: MoveOutRequestItem) => {
    setSelectedRequest(req);
    setDepositComparison(null);
    if (getInvoiceId(req)) {
      try {
        setComparisonLoading(true);
        const res = await moveOutService.getDepositVsInvoice(req._id);
        if (res.success && res.data) setDepositComparison(res.data);
      } catch {
        /* not critical */
      } finally {
        setComparisonLoading(false);
      }
    }
  };

  // ── Release Invoice ───────────────────────────────────────────────────────
  const openReleaseModal = async (req: MoveOutRequestItem) => {
    setReleasingRequest(req);
    setElectricIndex('');
    setWaterIndex('');
    setOldElectricIndex(null);
    setOldWaterIndex(null);
    setOldIndexError('');
    setReleaseError('');
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
        setReleaseError('Chỉ số điện không hợp lệ');
        return;
      }
      payload.electricIndex = ei;
    }
    if (waterIndex !== '') {
      const wi = Number(waterIndex);
      if (isNaN(wi) || wi < 0) {
        setReleaseError('Chỉ số nước không hợp lệ');
        return;
      }
      payload.waterIndex = wi;
    }

    try {
      setReleaseLoading(true);
      setReleaseError('');
      await moveOutService.releaseFinalInvoice(releasingRequest._id, payload);
      setShowReleaseModal(false);
      setReleasingRequest(null);
      fetchRequests();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      setReleaseError(anyErr?.response?.data?.message || 'Phát hành hóa đơn thất bại');
    } finally {
      setReleaseLoading(false);
    }
  };

  // ── Check Payment Status ──────────────────────────────────────────────────
  const openCheckPaymentModal = (req: MoveOutRequestItem) => {
    setCheckingRequest(req);
    setCheckPaymentResult(null);
    setShowCheckPaymentModal(true);
  };

  const handleCheckPayment = async () => {
    if (!checkingRequest) return;
    try {
      setCheckPaymentLoading(true);
      const res = await moveOutService.checkPaymentStatus(checkingRequest._id);
      if (res.success && res.data) {
        setCheckPaymentResult(res.data);
        // Refetch to get updated status
        setTimeout(() => {
          fetchRequests();
        }, 1500);
      }
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      setCheckPaymentResult({
        error: anyErr?.response?.data?.message || 'Kiểm tra thanh toán thất bại'
      });
    } finally {
      setCheckPaymentLoading(false);
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
      if (selectedRequest?._id === completingRequest._id) setSelectedRequest(null);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      alert(anyErr?.response?.data?.message || 'Xác nhận hoàn thành thất bại');
    } finally {
      setCompleteLoading(false);
    }
  };

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
                  <th>Ngày trả dự kiến</th>
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

                        {/* Step 3: Check payment status */}
                        {req.status === 'InvoiceReleased' && (
                          <button
                            className="btn-confirm-payment"
                            title="Kiểm tra trạng thái thanh toán"
                            onClick={() => openCheckPaymentModal(req)}
                          >
                            <Banknote size={15} />
                          </button>
                        )}

                        {/* Step 5: Complete move-out */}
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
              {/* Basic info */}
              <div className="detail-section">
                <div className="detail-section-title">Thông tin chung</div>
                <div className="detail-grid">
                  <div className="detail-row">
                    <label>Cư dân:</label>
                    <span>{getTenantFullName(selectedRequest)}</span>
                  </div>
                  <div className="detail-row">
                    <label>Phòng:</label>
                    <span>{getRoomNumber(selectedRequest)}</span>
                  </div>
                  <div className="detail-row">
                    <label>Ngày yêu cầu:</label>
                    <span>{formatDate(selectedRequest.requestDate ?? selectedRequest.createdAt)}</span>
                  </div>
                  <div className="detail-row">
                    <label>Ngày trả dự kiến:</label>
                    <span>{formatDate(selectedRequest.expectedMoveOutDate)}</span>
                  </div>
                  <div className="detail-row">
                    <label>Trạng thái:</label>
                    <span className={`status-badge ${STATUS_BADGE_CLASS[selectedRequest.status] ?? ''}`}>
                      {STATUS_LABELS[selectedRequest.status] ?? selectedRequest.status}
                    </span>
                  </div>
                  <div className="detail-row">
                    <label>Lý do:</label>
                    <span>{selectedRequest.reason ?? '-'}</span>
                  </div>
                </div>
              </div>

              {/* Cọc + điều kiện */}
              <div className="detail-section">
                <div className="detail-section-title">Điều kiện cọc</div>
                <div className="detail-grid">
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
                    <label>Tiền cọc:</label>
                    <span className={selectedRequest.isDepositForfeited ? 'text-danger' : 'text-ok'}>
                      {selectedRequest.isDepositForfeited ? '❌ Mất cọc' : '✓ Được hoàn cọc'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deposit vs Invoice comparison */}
              {getInvoiceId(selectedRequest) && (
                <div className="detail-section">
                  <div className="detail-section-title">So sánh cọc – hóa đơn</div>
                  {comparisonLoading ? (
                    <div className="comparison-loading">Đang tải...</div>
                  ) : depositComparison ? (
                    <div className="comparison-table">
                      <div className="comparison-row">
                        <span>Tiền cọc hiện giữ:</span>
                        <strong>{formatMoney(depositComparison.depositAmount)}</strong>
                      </div>
                      <div className="comparison-row">
                        <span>Hóa đơn cuối:</span>
                        <strong>{formatMoney(depositComparison.invoiceAmount)}</strong>
                      </div>
                      {depositComparison.depositCoversInvoice ? (
                        <div className="comparison-row text-ok">
                          <span>Hoàn lại cho cư dân:</span>
                          <strong>{formatMoney(depositComparison.isDepositForfeited ? 0 : depositComparison.refundToTenant)}</strong>
                        </div>
                      ) : (
                        <div className="comparison-row text-danger">
                          <span>Cư dân cần trả thêm:</span>
                          <strong>{formatMoney(depositComparison.remainingToPay)}</strong>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: '#64748b' }}>Không tải được thông tin so sánh.</p>
                  )}
                  {/* Invoice details */}
                  {typeof selectedRequest.finalInvoiceId === 'object' && selectedRequest.finalInvoiceId && (
                    <div className="detail-grid" style={{ marginTop: 8 }}>
                      <div className="detail-row">
                        <label>Mã hóa đơn:</label>
                        <span>{selectedRequest.finalInvoiceId.invoiceCode ?? '-'}</span>
                      </div>
                      <div className="detail-row">
                        <label>Tổng tiền HĐ:</label>
                        <span>{formatMoney(selectedRequest.finalInvoiceId.totalAmount)}</span>
                      </div>
                      <div className="detail-row">
                        <label>TT hóa đơn:</label>
                        <span>{selectedRequest.finalInvoiceId.status ?? '-'}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payment info */}
              {(selectedRequest.paymentMethod || selectedRequest.paymentDate) && (
                <div className="detail-section">
                  <div className="detail-section-title">Thanh toán</div>
                  <div className="detail-grid">
                    {selectedRequest.paymentMethod && (
                      <div className="detail-row">
                        <label>Hình thức:</label>
                        <span>{selectedRequest.paymentMethod === 'online' ? 'Online' : 'Offline (tiền mặt)'}</span>
                      </div>
                    )}
                    {selectedRequest.paymentDate && (
                      <div className="detail-row">
                        <label>Ngày thanh toán:</label>
                        <span>{formatDate(selectedRequest.paymentDate)}</span>
                      </div>
                    )}
                    {selectedRequest.depositRefundAmount !== undefined && (
                      <div className="detail-row">
                        <label>Số tiền hoàn cọc:</label>
                        <span className={selectedRequest.depositRefundAmount > 0 ? 'text-ok' : ''}>
                          {formatMoney(selectedRequest.depositRefundAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Completion info */}
              {selectedRequest.completedDate && (
                <div className="detail-section">
                  <div className="detail-section-title">Hoàn tất</div>
                  <div className="detail-grid">
                    <div className="detail-row">
                      <label>Ngày hoàn tất:</label>
                      <span>{formatDate(selectedRequest.completedDate)}</span>
                    </div>
                    {selectedRequest.managerCompletionNotes && (
                      <div className="detail-row">
                        <label>Ghi chú:</label>
                        <span>{selectedRequest.managerCompletionNotes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons inside detail modal */}
              <div className="detail-actions">
                {selectedRequest.status === 'Requested' && (
                  <button
                    className="btn-action-primary"
                    onClick={() => { setSelectedRequest(null); openReleaseModal(selectedRequest); }}
                  >
                    <FileText size={14} /> Phát hành hóa đơn cuối
                  </button>
                )}
                {selectedRequest.status === 'InvoiceReleased' && (
                  <button
                    className="btn-action-indigo"
                    onClick={() => { setSelectedRequest(null); openCheckPaymentModal(selectedRequest); }}
                  >
                    <Banknote size={14} /> Kiểm tra thanh toán
                  </button>
                )}
                {selectedRequest.status === 'Paid' && (
                  <button
                    className="btn-action-green"
                    onClick={() => { setSelectedRequest(null); openCompleteModal(selectedRequest); }}
                  >
                    <CheckCircle size={14} /> Hoàn tất trả phòng
                  </button>
                )}
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
                  <label>Ngày trả dự kiến:</label>
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
                        ? `${oldElectricIndex.oldIndex} → ${oldElectricIndex.newIndex}`
                        : '-'}
                  </span>
                </div>
                <div className="detail-row">
                  <label>Chỉ số nước cũ:</label>
                  <span>
                    {oldIndexLoading
                      ? 'Đang tải...'
                      : oldWaterIndex
                        ? `${oldWaterIndex.oldIndex} → ${oldWaterIndex.newIndex}`
                        : '-'}
                  </span>
                </div>
              </div>
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
              <button className="btn-cancel" onClick={() => setShowReleaseModal(false)}>Hủy</button>
              <button className="btn-action-primary btn-modal-action" onClick={handleRelease} disabled={releaseLoading}>
                {releaseLoading ? 'Đang xử lý...' : 'Phát hành hóa đơn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Check Payment Status Modal ────────────────────────────────────── */}
      {showCheckPaymentModal && checkingRequest && (
        <div className="modal-overlay" onClick={() => setShowCheckPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>[STEP 4] Kiểm tra trạng thái thanh toán</h2>
              <button className="btn-close" onClick={() => setShowCheckPaymentModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {!checkPaymentResult ? (
                <>
                  <div className="info-box info-box--blue">
                    <p><strong>Kiểm tra trạng thái thanh toán:</strong></p>
                    <p style={{ marginTop: 8, fontSize: 13 }}>Hệ thống sẽ kiểm tra xem Tenant đã thanh toán hóa đơn xuất phòng chưa:</p>
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: 13 }}>
                      <li><strong>Nếu đã thanh toán:</strong> Trạng thái tự động cập nhật → Paid. Bạn có thể hoàn tất trả phòng.</li>
                      <li><strong>Nếu chưa:</strong> Vui lòng liên hệ hoặc chờ Tenant thanh toán.</li>
                    </ul>
                  </div>
                  <div className="detail-grid" style={{ marginBottom: 16 }}>
                    <div className="detail-row">
                      <label>Cư dân:</label>
                      <span>{getTenantFullName(checkingRequest)}</span>
                    </div>
                    <div className="detail-row">
                      <label>Phòng:</label>
                      <span>{getRoomNumber(checkingRequest)}</span>
                    </div>
                    <div className="detail-row">
                      <label>Trạng thái hiện tại:</label>
                      <span className={`status-badge ${STATUS_BADGE_CLASS[checkingRequest.status] ?? ''}`}>
                        {STATUS_LABELS[checkingRequest.status] ?? checkingRequest.status}
                      </span>
                    </div>
                  </div>
                </>
              ) : checkPaymentResult.error ? (
                <div className="mo-error">{checkPaymentResult.error}</div>
              ) : (
                <div className={checkPaymentResult.isPaid ? 'info-box info-box--green' : 'info-box info-box--orange'}>
                  <p>
                    {checkPaymentResult.isPaid
                      ? `✓ Tenant đã thanh toán hóa đơn. Bạn có thể tiến hành hoàn tất trả phòng.`
                      : `⏳ Tenant chưa thanh toán. Vui lòng chờ hoặc liên hệ để nhắc nhở.`}
                  </p>
                  <div style={{ marginTop: 12, fontSize: 13, color: '#475569' }}>
                    <div>Hóa đơn: {formatMoney(checkPaymentResult.invoiceAmount)}</div>
                    <div>Trạng thái HĐ: {checkPaymentResult.invoiceStatus}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowCheckPaymentModal(false);
                  setCheckingRequest(null);
                  setCheckPaymentResult(null);
                }}
                disabled={checkPaymentLoading}
              >
                {checkPaymentResult ? 'Đóng' : 'Hủy'}
              </button>
              {!checkPaymentResult && (
                <button
                  className="btn-action-indigo btn-modal-action"
                  onClick={handleCheckPayment}
                  disabled={checkPaymentLoading}
                >
                  {checkPaymentLoading ? 'Đang kiểm tra...' : 'Kiểm tra thanh toán'}
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
              <h2>[STEP 5] Hoàn tất trả phòng</h2>
              <button className="btn-close" onClick={() => setShowCompleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="info-box info-box--orange">
                <p>Hành động này sẽ <strong>kết thúc hợp đồng</strong> và <strong>vô hiệu hóa tài khoản</strong> của cư dân. Sau bước này, quy trình trả phòng sẽ hoàn toàn kết thúc.</p>
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
                  <label>Ngày trả dự kiến:</label>
                  <span>{formatDate(completingRequest.expectedMoveOutDate)}</span>
                </div>
              </div>
              <div className="form-group">
                <label>Ghi chú hoàn tất (tùy chọn):</label>
                <textarea
                  className="form-textarea"
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="Nhập ghi chú hoàn thành (nếu có)..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCompleteModal(false)}>Hủy</button>
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

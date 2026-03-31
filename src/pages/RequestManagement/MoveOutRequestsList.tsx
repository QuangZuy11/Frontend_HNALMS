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
    } | null;
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
  const [releaseNote, setReleaseNote] = useState('');
  const [electricIndex, setElectricIndex] = useState<string>('');
  const [waterIndex, setWaterIndex] = useState<string>('');
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseError, setReleaseError] = useState('');

  // ── Confirm Payment Offline modal ─────────────────────────────────────────
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingRequest, setPayingRequest] = useState<MoveOutRequestItem | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');

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
      return req.contractId.roomId?.name || req.contractId.roomId?.roomCode || '-';
    }
    return '-';
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
      } catch (_) { /* not critical */ } finally {
        setComparisonLoading(false);
      }
    }
  };

  // ── Release Invoice ───────────────────────────────────────────────────────
  const openReleaseModal = (req: MoveOutRequestItem) => {
    setReleasingRequest(req);
    setReleaseNote('');
    setElectricIndex('');
    setWaterIndex('');
    setReleaseError('');
    setShowReleaseModal(true);
  };

  const handleRelease = async () => {
    if (!releasingRequest) return;

    const payload: {
      managerInvoiceNotes?: string;
      electricIndex?: number;
      waterIndex?: number;
    } = {};

    if (releaseNote) payload.managerInvoiceNotes = releaseNote;
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

  // ── Confirm Offline Payment ───────────────────────────────────────────────
  const openPaymentModal = (req: MoveOutRequestItem) => {
    setPayingRequest(req);
    setPaymentNote('');
    setPaymentError('');
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!payingRequest) return;
    try {
      setPaymentLoading(true);
      setPaymentError('');
      await moveOutService.confirmPaymentOffline(payingRequest._id, paymentNote || undefined);
      setShowPaymentModal(false);
      setPayingRequest(null);
      fetchRequests();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      setPaymentError(anyErr?.response?.data?.message || 'Xác nhận thanh toán thất bại');
    } finally {
      setPaymentLoading(false);
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

                        {/* Step 4b: Confirm offline payment */}
                        {req.status === 'InvoiceReleased' && (
                          <button
                            className="btn-confirm-payment"
                            title="Xác nhận thanh toán offline"
                            onClick={() => openPaymentModal(req)}
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
                    onClick={() => { setSelectedRequest(null); openPaymentModal(selectedRequest); }}
                  >
                    <Banknote size={14} /> Xác nhận thanh toán offline
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
              <h2>Phát hành hóa đơn cuối</h2>
              <button className="btn-close" onClick={() => setShowReleaseModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="info-box info-box--blue">
                <p>Hệ thống sẽ <strong>tự động tính toán và tạo Hóa đơn cuối (Hóa đơn xuất phòng)</strong> bao gồm cấn trừ tiền thuê phòng, điện, nước và các dịch vụ. Hóa đơn sẽ được chuyển thẳng sang trạng thái <strong>Unpaid</strong> để chờ thanh toán và chốt cọc.</p>
              </div>
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
              <div className="form-group" style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label>Chỉ số điện chốt (tùy chọn):</label>
                  <input
                    type="number"
                    className="form-input"
                    value={electricIndex}
                    onChange={(e) => setElectricIndex(e.target.value)}
                    placeholder="VD: 1540"
                    min="0"
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
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
              </div>
              <div className="form-group">
                <label>Ghi chú (tùy chọn):</label>
                <textarea
                  className="form-textarea"
                  value={releaseNote}
                  onChange={(e) => setReleaseNote(e.target.value)}
                  placeholder="Ghi chú cho cư dân về hóa đơn cuối..."
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

      {/* ── Confirm Offline Payment Modal ─────────────────────────────────── */}
      {showPaymentModal && payingRequest && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Xác nhận thanh toán offline</h2>
              <button className="btn-close" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="info-box info-box--green">
                <p>Xác nhận rằng cư dân đã <strong>thanh toán tiền mặt</strong> đầy đủ cho hóa đơn cuối. Hệ thống sẽ đánh dấu hóa đơn là đã thanh toán và xử lý tiền cọc.</p>
              </div>
              <div className="detail-grid" style={{ marginBottom: 16 }}>
                <div className="detail-row">
                  <label>Cư dân:</label>
                  <span>{getTenantFullName(payingRequest)}</span>
                </div>
                <div className="detail-row">
                  <label>Phòng:</label>
                  <span>{getRoomNumber(payingRequest)}</span>
                </div>
                <div className="detail-row">
                  <label>Mất cọc:</label>
                  <span className={payingRequest.isDepositForfeited ? 'text-danger' : 'text-ok'}>
                    {payingRequest.isDepositForfeited ? '❌ Có' : '✓ Không'}
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label>Ghi chú kế toán (tùy chọn):</label>
                <textarea
                  className="form-textarea"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Ghi chú về việc xác nhận thanh toán..."
                />
              </div>
              {paymentError && <div className="mo-error" style={{ marginTop: 8 }}>{paymentError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowPaymentModal(false)}>Hủy</button>
              <button className="btn-action-indigo btn-modal-action" onClick={handleConfirmPayment} disabled={paymentLoading}>
                {paymentLoading ? 'Đang xử lý...' : 'Xác nhận đã thanh toán'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Complete Move-Out Modal ───────────────────────────────────────── */}
      {showCompleteModal && completingRequest && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Hoàn tất trả phòng</h2>
              <button className="btn-close" onClick={() => setShowCompleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="info-box info-box--orange">
                <p>Hành động này sẽ <strong>kết thúc hợp đồng</strong> và <strong>vô hiệu hóa tài khoản</strong> của cư dân. Vui lòng chắc chắn trước khi tiếp tục.</p>
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

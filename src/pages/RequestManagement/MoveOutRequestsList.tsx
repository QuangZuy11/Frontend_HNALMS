import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Eye, FileText, CheckCircle,
  LogOut, Clock, CheckCircle2,
  Search, Filter, ArrowUpDown,
} from 'lucide-react';
import { AppModal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import { useToast } from '../../components/common/Toast';
import { moveOutService } from '../../services/moveOutService';
import './MoveOutRequestsList.css';

// ─── Types ───────────────────────────────────────────────────────────────────
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
      floorId?: { _id: string; name?: string; };
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
  refundTicket?: { id?: string; amount?: number; status?: string; paymentVoucher?: string; } | null;
}

interface ReleaseSettlement {
  depositAmount?: number;
  invoiceAmount?: number;
  depositRefundAmount?: number;
  remainingToPay?: number;
  isDepositForfeited?: boolean;
  refundTicket?: { id?: string; amount?: number; status?: string; paymentVoucher?: string; } | null;
}

type StatusFilter = 'ALL' | 'Requested' | 'InvoiceReleased' | 'Paid' | 'Completed' | 'Cancelled';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  Requested: 'Chờ phát hành HĐ',
  InvoiceReleased: 'Đã phát hành HĐ',
  Paid: 'Đã thanh toán',
  Completed: 'Đã hoàn tất',
  Cancelled: 'Đã hủy',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  Requested: 'mout-status-requested',
  InvoiceReleased: 'mout-status-invoicereleased',
  Paid: 'mout-status-paid',
  Completed: 'mout-status-completed',
  Cancelled: 'mout-status-cancelled',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatMoney = (amount?: number) => {
  if (amount === undefined || amount === null) return '-';
  return amount.toLocaleString('vi-VN') + ' VND';
};

const normalizeReleaseSettlement = (settlement: ReleaseSettlement): ReleaseSettlement => {
  const invoiceAmount = settlement.invoiceAmount ?? 0;
  return { ...settlement, remainingToPay: invoiceAmount };
};

export default function MoveOutRequestsList() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<MoveOutRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & sort
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortOption, setSortOption] = useState('newest');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const tableRef = useRef<HTMLDivElement | null>(null);

  // ── Detail modal ─────────────────────────────────────────────────────────
  const [selectedRequest, setSelectedRequest] = useState<MoveOutRequestItem | null>(null);
  const [depositComparison, setDepositComparison] = useState<DepositVsInvoice | null>(null);

  // ── Release Invoice modal ─────────────────────────────────────────────
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

  // ── Complete modal ────────────────────────────────────────────────────
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingRequest, setCompletingRequest] = useState<MoveOutRequestItem | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [completeLoading, setCompleteLoading] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
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
      showToast('error', 'Lỗi tải dữ liệu', anyErr?.response?.data?.message || 'Không thể tải danh sách yêu cầu trả phòng');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, currentPage, itemsPerPage, showToast]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => { setCurrentPage(1); }, [statusFilter, search]);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const handleSearch = () => setSearch(searchInput);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const hasFilters = search || statusFilter !== 'ALL';
  const clearFilters = () => {
    setSearch('');
    setSearchInput('');
    setStatusFilter('ALL');
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

  // ─── Stats ───────────────────────────────────────────────────────────────
  const totalCount = requests.length;
  const requestedCount = requests.filter(r => r.status === 'Requested').length;
  const completedCount = requests.filter(r => r.status === 'Completed').length;

  // ─── Sorted display ───────────────────────────────────────────────────────
  const displayedRequests = [...requests].sort((a, b) => {
    if (sortOption === 'name-asc') return getTenantFullName(a).localeCompare(getTenantFullName(b));
    if (sortOption === 'name-desc') return getTenantFullName(b).localeCompare(getTenantFullName(a));
    return 0;
  });

  // ─── Open detail ──────────────────────────────────────────────────────
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
    } catch { /* not critical */ }
  };

  // ─── Release Invoice ──────────────────────────────────────────────────
  const openReleaseModal = async (req: MoveOutRequestItem) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const reqDate = new Date(req.requestDate ?? ''); reqDate.setHours(0, 0, 0, 0);
    const contractEndDate = typeof req.contractId === 'object' && req.contractId?.endDate
      ? new Date(req.contractId.endDate) : null;
    if (contractEndDate) contractEndDate.setHours(0, 0, 0, 0);

    if (!contractEndDate || todayMs < reqDate.getTime() || todayMs > contractEndDate.getTime()) {
      const reqDateStr = reqDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const endDateStr = contractEndDate ? contractEndDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '?';
      const todayStr = today.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      showToast('warning', 'Chưa đến thời điểm phát hành', `Chỉ có thể phát hành từ ngày ${reqDateStr} đến ${endDateStr}. Hôm nay là ${todayStr}.`);
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
    if (!roomId) { setOldIndexError('Không xác định được phòng để tải chỉ số cũ.'); return; }

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
        electricService?._id ? moveOutService.getLatestMeterReading(roomId, electricService._id).catch(() => null) : Promise.resolve(null),
        waterService?._id ? moveOutService.getLatestMeterReading(roomId, waterService._id).catch(() => null) : Promise.resolve(null),
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
    const payload: { electricIndex?: number; waterIndex?: number } = {};
    if (electricIndex !== '') {
      const ei = Number(electricIndex);
      if (isNaN(ei) || ei < 0) { setReleaseError('Chỉ số điện phải là số không âm'); return; }
      payload.electricIndex = ei;
    }
    if (waterIndex !== '') {
      const wi = Number(waterIndex);
      if (isNaN(wi) || wi < 0) { setReleaseError('Chỉ số nước phải là số không âm'); return; }
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
      showToast('success', 'Thành công', 'Đã phát hành hóa đơn cuối thành công.');
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      setReleaseError(anyErr?.response?.data?.message || 'Phát hành hóa đơn thất bại');
    } finally {
      setReleaseLoading(false);
    }
  };

  // ─── Complete Move-Out ─────────────────────────────────────────────────
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
      showToast('success', 'Thành công', 'Đã hoàn tất quy trình trả phòng.');
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Thao tác thất bại', anyErr?.response?.data?.message || 'Hoàn tất trả phòng thất bại');
    } finally {
      setCompleteLoading(false);
    }
  };

  const normalizedReleaseSettlement = releaseSettlement ? normalizeReleaseSettlement(releaseSettlement) : null;

  return (
    <div className="mout-container">
      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <div className="mout-header">
        <div className="mout-header-top">
          <div className="mout-title-block">
            <div className="mout-title-row">
              <div className="mout-title-icon" aria-hidden>
                <LogOut size={22} strokeWidth={2} />
              </div>
              <div className="mout-title-text">
                <h2>Quản lý Yêu cầu Trả phòng</h2>
                <p className="mout-subtitle">
                  Các yêu cầu trả phòng của cư dân tòa nhà Hoàng Nam.
                </p>
              </div>
            </div>
          </div>

          <div className="mout-header-aside">
            <div className="mout-stats-summary">
              <div className="mout-stat-item">
                <div className="mout-stat-icon icon-primary">
                  <LogOut size={16} strokeWidth={2} />
                </div>
                <div className="mout-stat-text">
                  <span className="mout-stat-value">{totalCount}</span>
                  <span className="mout-stat-label">Tổng số</span>
                </div>
              </div>
              <div className="mout-stat-divider" />
              <div className="mout-stat-item">
                <div className="mout-stat-icon icon-warning">
                  <Clock size={16} strokeWidth={2} />
                </div>
                <div className="mout-stat-text">
                  <span className="mout-stat-value">{requestedCount}</span>
                  <span className="mout-stat-label">Chờ phát hành</span>
                </div>
              </div>
              <div className="mout-stat-divider" />
              <div className="mout-stat-item">
                <div className="mout-stat-icon icon-accent">
                  <CheckCircle2 size={16} strokeWidth={2} />
                </div>
                <div className="mout-stat-text">
                  <span className="mout-stat-value">{completedCount}</span>
                  <span className="mout-stat-label">Đã hoàn tất</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ───────────────────────────────────────────────────── */}
      <div className="mout-toolbar">
        <div className="mout-toolbar-left">
          <div className="mout-search-box">
            <Search size={18} className="mout-search-icon" />
            <input
              type="text"
              className="mout-search-input"
              placeholder="Tìm theo tên cư dân..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSearch}
            />
          </div>

          <div className="mout-control-group">
            <Filter size={16} className="mout-toolbar-icon" />
            <select
              className="mout-custom-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Requested">Chờ phát hành HĐ</option>
              <option value="InvoiceReleased">Đã phát hành HĐ</option>
              <option value="Paid">Đã thanh toán</option>
              <option value="Completed">Đã hoàn tất</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
          </div>

          {hasFilters && (
            <button type="button" className="mout-btn-clear-filter" onClick={clearFilters}>
              Xóa lọc
            </button>
          )}
        </div>

        <div className="mout-toolbar-right">
          <ArrowUpDown size={16} className="mout-toolbar-icon" />
          <select
            className="mout-custom-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="newest">Mới nhất</option>
            <option value="name-asc">Tên: A - Z</option>
            <option value="name-desc">Tên: Z - A</option>
          </select>
        </div>
      </div>

      {/* ── TABLE ─────────────────────────────────────────────────────── */}
      <div className="mout-table-container" ref={tableRef}>
        <table className="mout-table">
          <thead>
            <tr>
              <th className="mout-cell-stt">STT</th>
              <th className="mout-cell-tenant">Cư dân</th>
              <th className="mout-cell-room">Phòng</th>
              <th className="mout-cell-reason">Lý do</th>
              <th className="mout-cell-date">Ngày yêu cầu</th>
              <th className="mout-cell-date">Ngày trả phòng</th>
              <th className="mout-cell-status">Trạng thái</th>
              <th className="mout-cell-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {displayedRequests.length > 0 ? (
              displayedRequests.map((req, idx) => (
                <tr key={req._id}>
                  <td className="mout-cell-stt">
                    {(currentPage - 1) * itemsPerPage + idx + 1}
                  </td>
                  <td className="mout-cell-tenant">{getTenantFullName(req)}</td>
                  <td className="mout-cell-room">
                    <span className="mout-room-badge">{getRoomNumber(req)}</span>
                  </td>
                  <td className="mout-cell-reason">
                    {req.reason
                      ? (req.reason.length > 40 ? req.reason.substring(0, 40) + '...' : req.reason)
                      : '-'}
                  </td>
                  <td className="mout-cell-date">{formatDate(req.requestDate ?? req.createdAt)}</td>
                  <td className="mout-cell-date">{formatDate(req.expectedMoveOutDate)}</td>
                  <td className="mout-cell-status">
                    <span className={`mout-status-badge ${STATUS_BADGE_CLASS[req.status] ?? ''}`}>
                      {STATUS_LABELS[req.status] ?? req.status}
                    </span>
                  </td>
                  <td className="mout-cell-actions">
                    <div className="mout-table-actions">
                      <button
                        className="mout-btn-icon mout-btn-view"
                        title="Xem chi tiết"
                        onClick={() => openDetail(req)}
                      >
                        <Eye size={16} />
                      </button>
                      {req.status === 'Requested' && (
                        <button
                          className="mout-btn-icon mout-btn-invoice"
                          title="Phát hành hóa đơn cuối"
                          onClick={() => openReleaseModal(req)}
                        >
                          <FileText size={15} />
                        </button>
                      )}
                      {req.status === 'Paid' && (
                        <button
                          className="mout-btn-icon mout-btn-complete"
                          title="Hoàn tất trả phòng"
                          onClick={() => openCompleteModal(req)}
                        >
                          <CheckCircle size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="mout-table-empty-cell">
                  {loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy yêu cầu trả phòng nào phù hợp.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={handlePageChange}
        />
      </div>

      {/* ================================================================
          MODALS
          ================================================================ */}

      {/* 1. Modal Chi tiết */}
      <AppModal
        open={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="Chi tiết yêu cầu trả phòng"
        icon={<LogOut size={18} />}
        color="blue"
        size="md"
        footer={
          <>
            <button type="button" className="ms-btn ms-btn--ghost" onClick={() => setSelectedRequest(null)}>
              Đóng
            </button>
            {selectedRequest?.status === 'Requested' && (() => {
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const todayMs = today.getTime();
              const reqDate = new Date(selectedRequest.requestDate ?? ''); reqDate.setHours(0, 0, 0, 0);
              const contractEndDate = typeof selectedRequest.contractId === 'object' && selectedRequest.contractId?.endDate
                ? new Date(selectedRequest.contractId.endDate) : null;
              if (contractEndDate) contractEndDate.setHours(0, 0, 0, 0);
              const canRelease = contractEndDate && todayMs >= reqDate.getTime() && todayMs <= contractEndDate.getTime();
              return (
                <button
                  type="button"
                  className="ms-btn ms-btn--primary"
                  disabled={!canRelease}
                  onClick={() => { setSelectedRequest(null); openReleaseModal(selectedRequest!); }}
                >
                  <FileText size={15} /> Phát hành hóa đơn cuối
                </button>
              );
            })()}
            {selectedRequest?.status === 'Paid' && (() => {
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const moveDate = selectedRequest.expectedMoveOutDate ? new Date(selectedRequest.expectedMoveOutDate) : null;
              if (moveDate) moveDate.setHours(0, 0, 0, 0);
              const canComplete = moveDate && today.getTime() >= moveDate.getTime();
              return (
                <button
                  type="button"
                  className="ms-btn ms-btn--primary"
                  disabled={!canComplete}
                  onClick={() => { setSelectedRequest(null); openCompleteModal(selectedRequest!); }}
                >
                  <CheckCircle size={15} /> Hoàn tất trả phòng
                </button>
              );
            })()}
          </>
        }
      >
        {selectedRequest && (
          <div className="mout-detail-body">
            {/* Profile strip */}
            <div className="mout-profile-strip">
              <div className="mout-avatar">
                {(getTenantFullName(selectedRequest) || '?').charAt(0).toUpperCase()}
              </div>
              <div className="mout-profile-info">
                <div className="mout-profile-name">{getTenantFullName(selectedRequest)}</div>
                <div className="mout-profile-meta">
                  <span className="mout-meta-tag">{getRoomNumber(selectedRequest)}</span>
                  <span className={`mout-status-tag ${STATUS_BADGE_CLASS[selectedRequest.status] ?? ''}`}>
                    {STATUS_LABELS[selectedRequest.status] ?? selectedRequest.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="mout-two-col">
              {/* Col 1 */}
              <div className="mout-col">
                <div className="mout-section">
                  <div className="mout-section-title"><LogOut size={14} /> Thông tin hợp đồng</div>
                  <div className="mout-rows">
                    <div className="mout-row"><span className="mout-label">Mã HĐ</span><span className="mout-value">{getContractCode(selectedRequest)}</span></div>
                    {selectedRequest.contractId && typeof selectedRequest.contractId === 'object' && (
                      <>
                        {selectedRequest.contractId.startDate && (
                          <div className="mout-row"><span className="mout-label">Ngày bắt đầu</span><span className="mout-value">{formatDate(selectedRequest.contractId.startDate)}</span></div>
                        )}
                        {selectedRequest.contractId.endDate && (
                          <div className="mout-row"><span className="mout-label">Ngày kết thúc</span><span className="mout-value">{formatDate(selectedRequest.contractId.endDate)}</span></div>
                        )}
                        {selectedRequest.contractId.rentAmount !== undefined && (
                          <div className="mout-row"><span className="mout-label">Tiền thuê/tháng</span><span className="mout-value">{formatMoney(selectedRequest.contractId.rentAmount)}</span></div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="mout-section">
                  <div className="mout-section-title"><Clock size={14} /> Điều kiện hoàn cọc</div>
                  <div className="mout-rows">
                    <div className="mout-row">
                      <span className="mout-label">Báo gấp (&lt;30 ngày)</span>
                      <span className={`mout-value ${selectedRequest.isEarlyNotice ? 'mout-value--danger' : 'mout-value--ok'}`}>
                        {selectedRequest.isEarlyNotice ? '⚠ Có' : '✓ Không'}
                      </span>
                    </div>
                    <div className="mout-row">
                      <span className="mout-label">Ở chưa đủ 6 tháng</span>
                      <span className={`mout-value ${selectedRequest.isUnderMinStay ? 'mout-value--danger' : 'mout-value--ok'}`}>
                        {selectedRequest.isUnderMinStay ? '⚠ Có' : '✓ Không'}
                      </span>
                    </div>
                    <div className="mout-row">
                      <span className="mout-label">Tình trạng cọc</span>
                      <span className={`mout-value ${selectedRequest.isDepositForfeited ? 'mout-value--danger' : 'mout-value--ok'}`}>
                        {selectedRequest.isDepositForfeited ? '❌ Mất cọc' : '✓ Được hoàn cọc'}
                      </span>
                    </div>
                    {depositComparison && (
                      <>
                        <div className="mout-row">
                          <span className="mout-label">Tiền cọc giữ</span>
                          <span className="mout-value">{formatMoney(depositComparison.depositAmount)}</span>
                        </div>
                        {depositComparison.remainingToPay !== undefined && (
                          <div className="mout-row">
                            <span className="mout-label">HĐ cần thanh toán</span>
                            <span className={`mout-value ${depositComparison.remainingToPay > 0 ? 'mout-value--danger' : 'mout-value--ok'}`}>
                              {formatMoney(depositComparison.remainingToPay)}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Col 2 */}
              <div className="mout-col">
                <div className="mout-section">
                  <div className="mout-section-title"><CheckCircle2 size={14} /> Thông tin yêu cầu</div>
                  <div className="mout-rows">
                    <div className="mout-row"><span className="mout-label">Ngày tạo</span><span className="mout-value">{formatDate(selectedRequest.createdAt)}</span></div>
                    <div className="mout-row"><span className="mout-label">Ngày yêu cầu</span><span className="mout-value">{formatDate(selectedRequest.requestDate ?? selectedRequest.createdAt)}</span></div>
                    <div className="mout-row"><span className="mout-label">Ngày trả phòng</span><span className="mout-value">{formatDate(selectedRequest.expectedMoveOutDate)}</span></div>
                    <div className="mout-row"><span className="mout-label">Lý do</span><span className="mout-value">{selectedRequest.reason ?? '-'}</span></div>
                    {selectedRequest.status === 'Paid' && selectedRequest.paymentDate && (
                      <div className="mout-row"><span className="mout-label">Ngày thanh toán</span><span className="mout-value">{formatDate(selectedRequest.paymentDate)}</span></div>
                    )}
                    {selectedRequest.status === 'Completed' && selectedRequest.completedDate && (
                      <div className="mout-row"><span className="mout-label">Ngày hoàn tất</span><span className="mout-value">{formatDate(selectedRequest.completedDate)}</span></div>
                    )}
                  </div>
                </div>

                {selectedRequest.finalInvoiceId && typeof selectedRequest.finalInvoiceId === 'object' && (
                  <div className="mout-section">
                    <div className="mout-section-title"><FileText size={14} /> Hóa đơn cuối</div>
                    <div className="mout-rows">
                      <div className="mout-row">
                        <span className="mout-label">Mã HĐ</span>
                        <span className="mout-value">{(selectedRequest.finalInvoiceId as any)?.invoiceCode ?? '-'}</span>
                      </div>
                      {(selectedRequest.finalInvoiceId as any)?.totalAmount !== undefined && (
                        <div className="mout-row">
                          <span className="mout-label">Tổng tiền</span>
                          <span className="mout-value mout-value--danger">{formatMoney((selectedRequest.finalInvoiceId as any).totalAmount)}</span>
                        </div>
                      )}
                      <div className="mout-row">
                        <span className="mout-label">Trạng thái HĐ</span>
                        <span className="mout-value">{(selectedRequest.finalInvoiceId as any)?.status ?? '-'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AppModal>

      {/* 2. Modal Phát hành hóa đơn */}
      <AppModal
        open={showReleaseModal && !!releasingRequest}
        onClose={() => { setShowReleaseModal(false); setReleasingRequest(null); }}
        title="Phát hành hóa đơn cuối"
        icon={<FileText size={18} />}
        color="blue"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="ms-btn ms-btn--ghost"
              onClick={() => { setShowReleaseModal(false); setReleasingRequest(null); }}
            >
              {releaseSettlement ? 'Đóng' : 'Hủy'}
            </button>
            {!releaseSettlement && (
              <button
                type="button"
                className="ms-btn ms-btn--primary"
                onClick={handleRelease}
                disabled={releaseLoading}
              >
                {releaseLoading ? 'Đang xử lý...' : 'Phát hành hóa đơn'}
              </button>
            )}
          </>
        }
      >
        {releasingRequest && (
          <div className="mout-form-body">
            <div className="mout-info-grid">
              <div className="mout-info-row"><span className="mout-info-label">Cư dân</span><span className="mout-info-value">{getTenantFullName(releasingRequest)}</span></div>
              <div className="mout-info-row"><span className="mout-info-label">Phòng</span><span className="mout-info-value">{getRoomNumber(releasingRequest)}</span></div>
              <div className="mout-info-row"><span className="mout-info-label">Ngày trả phòng</span><span className="mout-info-value">{formatDate(releasingRequest.expectedMoveOutDate)}</span></div>
              <div className="mout-info-row">
                <span className="mout-info-label">Chỉ số điện cũ</span>
                <span className="mout-info-value">{oldIndexLoading ? 'Đang tải...' : oldElectricIndex ? `${oldElectricIndex.newIndex}` : '-'}</span>
              </div>
              <div className="mout-info-row">
                <span className="mout-info-label">Chỉ số nước cũ</span>
                <span className="mout-info-value">{oldIndexLoading ? 'Đang tải...' : oldWaterIndex ? `${oldWaterIndex.newIndex}` : '-'}</span>
              </div>
            </div>

            {oldIndexError && <div className="mout-error-banner">{oldIndexError}</div>}

            {normalizedReleaseSettlement && (
              <div className="mout-settlement-box">
                <p className="mout-settlement-title">Kết quả cấn trừ cọc</p>
                {normalizedReleaseSettlement.depositAmount !== undefined && (
                  <div className="mout-settlement-row"><span>Tiền cọc:</span><span>{formatMoney(normalizedReleaseSettlement.depositAmount)}</span></div>
                )}
                {normalizedReleaseSettlement.invoiceAmount !== undefined && (
                  <div className="mout-settlement-row"><span>Hóa đơn cuối (tenant trả):</span><span>{formatMoney(normalizedReleaseSettlement.invoiceAmount)}</span></div>
                )}
                {normalizedReleaseSettlement.remainingToPay !== undefined && (
                  <div className="mout-settlement-row">
                    <span>Cần thanh toán:</span>
                    <span className={normalizedReleaseSettlement.remainingToPay > 0 ? 'mout-value--danger' : 'mout-value--ok'}>
                      {formatMoney(normalizedReleaseSettlement.remainingToPay)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="mout-form-group">
              <label className="mout-form-label">Chỉ số điện chốt (tùy chọn)</label>
              <input
                type="number"
                className="mout-form-input"
                value={electricIndex}
                onChange={(e) => setElectricIndex(e.target.value)}
                placeholder="VD: 1450"
                min="0"
              />
            </div>
            <div className="mout-form-group">
              <label className="mout-form-label">Chỉ số nước chốt (tùy chọn)</label>
              <input
                type="number"
                className="mout-form-input"
                value={waterIndex}
                onChange={(e) => setWaterIndex(e.target.value)}
                placeholder="VD: 320"
                min="0"
              />
            </div>
            {releaseError && <div className="mout-error-banner">{releaseError}</div>}
          </div>
        )}
      </AppModal>

      {/* 3. Modal Hoàn tất trả phòng */}
      <AppModal
        open={showCompleteModal && !!completingRequest}
        onClose={() => setShowCompleteModal(false)}
        title="Hoàn tất trả phòng"
        icon={<CheckCircle size={18} />}
        color="blue"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="ms-btn ms-btn--ghost"
              onClick={() => setShowCompleteModal(false)}
              disabled={completeLoading}
            >
              Hủy
            </button>
            <button
              type="button"
              className="ms-btn ms-btn--primary"
              onClick={handleComplete}
              disabled={completeLoading}
            >
              {completeLoading ? 'Đang xử lý...' : 'Xác nhận hoàn tất'}
            </button>
          </>
        }
      >
        {completingRequest && (
          <div className="mout-form-body">
            <div className="mout-info-box">
              <p className="mout-info-box-title">Xác nhận hoàn tất sẽ kết thúc quy trình trả phòng cho cư dân này.</p>
            </div>
            <div className="mout-info-grid">
              <div className="mout-info-row"><span className="mout-info-label">Cư dân</span><span className="mout-info-value">{getTenantFullName(completingRequest)}</span></div>
              <div className="mout-info-row"><span className="mout-info-label">Phòng</span><span className="mout-info-value">{getRoomNumber(completingRequest)}</span></div>
              <div className="mout-info-row"><span className="mout-info-label">Ngày trả phòng</span><span className="mout-info-value">{formatDate(completingRequest.expectedMoveOutDate)}</span></div>
            </div>
            <div className="mout-form-group">
              <label className="mout-form-label">Ghi chú hoàn tất (tùy chọn)</label>
              <textarea
                className="mout-form-textarea"
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                placeholder="Nhập ghi chú hoàn tất (nếu có)..."
                rows={3}
              />
            </div>
          </div>
        )}
      </AppModal>
    </div>
  );
}

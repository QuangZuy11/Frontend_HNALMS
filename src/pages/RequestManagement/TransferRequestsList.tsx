import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, Check, X, ArrowLeftRight,
  Clock, CheckCircle2, XCircle,
  Search, Filter, ArrowUpDown, FileText,
} from 'lucide-react';
import { AppModal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import { useToast } from '../../components/common/Toast';
import { transferRequestService } from '../../services/requestService';
import api from '../../services/api';
import './TransferRequestsList.css';

interface RoomType {
  typeName: string;
  currentPrice: number;
}

interface Floor {
  name: string;
}

interface Room {
  _id: string;
  name: string;
  roomCode?: string;
  floorId?: Floor | null;
  roomTypeId?: RoomType | null;
}

interface Tenant {
  _id: string;
  username: string;
  fullname?: string | null;
  email: string;
  phoneNumber?: string;
}

interface TransferRequest {
  _id: string;
  tenantId?: Tenant | null;
  currentRoomId?: Room | null;
  targetRoomId?: Room | null;
  reason?: string;
  note?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Cancelled';
  managerNote?: string;
  rejectReason?: string;
  completedAt?: string;
  createdAt: string;
  transferDate?: string | null;
}

interface Contract {
  _id?: string;
  status?: string;
  tenantId?: { _id?: string; phoneNumber?: string; email?: string } | string;
  roomId?: { _id?: string } | string;
  depositId?: { _id?: string } | string;
  duration?: number;
  tenantInfo?: Record<string, unknown>;
  coResidents?: unknown[];
  bookServices?: Array<{
    serviceId?: { _id?: string; name?: string; currentPrice?: number; type?: string } | string;
    name?: string;
    currentPrice?: number;
    type?: string;
    category?: string;
    quantity?: number;
  }>;
}

interface BookService {
  serviceId?: { _id?: string; name?: string; currentPrice?: number; type?: string } | string;
  name?: string;
  currentPrice?: number;
  type?: string;
  category?: string;
  quantity?: number;
}

type StatusFilter = 'ALL' | 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Cancelled';

const STATUS_LABELS: Record<string, string> = {
  Pending: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  InvoiceReleased: 'Chờ TT phát sinh',
  Paid: 'Đã thanh toán',
  Rejected: 'Từ chối',
  Completed: 'Đã hoàn tất',
  Cancelled: 'Đã hủy',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  Pending: 'trns-status-pending',
  Approved: 'trns-status-approved',
  InvoiceReleased: 'trns-status-pending',
  Paid: 'trns-status-approved',
  Rejected: 'trns-status-rejected',
  Completed: 'trns-status-completed',
  Cancelled: 'trns-status-cancelled',
};

export default function TransferRequestsList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<TransferRequest[]>([]);
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

  // Detail modal
  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null);

  // Approve modal
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState<TransferRequest | null>(null);
  const [managerNote, setManagerNote] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<TransferRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Complete modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingRequest, setCompletingRequest] = useState<TransferRequest | null>(null);
  const [completeLoading, setCompleteLoading] = useState(false);

  // Release Invoice modal
  const [showReleaseInvoiceModal, setShowReleaseInvoiceModal] = useState(false);
  const [releasingInvoiceRequest, setReleasingInvoiceRequest] = useState<TransferRequest | null>(null);
  const [electricIndex, setElectricIndex] = useState<string>('');
  const [waterIndex, setWaterIndex] = useState<string>('');
  const [managerInvoiceNotes, setManagerInvoiceNotes] = useState('');
  const [releaseInvoiceLoading, setReleaseInvoiceLoading] = useState(false);

  const tableRef = useRef<HTMLDivElement | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await transferRequestService.getAllTransferRequests({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search || undefined,
        page: currentPage,
        limit: itemsPerPage,
      });
      if (res.success && Array.isArray(res.data)) {
        setRequests(res.data);
        setTotalItems(res.total ?? 0);
        setTotalPages(res.totalPages ?? 0);
      } else {
        setRequests([]);
        setTotalItems(0);
        setTotalPages(0);
      }
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi tải dữ liệu', anyErr?.response?.data?.message || 'Không thể tải danh sách yêu cầu chuyển phòng');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, currentPage, itemsPerPage, showToast]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => { setCurrentPage(1); }, [statusFilter, search]);

  const handleSearch = () => setSearch(searchInput);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getRoomDisplay = (room?: Room | null) => room ? room.name : '-';

  const hasFilters = search || statusFilter !== 'ALL';
  const clearFilters = () => {
    setSearch('');
    setSearchInput('');
    setStatusFilter('ALL');
  };

  // ─── Stats ────────────────────────────────────────────────────────────────
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const completedCount = requests.filter(r => r.status === 'Completed').length;

  // ─── Sorted display ───────────────────────────────────────────────────────
  const displayedRequests = [...requests].sort((a, b) => {
    if (sortOption === 'name-asc') return (a.tenantId?.fullname || '').localeCompare(b.tenantId?.fullname || '');
    if (sortOption === 'name-desc') return (b.tenantId?.fullname || '').localeCompare(a.tenantId?.fullname || '');
    return 0;
  });

  // ─── Approve ──────────────────────────────────────────────────────────────
  const openApproveModal = (req: TransferRequest) => {
    setApprovingRequest(req);
    setManagerNote('');
    setShowApproveModal(true);
  };

  const handleApprove = async () => {
    if (!approvingRequest) return;
    try {
      setApproveLoading(true);
      await transferRequestService.approveTransferRequest(approvingRequest._id, managerNote);
      setShowApproveModal(false);
      setApprovingRequest(null);
      fetchRequests();
      if (selectedRequest?._id === approvingRequest._id) setSelectedRequest(null);
      showToast('success', 'Thành công', 'Đã duyệt yêu cầu chuyển phòng.');
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi', anyErr?.response?.data?.message || 'Duyệt yêu cầu thất bại');
    } finally {
      setApproveLoading(false);
    }
  };

  // ─── Reject ───────────────────────────────────────────────────────────────
  const openRejectModal = (req: TransferRequest) => {
    setRejectingRequest(req);
    setRejectReason('');
    setRejectReasonError('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectingRequest) return;
    if (!rejectReason.trim()) { setRejectReasonError('Vui lòng nhập lý do từ chối'); return; }
    try {
      setRejectLoading(true);
      await transferRequestService.rejectTransferRequest(rejectingRequest._id, rejectReason);
      setShowRejectModal(false);
      setRejectingRequest(null);
      fetchRequests();
      if (selectedRequest?._id === rejectingRequest._id) setSelectedRequest(null);
      showToast('success', 'Thành công', 'Đã từ chối yêu cầu chuyển phòng.');
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi', anyErr?.response?.data?.message || 'Từ chối yêu cầu thất bại');
    } finally {
      setRejectLoading(false);
    }
  };

  // ─── Release Invoice ──────────────────────────────────────────────────────
  const openReleaseInvoiceModal = (req: TransferRequest) => {
    setReleasingInvoiceRequest(req);
    setElectricIndex('');
    setWaterIndex('');
    setManagerInvoiceNotes('');
    setShowReleaseInvoiceModal(true);
  };

  const handleReleaseInvoice = async () => {
    if (!releasingInvoiceRequest) return;
    try {
      setReleaseInvoiceLoading(true);
      await transferRequestService.releaseTransferInvoice(releasingInvoiceRequest._id, {
        managerInvoiceNotes,
        electricIndex: electricIndex ? Number(electricIndex) : undefined,
        waterIndex: waterIndex ? Number(waterIndex) : undefined,
      });
      setShowReleaseInvoiceModal(false);
      setReleasingInvoiceRequest(null);
      fetchRequests();
      if (selectedRequest?._id === releasingInvoiceRequest._id) setSelectedRequest(null);
      showToast('success', 'Thành công', 'Đã phát hành hóa đơn chuyển phòng.');
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi', anyErr?.response?.data?.message || 'Phát hành hóa đơn thất bại');
    } finally {
      setReleaseInvoiceLoading(false);
    }
  };

  // ─── Complete ─────────────────────────────────────────────────────────────
  const openCompleteModal = (req: TransferRequest) => {
    setCompletingRequest(req);
    setShowCompleteModal(true);
  };

  const handleComplete = async () => {
    if (!completingRequest) return;
    try {
      setCompleteLoading(true);

      let oldDepositId: string | undefined;
      let oldContract: Contract | undefined;
      try {
        const contractsRes = await api.get('/contracts');
        if (contractsRes.data.success && Array.isArray(contractsRes.data.data)) {
          const tenantId = completingRequest.tenantId?._id;
          const currentRoomId = completingRequest.currentRoomId?._id;
          oldContract = (contractsRes.data.data as Contract[]).find((c: Contract) => {
            const cTenantId = typeof c.tenantId === 'object' ? c.tenantId?._id : c.tenantId;
            const cRoomId = typeof c.roomId === 'object' ? c.roomId?._id : c.roomId;
            return c.status === 'active' && cTenantId === tenantId && cRoomId === currentRoomId;
          });
        }
      } catch (fetchErr) {
        console.error('Không thể lấy dữ liệu hợp đồng cũ:', fetchErr);
      }

      await transferRequestService.completeTransferRequest(completingRequest._id, {
        transferDate: completingRequest.transferDate ?? undefined,
      });
      setShowCompleteModal(false);
      setCompletingRequest(null);
      if (selectedRequest?._id === completingRequest._id) setSelectedRequest(null);

      if (oldContract) {
        oldDepositId = typeof oldContract.depositId === 'object'
          ? oldContract.depositId?._id
          : oldContract.depositId;

        const tenantIdObj = typeof oldContract.tenantId === 'object' ? oldContract.tenantId : undefined;
        const tenantInfoObj = (oldContract.tenantInfo as Record<string, unknown>) || {};
        const draft = {
          formValues: {
            roomId: completingRequest.targetRoomId?._id || '',
            startDate: new Date().toISOString().split('T')[0],
            duration: oldContract.duration || 12,
            prepayMonths: 2,
            tenantInfo: {
              fullName: tenantInfoObj.fullName || tenantInfoObj.fullname || '',
              phone: tenantInfoObj.phone || tenantIdObj?.phoneNumber || '',
              email: tenantInfoObj.email || tenantIdObj?.email || '',
              address: tenantInfoObj.address || '',
              dob: tenantInfoObj.dob || '',
              cccd: tenantInfoObj.cccd || '',
              gender: tenantInfoObj.gender || 'Male',
              contactRef: tenantInfoObj.contactRef || '',
            },
            coResidents: oldContract.coResidents || [],
            roomSharer: (oldContract.coResidents?.length || 0) > 0,
          },
          selectedServices: (oldContract.bookServices || []).map((s: BookService) => {
            const serviceIdObj = typeof s.serviceId === 'object' ? s.serviceId : undefined;
            return {
              serviceId: serviceIdObj?._id || s.serviceId || '',
              name: serviceIdObj?.name || s.name || '',
              price: serviceIdObj?.currentPrice || s.currentPrice || 0,
              type: serviceIdObj?.type || s.type || '',
              category: s.category || 'fixed_monthly',
              quantity: s.quantity || 1,
            };
          }),
          vehicleQuantities: {},
          contractImages: [],
        };
        sessionStorage.setItem('contractFormDraft', JSON.stringify(draft));
      }

      showToast('success', 'Thành công', 'Hoàn tất chuyển phòng. Đang chuyển đến tạo hợp đồng mới...');
      navigate('/manager/contracts/create', {
        state: {
          roomId: completingRequest.targetRoomId?._id,
          depositId: oldDepositId,
          fromTransfer: true,
        },
      });
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi', anyErr?.response?.data?.message || 'Hoàn tất chuyển phòng thất bại');
    } finally {
      setCompleteLoading(false);
    }
  };

  // ─── Status icon ──────────────────────────────────────────────────────────
  const getStatusIcon = (status: string) => {
    if (status === 'Pending') return <Clock size={13} />;
    if (status === 'Approved') return <CheckCircle2 size={13} />;
    if (status === 'Rejected' || status === 'Cancelled') return <XCircle size={13} />;
    if (status === 'Completed') return <CheckCircle2 size={13} />;
    return null;
  };

  return (
    <div className="trns-container">
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="trns-header">
        <div className="trns-header-top">
          <div className="trns-title-block">
            <div className="trns-title-row">
              <div className="trns-title-icon" aria-hidden>
                <ArrowLeftRight size={22} strokeWidth={2} />
              </div>
              <div className="trns-title-text">
                <h2>Quản lý Yêu cầu Chuyển phòng</h2>
                <p className="trns-subtitle">
                  Các yêu cầu chuyển phòng của cư dân tòa nhà Hoàng Nam.
                </p>
              </div>
            </div>
          </div>

          <div className="trns-header-aside">
            <div className="trns-stats-summary">
              <div className="trns-stat-item">
                <div className="trns-stat-icon icon-primary">
                  <ArrowLeftRight size={16} strokeWidth={2} />
                </div>
                <div className="trns-stat-text">
                  <span className="trns-stat-value">{totalCount}</span>
                  <span className="trns-stat-label">Tổng số</span>
                </div>
              </div>
              <div className="trns-stat-divider" />
              <div className="trns-stat-item">
                <div className="trns-stat-icon icon-warning">
                  <Clock size={16} strokeWidth={2} />
                </div>
                <div className="trns-stat-text">
                  <span className="trns-stat-value">{pendingCount}</span>
                  <span className="trns-stat-label">Chờ duyệt</span>
                </div>
              </div>
              <div className="trns-stat-divider" />
              <div className="trns-stat-item">
                <div className="trns-stat-icon icon-accent">
                  <CheckCircle2 size={16} strokeWidth={2} />
                </div>
                <div className="trns-stat-text">
                  <span className="trns-stat-value">{completedCount}</span>
                  <span className="trns-stat-label">Đã hoàn tất</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ────────────────────────────────────────────────────── */}
      <div className="trns-toolbar">
        <div className="trns-toolbar-left">
          <div className="trns-search-box">
            <Search size={18} className="trns-search-icon" />
            <input
              type="text"
              className="trns-search-input"
              placeholder="Tìm theo tên cư dân..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSearch}
            />
          </div>

          <div className="trns-control-group">
            <Filter size={16} className="trns-toolbar-icon" />
            <select
              className="trns-custom-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Pending">Chờ duyệt</option>
              <option value="Approved">Đã duyệt</option>
              <option value="InvoiceReleased">Chờ thanh toán</option>
              <option value="Paid">Đã thanh toán</option>
              <option value="Rejected">Từ chối</option>
              <option value="Completed">Đã hoàn tất</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
          </div>

          {hasFilters && (
            <button type="button" className="trns-btn-clear-filter" onClick={clearFilters}>
              Xóa lọc
            </button>
          )}
        </div>

        <div className="trns-toolbar-right">
          <ArrowUpDown size={16} className="trns-toolbar-icon" />
          <select
            className="trns-custom-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="newest">Mới nhất</option>
            <option value="name-asc">Tên: A - Z</option>
            <option value="name-desc">Tên: Z - A</option>
          </select>
        </div>
      </div>

      {/* ── TABLE ──────────────────────────────────────────────────────── */}
      <div className="trns-table-container" ref={tableRef}>
        <table className="trns-table">
          <thead>
            <tr>
              <th className="trns-cell-stt">STT</th>
              <th className="trns-cell-tenant">Cư dân</th>
              <th className="trns-cell-room">Phòng hiện tại</th>
              <th className="trns-cell-price">Giá phòng cũ</th>
              <th className="trns-cell-room">Phòng chuyển</th>
              <th className="trns-cell-price">Giá phòng mới</th>
              <th className="trns-cell-date">Ngày tạo</th>
              <th className="trns-cell-date">Ngày chuyển</th>
              <th className="trns-cell-status">Trạng thái</th>
              <th className="trns-cell-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {displayedRequests.length > 0 ? (
              displayedRequests.map((req, idx) => (
                <tr key={req._id}>
                  <td className="trns-cell-stt">
                    {(currentPage - 1) * itemsPerPage + idx + 1}
                  </td>
                  <td className="trns-cell-tenant">
                    {req.tenantId?.fullname ?? req.tenantId?.username ?? '-'}
                  </td>
                  <td className="trns-cell-room">
                    <span className="trns-room-badge">{getRoomDisplay(req.currentRoomId)}</span>
                  </td>
                  <td className="trns-cell-price">
                    {formatCurrency(req.currentRoomId?.roomTypeId?.currentPrice)}
                  </td>
                  <td className="trns-cell-room">
                    <span className="trns-room-badge trns-room-badge--target">{getRoomDisplay(req.targetRoomId)}</span>
                  </td>
                  <td className="trns-cell-price">
                    {formatCurrency(req.targetRoomId?.roomTypeId?.currentPrice)}
                  </td>
                  <td className="trns-cell-date">{formatDate(req.createdAt)}</td>
                  <td className="trns-cell-date">
                    {req.transferDate ? formatDate(req.transferDate) : '-'}
                  </td>
                  <td className="trns-cell-status">
                    <span className={`trns-status-badge ${STATUS_BADGE_CLASS[req.status] ?? ''}`}>
                      {getStatusIcon(req.status)}
                      {STATUS_LABELS[req.status] ?? req.status}
                    </span>
                  </td>
                  <td className="trns-cell-actions">
                    <div className="trns-table-actions">
                      <button
                        className="trns-btn-icon trns-btn-view"
                        title="Xem chi tiết"
                        onClick={() => setSelectedRequest(req)}
                      >
                        <Eye size={16} />
                      </button>
                      {req.status === 'Pending' && (
                        <>
                          <button
                            className="trns-btn-icon trns-btn-approve"
                            title="Duyệt"
                            onClick={() => openApproveModal(req)}
                          >
                            <Check size={15} />
                          </button>
                          <button
                            className="trns-btn-icon trns-btn-reject"
                            title="Từ chối"
                            onClick={() => openRejectModal(req)}
                          >
                            <X size={15} />
                          </button>
                        </>
                      )}
                      {req.status === 'Approved' && (
                        <button
                          className="trns-btn-icon trns-btn-invoice"
                          title="Phát hành hóa đơn"
                          onClick={() => openReleaseInvoiceModal(req)}
                        >
                          <FileText size={15} />
                        </button>
                      )}
                      {req.status === 'Paid' && (
                        <button
                          className="trns-btn-icon trns-btn-complete"
                          title="Hoàn tất chuyển phòng"
                          onClick={() => openCompleteModal(req)}
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="trns-table-empty-cell">
                  {loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy yêu cầu chuyển phòng nào phù hợp.'}
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
        title="Chi tiết yêu cầu chuyển phòng"
        icon={<ArrowLeftRight size={18} />}
        color="blue"
        size="md"
        footer={
          <>
            <button
              type="button"
              className="ms-btn ms-btn--ghost"
              onClick={() => setSelectedRequest(null)}
            >
              Đóng
            </button>
            {selectedRequest?.status === 'Pending' && (
              <>
                <button
                  type="button"
                  className="ms-btn ms-btn--danger"
                  onClick={() => { setSelectedRequest(null); openRejectModal(selectedRequest!); }}
                >
                  <X size={15} /> Từ chối
                </button>
                <button
                  type="button"
                  className="ms-btn ms-btn--primary"
                  onClick={() => { setSelectedRequest(null); openApproveModal(selectedRequest!); }}
                >
                  <Check size={15} /> Duyệt yêu cầu
                </button>
              </>
            )}
            {selectedRequest?.status === 'Approved' && (
              <button
                type="button"
                className="ms-btn ms-btn--primary"
                onClick={() => { setSelectedRequest(null); openReleaseInvoiceModal(selectedRequest!); }}
              >
                <FileText size={15} /> Phát hành hóa đơn
              </button>
            )}
            {selectedRequest?.status === 'Paid' && (
              <button
                type="button"
                className="ms-btn ms-btn--primary"
                onClick={() => { setSelectedRequest(null); openCompleteModal(selectedRequest!); }}
              >
                <CheckCircle2 size={15} /> Hoàn tất chuyển phòng
              </button>
            )}
          </>
        }
      >
        {selectedRequest && (
          <div className="trns-detail-body">
            {/* Profile strip */}
            <div className="trns-profile-strip">
              <div className="trns-avatar">
                {(selectedRequest.tenantId?.fullname || selectedRequest.tenantId?.username || '?').charAt(0).toUpperCase()}
              </div>
              <div className="trns-profile-info">
                <div className="trns-profile-name">
                  {selectedRequest.tenantId?.fullname ?? selectedRequest.tenantId?.username ?? '-'}
                </div>
                <div className="trns-profile-meta">
                  <span className="trns-meta-tag">
                    {getRoomDisplay(selectedRequest.currentRoomId)} → {getRoomDisplay(selectedRequest.targetRoomId)}
                  </span>
                  <span className={`trns-status-tag ${STATUS_BADGE_CLASS[selectedRequest.status] ?? ''}`}>
                    {getStatusIcon(selectedRequest.status)}
                    {STATUS_LABELS[selectedRequest.status] ?? selectedRequest.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="trns-two-col">
              {/* Left */}
              <div className="trns-col">
                <div className="trns-section">
                  <div className="trns-section-title">
                    <ArrowLeftRight size={14} /> Thông tin phòng
                  </div>
                  <div className="trns-rows">
                    <div className="trns-row">
                      <span className="trns-label">Phòng hiện tại</span>
                      <span className="trns-value">{getRoomDisplay(selectedRequest.currentRoomId)}</span>
                    </div>
                    {selectedRequest.currentRoomId?.roomTypeId && (
                      <div className="trns-row">
                        <span className="trns-label">Loại phòng cũ</span>
                        <span className="trns-value">
                          {selectedRequest.currentRoomId.roomTypeId.typeName} — {formatCurrency(selectedRequest.currentRoomId.roomTypeId.currentPrice)}
                        </span>
                      </div>
                    )}
                    <div className="trns-row">
                      <span className="trns-label">Phòng muốn chuyển</span>
                      <span className="trns-value">{getRoomDisplay(selectedRequest.targetRoomId)}</span>
                    </div>
                    {selectedRequest.targetRoomId?.roomTypeId && (
                      <div className="trns-row">
                        <span className="trns-label">Loại phòng mới</span>
                        <span className="trns-value">
                          {selectedRequest.targetRoomId.roomTypeId.typeName} — {formatCurrency(selectedRequest.targetRoomId.roomTypeId.currentPrice)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right */}
              <div className="trns-col">
                <div className="trns-section">
                  <div className="trns-section-title">
                    <Clock size={14} /> Thông tin yêu cầu
                  </div>
                  <div className="trns-rows">
                    <div className="trns-row">
                      <span className="trns-label">Email</span>
                      <span className="trns-value">{selectedRequest.tenantId?.email ?? '-'}</span>
                    </div>
                    <div className="trns-row">
                      <span className="trns-label">SĐT</span>
                      <span className="trns-value">{selectedRequest.tenantId?.phoneNumber ?? '-'}</span>
                    </div>
                    <div className="trns-row">
                      <span className="trns-label">Ngày gửi</span>
                      <span className="trns-value">{formatDate(selectedRequest.createdAt)}</span>
                    </div>
                    <div className="trns-row">
                      <span className="trns-label">Ngày chuyển</span>
                      <span className="trns-value">
                        {selectedRequest.transferDate ? formatDate(selectedRequest.transferDate) : '-'}
                      </span>
                    </div>
                    <div className="trns-row">
                      <span className="trns-label">Lý do</span>
                      <span className="trns-value">{selectedRequest.reason || '-'}</span>
                    </div>
                    {selectedRequest.note && (
                      <div className="trns-row">
                        <span className="trns-label">Ghi chú</span>
                        <span className="trns-value">{selectedRequest.note}</span>
                      </div>
                    )}
                    {selectedRequest.managerNote && (
                      <div className="trns-row">
                        <span className="trns-label">Ghi chú duyệt</span>
                        <span className="trns-value">{selectedRequest.managerNote}</span>
                      </div>
                    )}
                    {selectedRequest.rejectReason && (
                      <div className="trns-row">
                        <span className="trns-label">Lý do từ chối</span>
                        <span className="trns-value trns-value--danger">{selectedRequest.rejectReason}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppModal>

      {/* 2. Modal Duyệt */}
      <AppModal
        open={showApproveModal && !!approvingRequest}
        onClose={() => setShowApproveModal(false)}
        title="Duyệt yêu cầu chuyển phòng"
        icon={<Check size={18} />}
        color="blue"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="ms-btn ms-btn--ghost"
              onClick={() => setShowApproveModal(false)}
              disabled={approveLoading}
            >
              Hủy
            </button>
            <button
              type="button"
              className="ms-btn ms-btn--primary"
              onClick={handleApprove}
              disabled={approveLoading}
            >
              {approveLoading ? 'Đang xử lý...' : 'Xác nhận duyệt'}
            </button>
          </>
        }
      >
        {approvingRequest && (
          <div className="trns-form-body">
            <p className="trns-form-desc">
              Duyệt yêu cầu chuyển từ phòng <strong>{getRoomDisplay(approvingRequest.currentRoomId)}</strong> sang phòng{' '}
              <strong>{getRoomDisplay(approvingRequest.targetRoomId)}</strong> của cư dân{' '}
              <strong>{approvingRequest.tenantId?.fullname}</strong>?
            </p>
            <div className="trns-form-group">
              <label className="trns-form-label">Ghi chú (tùy chọn)</label>
              <textarea
                className="trns-form-textarea"
                value={managerNote}
                onChange={(e) => setManagerNote(e.target.value)}
                placeholder="Nhập ghi chú cho cư dân..."
                rows={3}
              />
            </div>
          </div>
        )}
      </AppModal>

      {/* 3. Modal Từ chối */}
      <AppModal
        open={showRejectModal && !!rejectingRequest}
        onClose={() => setShowRejectModal(false)}
        title="Từ chối yêu cầu chuyển phòng"
        icon={<X size={18} />}
        color="red"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="ms-btn ms-btn--ghost"
              onClick={() => setShowRejectModal(false)}
              disabled={rejectLoading}
            >
              Hủy
            </button>
            <button
              type="button"
              className="ms-btn ms-btn--danger"
              onClick={handleReject}
              disabled={rejectLoading}
            >
              {rejectLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </button>
          </>
        }
      >
        {rejectingRequest && (
          <div className="trns-form-body">
            <p className="trns-form-desc">
              Từ chối yêu cầu của cư dân <strong>{rejectingRequest.tenantId?.fullname}</strong>?
            </p>
            <div className="trns-form-group">
              <label className="trns-form-label">
                Lý do từ chối <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                className={`trns-form-textarea${rejectReasonError ? ' trns-input-error' : ''}`}
                value={rejectReason}
                onChange={(e) => { setRejectReason(e.target.value); setRejectReasonError(''); }}
                placeholder="Nhập lý do từ chối..."
                rows={3}
              />
              {rejectReasonError && <span className="trns-error-msg">{rejectReasonError}</span>}
            </div>
          </div>
        )}
      </AppModal>

      {/* 4. Modal Phát hành hóa đơn */}
      <AppModal
        open={showReleaseInvoiceModal && !!releasingInvoiceRequest}
        onClose={() => setShowReleaseInvoiceModal(false)}
        title="Phát hành hóa đơn chuyển phòng"
        icon={<FileText size={18} />}
        color="blue"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="ms-btn ms-btn--ghost"
              onClick={() => setShowReleaseInvoiceModal(false)}
              disabled={releaseInvoiceLoading}
            >
              Hủy
            </button>
            <button
              type="button"
              className="ms-btn ms-btn--primary"
              onClick={handleReleaseInvoice}
              disabled={releaseInvoiceLoading}
            >
              {releaseInvoiceLoading ? 'Đang phát hành...' : 'Phát hành hóa đơn'}
            </button>
          </>
        }
      >
        {releasingInvoiceRequest && (
          <div className="trns-form-body">
            <p className="trns-form-desc">
              Chốt hóa đơn phòng <strong>{getRoomDisplay(releasingInvoiceRequest.currentRoomId)}</strong> đến ngày chuyển{' '}
              (<strong>{releasingInvoiceRequest.transferDate ? formatDate(releasingInvoiceRequest.transferDate) : '-'}</strong>).
            </p>
            <div className="trns-form-group">
              <label className="trns-form-label">Chỉ số điện cuối cùng (Phòng cũ)</label>
              <input
                type="number"
                className="trns-form-input"
                placeholder="Để trống nếu dùng chỉ số gần nhất..."
                value={electricIndex}
                onChange={(e) => setElectricIndex(e.target.value)}
              />
            </div>
            <div className="trns-form-group">
              <label className="trns-form-label">Chỉ số nước cuối cùng (Phòng cũ)</label>
              <input
                type="number"
                className="trns-form-input"
                placeholder="Để trống nếu dùng chỉ số gần nhất..."
                value={waterIndex}
                onChange={(e) => setWaterIndex(e.target.value)}
              />
            </div>
            <div className="trns-form-group">
              <label className="trns-form-label">Ghi chú hóa đơn</label>
              <textarea
                className="trns-form-textarea"
                value={managerInvoiceNotes}
                onChange={(e) => setManagerInvoiceNotes(e.target.value)}
                placeholder="Ghi chú thêm về việc phát hành hóa đơn..."
                rows={2}
              />
            </div>
          </div>
        )}
      </AppModal>

      {/* 5. Modal Hoàn tất chuyển phòng */}
      <AppModal
        open={showCompleteModal && !!completingRequest}
        onClose={() => setShowCompleteModal(false)}
        title="Hoàn tất chuyển phòng"
        icon={<CheckCircle2 size={18} />}
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
          <div className="trns-form-body">
            <p className="trns-form-desc">
              Xác nhận hoàn tất chuyển phòng cho cư dân <strong>{completingRequest.tenantId?.fullname}</strong> từ phòng{' '}
              <strong>{getRoomDisplay(completingRequest.currentRoomId)}</strong> sang phòng{' '}
              <strong>{getRoomDisplay(completingRequest.targetRoomId)}</strong>?
            </p>
            <div className="trns-info-box">
              <p className="trns-info-box-title">Xử lý sau khi hoàn tất:</p>
              <ul className="trns-info-box-list">
                <li>Ngày chuyển: {completingRequest.transferDate ? formatDate(completingRequest.transferDate) : '-'}</li>
                <li>Hợp đồng hiện tại → trạng thái "Đã thanh lý"</li>
                <li>Hợp đồng mới → tạo từ dữ liệu hợp đồng cũ</li>
                <li>Tiền cọc → chuyển sang hợp đồng mới</li>
              </ul>
            </div>
          </div>
        )}
      </AppModal>
    </div>
  );
}

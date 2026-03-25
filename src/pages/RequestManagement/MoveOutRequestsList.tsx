import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, CheckCircle } from 'lucide-react';
import { moveOutService } from '../../services/moveOutService';
import './MoveOutRequestsList.css';

// Backend model fields
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
  requestDate?: string;
  expectedMoveOutDate?: string;
  reason?: string;
  status: 'Requested' | 'Approved' | 'InProcess' | 'Completed' | 'Cancelled';
  isEarlyNotice?: boolean;
  isUnderMinStay?: boolean;
  isDepositForfeited?: boolean;
  completedDate?: string;
  managerCompletionNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

type StatusFilter = 'ALL' | 'Requested' | 'Approved' | 'InProcess' | 'Completed' | 'Cancelled';

const STATUS_LABELS: Record<string, string> = {
  Requested: 'Chờ xác nhận',
  Approved: 'Đã duyệt',
  InProcess: 'Đang xử lý',
  Completed: 'Đã hoàn tất',
  Cancelled: 'Đã hủy',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  Requested: 'status-requested',
  Approved: 'status-approved',
  InProcess: 'status-inprocess',
  Completed: 'status-completed',
  Cancelled: 'status-cancelled',
};

// Statuses that manager can still complete
const COMPLETABLE_STATUSES = ['Requested', 'Approved', 'InProcess'];

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

  // Detail modal
  const [selectedRequest, setSelectedRequest] = useState<MoveOutRequestItem | null>(null);

  // Complete modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingRequest, setCompletingRequest] = useState<MoveOutRequestItem | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [completeLoading, setCompleteLoading] = useState(false);

  const tableRef = useRef<HTMLDivElement | null>(null);

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
        // If tenantId is empty/null, try to enrich from detail endpoint
        const enrichedData = await Promise.all(
          res.data.map(async (req) => {
            if (!req.tenantId || (typeof req.tenantId === 'object' && !req.tenantId._id)) {
              try {
                const detailRes = await moveOutService.getMoveOutRequestById(req._id);
                if (detailRes.data?.tenantId) {
                  return { ...req, tenantId: detailRes.data.tenantId };
                }
              } catch (e) {
                console.warn(`[WARN] Failed to enrich tenantId for ${req._id}`, e);
              }
            }
            return req;
          })
        );

        setRequests(enrichedData);
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

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

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
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getTenantFullName = (req: MoveOutRequestItem) =>
    req.tenantId?.fullName || req.tenantId?.fullname || req.tenantId?.username || '-';

  const getRoomNumber = (req: MoveOutRequestItem) => {
    if (req.contractId && typeof req.contractId === 'object') {
      return req.contractId.roomId?.name || req.contractId.roomId?.roomCode || '-';
    }
    return '-';
  };

  // ---- Complete ----
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

  // ---- Pagination ----
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
              <option value="Requested">Chờ xác nhận</option>
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

        {/* Error */}
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
                    <td>
                      <span className="cell-title">{getTenantFullName(req)}</span>
                    </td>
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
                        <button
                          className="btn-view-detail"
                          title="Xem chi tiết"
                          onClick={() => setSelectedRequest(req)}
                        >
                          <Eye size={16} />
                        </button>
                        {COMPLETABLE_STATUSES.includes(req.status) && (
                          <button
                            className="btn-approve"
                            title="Xác nhận hoàn thành"
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

        {/* Pagination */}
        {renderPagination()}
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Chi tiết yêu cầu trả phòng</h2>
              <button className="btn-close" onClick={() => setSelectedRequest(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <label>Cư dân:</label>
                <span>{selectedRequest.tenantId?.fullName ?? selectedRequest.tenantId?.fullname ?? selectedRequest.tenantId?.username ?? '-'}</span>
              </div>
              <div className="detail-row">
                <label>Phòng:</label>
                <span>{getRoomNumber(selectedRequest)}</span>
              </div>
              <div className="detail-row">
                <label>Lý do:</label>
                <span>{selectedRequest.reason ?? '-'}</span>
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
              {selectedRequest.isEarlyNotice && (
                <div className="detail-row">
                  <label>Cảnh báo:</label>
                  <span style={{ color: '#b91c1c' }}>Báo trả phòng gấp (dưới 30 ngày)</span>
                </div>
              )}
              {selectedRequest.isUnderMinStay && (
                <div className="detail-row">
                  <label>Cảnh báo:</label>
                  <span style={{ color: '#b91c1c' }}>Thời gian ở chưa đủ 3 tháng</span>
                </div>
              )}
              {selectedRequest.isDepositForfeited && (
                <div className="detail-row">
                  <label>Tiền cọc:</label>
                  <span style={{ color: '#b91c1c' }}>Mất cọc</span>
                </div>
              )}
              {selectedRequest.completedDate && (
                <div className="detail-row">
                  <label>Ngày hoàn tất:</label>
                  <span>{formatDate(selectedRequest.completedDate)}</span>
                </div>
              )}
              {selectedRequest.managerCompletionNotes && (
                <div className="detail-row">
                  <label>Ghi chú hoàn tất:</label>
                  <span>{selectedRequest.managerCompletionNotes}</span>
                </div>
              )}
              {COMPLETABLE_STATUSES.includes(selectedRequest.status) && (
                <div className="detail-actions" style={{ marginTop: 16 }}>
                  <button
                    className="btn-approve"
                    style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => { setSelectedRequest(null); openCompleteModal(selectedRequest); }}
                  >
                    <CheckCircle size={15} /> Xác nhận hoàn thành
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && completingRequest && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Xác nhận hoàn thành trả phòng</h2>
              <button className="btn-close" onClick={() => setShowCompleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
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
              <div className="form-group">
                <label htmlFor="completionNote">Ghi chú (tùy chọn):</label>
                <textarea
                  id="completionNote"
                  className="form-textarea"
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="Nhập ghi chú hoàn thành (nếu có)..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCompleteModal(false)}>
                Hủy
              </button>
              <button className="btn-approve-modal" onClick={handleComplete} disabled={completeLoading}>
                {completeLoading ? 'Đang xử lý...' : 'Xác nhận hoàn thành'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

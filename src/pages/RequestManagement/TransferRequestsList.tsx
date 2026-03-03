import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, Check, X } from 'lucide-react';
import { transferRequestService } from '../../services/requestService';
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
  status: 'Pending' | 'Approved' | 'Rejected';
  managerNote?: string;
  rejectReason?: string;
  createdAt: string;
}

type StatusFilter = 'ALL' | 'Pending' | 'Approved' | 'Rejected';

const STATUS_LABELS: Record<string, string> = {
  Pending: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  Pending: 'status-pending',
  Approved: 'status-approved',
  Rejected: 'status-rejected',
};

export default function TransferRequestsList() {
  const [requests, setRequests] = useState<TransferRequest[]>([]);
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

  const tableRef = useRef<HTMLDivElement | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
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
      setError(anyErr?.response?.data?.message || 'Không thể tải danh sách yêu cầu chuyển phòng');
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

  const handleSearch = () => {
    setSearch(searchInput);
  };

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

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getRoomDisplay = (room?: Room | null) => {
    if (!room) return '-';
    return room.name;
  };

  // ---- Approve ----
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
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      alert(anyErr?.response?.data?.message || 'Duyệt yêu cầu thất bại');
    } finally {
      setApproveLoading(false);
    }
  };

  // ---- Reject ----
  const openRejectModal = (req: TransferRequest) => {
    setRejectingRequest(req);
    setRejectReason('');
    setRejectReasonError('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectingRequest) return;
    if (!rejectReason.trim()) {
      setRejectReasonError('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      setRejectLoading(true);
      await transferRequestService.rejectTransferRequest(rejectingRequest._id, rejectReason);
      setShowRejectModal(false);
      setRejectingRequest(null);
      fetchRequests();
      if (selectedRequest?._id === rejectingRequest._id) setSelectedRequest(null);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      alert(anyErr?.response?.data?.message || 'Từ chối yêu cầu thất bại');
    } finally {
      setRejectLoading(false);
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
      <div className="tr-pagination">
        <div className="tr-pagination-info">
          <span>Tổng <strong>{totalItems}</strong> yêu cầu</span>
          <div className="tr-pagination-items-per-page">
            <label>Hiển thị:</label>
            <select
              className="tr-pagination-select"
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            >
              {[10, 20, 50].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="tr-pagination-controls">
          <button className="pagination-arrow-btn" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>‹</button>
          {pages.map((p, i) =>
            p === 'ellipsis'
              ? <span key={`e-${i}`} className="tr-pagination-ellipsis">…</span>
              : <button key={p} className={`tr-pagination-number${currentPage === p ? ' active' : ''}`} onClick={() => handlePageChange(p as number)}>{p}</button>
          )}
          <button className="pagination-arrow-btn" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>›</button>
        </div>
      </div>
    );
  };

  return (
    <div className="tr-page">
      <div className="tr-card">
        {/* Header */}
        <div className="tr-header">
          <div>
            <h1>Yêu cầu chuyển phòng</h1>
            <p className="subtitle">Quản lý các yêu cầu chuyển phòng của cư dân</p>
          </div>
          <button className="btn-refresh" onClick={fetchRequests} disabled={loading}>
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>

        {/* Filters */}
        <div className="tr-filters">
          <div className="tr-filter-group">
            <label className="tr-filter-label">Trạng thái:</label>
            <select
              className="tr-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="ALL">Tất cả</option>
              <option value="Pending">Chờ duyệt</option>
              <option value="Approved">Đã duyệt</option>
              <option value="Rejected">Từ chối</option>
            </select>
          </div>
          <div className="tr-search-group">
            <input
              type="text"
              className="tr-search-input"
              placeholder="Tìm kiếm theo tên, email, số điện thoại..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="btn-search" onClick={handleSearch}>Tìm kiếm</button>
          </div>
        </div>

        {/* Error */}
        {error && <div className="tr-error">{error}</div>}

        {/* Table */}
        <div className="tr-table-wrap" ref={tableRef}>
          {loading ? (
            <div className="tr-loading">Đang tải dữ liệu...</div>
          ) : requests.length === 0 ? (
            <div className="tr-empty">Không có yêu cầu chuyển phòng nào phù hợp.</div>
          ) : (
            <table className="tr-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Cư dân</th>
                  <th>Phòng hiện tại</th>
                  <th>Giá phòng cũ</th>
                  <th>Phòng muốn chuyển</th>
                  <th>Giá phòng mới</th>
                  <th>Ngày tạo</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req, idx) => (
                  <tr key={req._id}>
                    <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td>
                      <span className="cell-title">{req.tenantId?.fullname ?? '-'}</span>
                    </td>
                    <td>{getRoomDisplay(req.currentRoomId)}</td>
                    <td>{formatCurrency(req.currentRoomId?.roomTypeId?.currentPrice)}</td>
                    <td>{getRoomDisplay(req.targetRoomId)}</td>
                    <td>{formatCurrency(req.targetRoomId?.roomTypeId?.currentPrice)}</td>
                    <td>{formatDate(req.createdAt)}</td>
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
                        {req.status === 'Pending' && (
                          <>
                            <button
                              className="btn-approve"
                              title="Duyệt"
                              onClick={() => openApproveModal(req)}
                            >
                              <Check size={15} />
                            </button>
                            <button
                              className="btn-reject"
                              title="Từ chối"
                              onClick={() => openRejectModal(req)}
                            >
                              <X size={15} />
                            </button>
                          </>
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

      {/* ---- Detail Modal ---- */}
      {selectedRequest && (
        <div className="tr-modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="tr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tr-modal-header">
              <h2>Chi tiết yêu cầu chuyển phòng</h2>
              <button className="modal-close-btn" onClick={() => setSelectedRequest(null)}>×</button>
            </div>
            <div className="tr-modal-body">
              <div className="detail-row">
                <span className="detail-label">Cư dân:</span>
                <span className="detail-value">{selectedRequest.tenantId?.fullname ?? '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{selectedRequest.tenantId?.email ?? '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Số điện thoại:</span>
                <span className="detail-value">{selectedRequest.tenantId?.phoneNumber ?? '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phòng hiện tại:</span>
                <span className="detail-value">{getRoomDisplay(selectedRequest.currentRoomId)}</span>
              </div>
              {selectedRequest.currentRoomId?.roomTypeId && (
                <div className="detail-row">
                  <span className="detail-label">Giá phòng cũ:</span>
                  <span className="detail-value">
                    {selectedRequest.currentRoomId.roomTypeId.typeName} — {formatCurrency(selectedRequest.currentRoomId.roomTypeId.currentPrice)}
                  </span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Phòng muốn chuyển:</span>
                <span className="detail-value">{getRoomDisplay(selectedRequest.targetRoomId)}</span>
              </div>
              {selectedRequest.targetRoomId?.roomTypeId && (
                <div className="detail-row">
                  <span className="detail-label">Loại phòng mới:</span>
                  <span className="detail-value">
                    {selectedRequest.targetRoomId.roomTypeId.typeName} — {formatCurrency(selectedRequest.targetRoomId.roomTypeId.currentPrice)}
                  </span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Lý do:</span>
                <span className="detail-value">{selectedRequest.reason || '-'}</span>
              </div>
              {selectedRequest.note && (
                <div className="detail-row">
                  <span className="detail-label">Ghi chú:</span>
                  <span className="detail-value">{selectedRequest.note}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Ngày gửi:</span>
                <span className="detail-value">{formatDate(selectedRequest.createdAt)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Trạng thái:</span>
                <span className={`status-badge ${STATUS_BADGE_CLASS[selectedRequest.status] ?? ''}`}>
                  {STATUS_LABELS[selectedRequest.status] ?? selectedRequest.status}
                </span>
              </div>
              {selectedRequest.managerNote && (
                <div className="detail-row">
                  <span className="detail-label">Ghi chú duyệt:</span>
                  <span className="detail-value">{selectedRequest.managerNote}</span>
                </div>
              )}
              {selectedRequest.rejectReason && (
                <div className="detail-row">
                  <span className="detail-label">Lý do từ chối:</span>
                  <span className="detail-value" style={{ color: '#b91c1c' }}>{selectedRequest.rejectReason}</span>
                </div>
              )}
              {selectedRequest.status === 'Pending' && (
                <div className="detail-actions">
                  <button
                    className="btn-approve-full"
                    onClick={() => { setSelectedRequest(null); openApproveModal(selectedRequest); }}
                  >
                    <Check size={15} /> Duyệt yêu cầu
                  </button>
                  <button
                    className="btn-reject-full"
                    onClick={() => { setSelectedRequest(null); openRejectModal(selectedRequest); }}
                  >
                    <X size={15} /> Từ chối
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Approve Modal ---- */}
      {showApproveModal && approvingRequest && (
        <div className="tr-modal-overlay" onClick={() => setShowApproveModal(false)}>
          <div className="tr-modal tr-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="tr-modal-header">
              <h2>Duyệt yêu cầu chuyển phòng</h2>
              <button className="modal-close-btn" onClick={() => setShowApproveModal(false)}>×</button>
            </div>
            <div className="tr-modal-body">
              <p style={{ marginBottom: 12, color: '#374151' }}>
                Duyệt yêu cầu chuyển từ phòng <strong>{getRoomDisplay(approvingRequest.currentRoomId)}</strong> sang phòng{' '}
                <strong>{getRoomDisplay(approvingRequest.targetRoomId)}</strong> của cư dân{' '}
                <strong>{approvingRequest.tenantId?.fullname}</strong>?
              </p>
              <div className="complete-form-group">
                <label>Ghi chú (tùy chọn)</label>
                <textarea
                  value={managerNote}
                  onChange={(e) => setManagerNote(e.target.value)}
                  placeholder="Nhập ghi chú cho cư dân..."
                  rows={3}
                />
              </div>
              <div className="complete-form-actions">
                <button className="btn-cancel" onClick={() => setShowApproveModal(false)} disabled={approveLoading}>
                  Hủy
                </button>
                <button className="btn-submit btn-approve-submit" onClick={handleApprove} disabled={approveLoading}>
                  {approveLoading ? 'Đang xử lý...' : 'Xác nhận duyệt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Reject Modal ---- */}
      {showRejectModal && rejectingRequest && (
        <div className="tr-modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="tr-modal tr-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="tr-modal-header">
              <h2>Từ chối yêu cầu chuyển phòng</h2>
              <button className="modal-close-btn" onClick={() => setShowRejectModal(false)}>×</button>
            </div>
            <div className="tr-modal-body">
              <p style={{ marginBottom: 12, color: '#374151' }}>
                Từ chối yêu cầu của cư dân <strong>{rejectingRequest.tenantId?.fullname}</strong>?
              </p>
              <div className="complete-form-group">
                <label>Lý do từ chối <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea
                  className={rejectReasonError ? 'input-error' : ''}
                  value={rejectReason}
                  onChange={(e) => { setRejectReason(e.target.value); setRejectReasonError(''); }}
                  placeholder="Nhập lý do từ chối..."
                  rows={3}
                />
                {rejectReasonError && <span className="error-message">{rejectReasonError}</span>}
              </div>
              <div className="complete-form-actions">
                <button className="btn-cancel" onClick={() => setShowRejectModal(false)} disabled={rejectLoading}>
                  Hủy
                </button>
                <button className="btn-submit btn-reject-submit" onClick={handleReject} disabled={rejectLoading}>
                  {rejectLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

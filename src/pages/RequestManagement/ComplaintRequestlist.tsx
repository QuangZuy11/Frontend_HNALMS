import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye, AlertCircle,
  CheckCircle2, XCircle,
  Clock, Filter, ArrowUpDown,
  Search, LayoutGrid,
  MessageSquareWarning,
  Check,
} from 'lucide-react';
import { AppModal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import { useToast } from '../../components/common/Toast';
import { complaintService } from '../../services/complaintService';
import './ComplaintRequestList.css';

interface Complaint {
  _id: string;
  content: string;
  category:
    | 'Tiếng ồn'
    | 'Vệ sinh'
    | 'An ninh'
    | 'Cơ sở vật chất'
    | 'Thái độ phục vụ'
    | 'Khác';
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Processing' | 'Done' | 'Rejected';
  response?: string | null;
  managerNote?: string | null;
  responseBy?: {
    _id: string;
    username: string;
    email: string;
    role: string;
  } | null;
  responseDate?: string | null;
  createdDate: string;
  tenantId?: {
    _id: string;
    username: string;
    email: string;
    phoneNumber?: string;
    fullname?: string | null;
  } | null;
  room?: {
    _id: string;
    name: string;
    roomCode?: string;
  } | null;
}

type StatusFilter = 'ALL' | 'Pending' | 'Processing' | 'Done' | 'Rejected';
type CategoryFilter =
  | 'ALL'
  | 'Tiếng ồn'
  | 'Vệ sinh'
  | 'An ninh'
  | 'Cơ sở vật chất'
  | 'Thái độ phục vụ'
  | 'Khác';

export default function ComplaintRequestList() {
  const { showToast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tenantSearch, setTenantSearch] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [page, setPage] = useState(1);
  const itemsPerPage = 11;
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [showStatusNoteModal, setShowStatusNoteModal] = useState(false);
  const [statusNoteMode, setStatusNoteMode] = useState<'Done' | 'Rejected'>('Done');
  const [completingComplaint, setCompletingComplaint] = useState<Complaint | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [statusNoteError, setStatusNoteError] = useState('');
  const [showComplaintStatusConfirmModal, setShowComplaintStatusConfirmModal] = useState(false);
  const [pendingComplaintStatusChange, setPendingComplaintStatusChange] = useState<{
    complaint: Complaint;
    nextStatus: 'Pending' | 'Processing' | 'Done' | 'Rejected';
  } | null>(null);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await complaintService.getComplaints({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
        page: 1,
        limit: 100,
      });
      if (res.success && Array.isArray(res.data?.data)) {
        setComplaints(res.data.data);
      } else {
        setComplaints([]);
      }
    } catch (err: unknown) {
      console.error('Lỗi khi tải danh sách khiếu nại:', err);
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      showToast('error', 'Lỗi', e.response?.data?.error?.message || 'Không thể tải danh sách khiếu nại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    setPage(1);
  }, [tenantSearch, roomSearch, statusFilter, categoryFilter, sortOption]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleViewDetail = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
  };

  const handleCloseDetail = () => {
    setSelectedComplaint(null);
  };

  const canTransitionStatus = (
    current: 'Pending' | 'Processing' | 'Done' | 'Rejected',
    target: 'Pending' | 'Processing' | 'Done' | 'Rejected',
  ) => {
    const allowedTransitions: Record<
      'Pending' | 'Processing' | 'Done' | 'Rejected',
      Array<'Pending' | 'Processing' | 'Done' | 'Rejected'>
    > = {
      Pending: ['Pending', 'Done', 'Rejected'],
      Processing: ['Processing', 'Done', 'Rejected'],
      Done: ['Done', 'Rejected'],
      Rejected: ['Rejected', 'Done'],
    };
    return allowedTransitions[current]?.includes(target) ?? false;
  };

  const applyComplaintStatusUpdate = async (
    complaint: Complaint,
    nextStatus: 'Pending' | 'Processing' | 'Done' | 'Rejected',
  ) => {
    try {
      setUpdatingId(complaint._id);
      const res = await complaintService.updateComplaintStatus(complaint._id, nextStatus);
      const updated = res.data;

      if (updated?._id) {
        setComplaints((prev) =>
          prev.map((c) =>
            c._id === updated._id
              ? { ...c, status: updated.status, response: updated.response, managerNote: updated.managerNote, responseBy: updated.responseBy, responseDate: updated.responseDate }
              : c,
          ),
        );
        if (selectedComplaint && selectedComplaint._id === updated._id) {
          setSelectedComplaint((prev) =>
            prev ? { ...prev, status: updated.status, response: updated.response, managerNote: updated.managerNote, responseBy: updated.responseBy, responseDate: updated.responseDate } : prev,
          );
        }
      }
      showToast('success', 'Thành công', 'Cập nhật trạng thái thành công!');
    } catch (err: unknown) {
      console.error('Lỗi khi cập nhật trạng thái khiếu nại:', err);
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      showToast('error', 'Lỗi', e.response?.data?.error?.message || 'Không thể cập nhật trạng thái khiếu nại.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateStatus = async (
    complaint: Complaint,
    nextStatus: 'Pending' | 'Processing' | 'Done' | 'Rejected',
  ) => {
    if (nextStatus === complaint.status) return;
    if (!canTransitionStatus(complaint.status, nextStatus)) {
      showToast('error', 'Lỗi', 'Không thể chuyển sang trạng thái này.');
      return;
    }
    if (nextStatus === 'Done' || nextStatus === 'Rejected') {
      setCompletingComplaint(complaint);
      setStatusNoteMode(nextStatus);
      setStatusNote('');
      setStatusNoteError('');
      setShowStatusNoteModal(true);
      return;
    }
    setPendingComplaintStatusChange({ complaint, nextStatus });
    setShowComplaintStatusConfirmModal(true);
  };

  const handleConfirmComplaintStatusChange = async () => {
    if (!pendingComplaintStatusChange) return;
    const { complaint, nextStatus } = pendingComplaintStatusChange;
    setShowComplaintStatusConfirmModal(false);
    setPendingComplaintStatusChange(null);
    await applyComplaintStatusUpdate(complaint, nextStatus);
    setTimeout(() => { setSelectedComplaint(null); }, 600);
  };

  const handleCloseComplaintStatusConfirmModal = () => {
    if (updatingId) return;
    setShowComplaintStatusConfirmModal(false);
    setPendingComplaintStatusChange(null);
  };

  const handleCloseStatusNoteModal = () => {
    if (updatingId) return;
    setShowStatusNoteModal(false);
    setCompletingComplaint(null);
    setStatusNote('');
    setStatusNoteError('');
  };

  const handleConfirmStatusNote = async () => {
    if (!completingComplaint) return;
    if (!statusNote.trim()) {
      setStatusNoteError('Vui lòng nhập ghi chú xử lý');
      return;
    }
    try {
      setUpdatingId(completingComplaint._id);
      const res =
        statusNoteMode === 'Done'
          ? await complaintService.updateComplaintStatus(completingComplaint._id, 'Done', statusNote.trim())
          : await complaintService.updateComplaintStatus(completingComplaint._id, 'Rejected', undefined, statusNote.trim());
      const updated = res.data;

      if (updated?._id) {
        setComplaints((prev) =>
          prev.map((c) =>
            c._id === updated._id
              ? { ...c, status: updated.status, response: updated.response, managerNote: updated.managerNote, responseBy: updated.responseBy, responseDate: updated.responseDate }
              : c,
          ),
        );
        if (selectedComplaint && selectedComplaint._id === updated._id) {
          setSelectedComplaint((prev) =>
            prev ? { ...prev, status: updated.status, response: updated.response, managerNote: updated.managerNote, responseBy: updated.responseBy, responseDate: updated.responseDate } : prev,
          );
        }
      }

      setShowStatusNoteModal(false);
      setCompletingComplaint(null);
      setStatusNote('');
      setStatusNoteError('');
      showToast(
        statusNoteMode === 'Rejected' ? 'warning' : 'success',
        statusNoteMode === 'Rejected' ? 'Đã từ chối' : 'Thành công',
        statusNoteMode === 'Rejected' ? 'Xác nhận từ chối khiếu nại thành công!' : 'Hoàn thành xử lý khiếu nại thành công!',
      );
      setTimeout(() => { setSelectedComplaint(null); }, 600);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      showToast('error', 'Lỗi', e.response?.data?.error?.message || 'Không thể cập nhật trạng thái khiếu nại.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getComplaintStatusText = (status: 'Pending' | 'Processing' | 'Done' | 'Rejected') => {
    if (status === 'Pending') return 'Chờ xử lý';
    if (status === 'Processing') return 'Đang xử lý';
    if (status === 'Rejected') return 'Từ chối';
    return 'Đã xử lý';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Pending') return <Clock size={14} />;
    if (status === 'Processing') return <AlertCircle size={14} />;
    if (status === 'Rejected') return <XCircle size={14} />;
    return <CheckCircle2 size={14} />;
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'High') return <AlertCircle size={14} />;
    if (priority === 'Medium') return <Clock size={14} />;
    return <CheckCircle2 size={14} />;
  };

  const normalize = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filteredComplaints = useMemo(() => {
    let result = [...complaints];
    const matchStatus = statusFilter === 'ALL' || result.every(c => c.status === statusFilter);
    if (!matchStatus) result = result.filter((c) => c.status === statusFilter);
    if (categoryFilter !== 'ALL') result = result.filter((c) => c.category === categoryFilter);
    if (tenantSearch.trim()) {
      const search = normalize(tenantSearch.trim());
      result = result.filter((c) =>
        normalize(c.tenantId?.username || '').includes(search) ||
        normalize(c.tenantId?.email || '').includes(search)
      );
    }
    if (roomSearch.trim()) {
      const search = normalize(roomSearch.trim());
      result = result.filter((c) =>
        normalize(c.room?.name || '').includes(search) ||
        normalize(c.room?.roomCode || '').includes(search)
      );
    }
    if (sortOption === 'name-asc') {
      result.sort((a, b) => (a.tenantId?.fullname || '').localeCompare(b.tenantId?.fullname || ''));
    } else if (sortOption === 'name-desc') {
      result.sort((a, b) => (b.tenantId?.fullname || '').localeCompare(a.tenantId?.fullname || ''));
    }
    return result;
  }, [complaints, statusFilter, categoryFilter, tenantSearch, roomSearch, sortOption]);

  const totalItems = filteredComplaints.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedComplaints = filteredComplaints.slice(startIndex, startIndex + itemsPerPage);

  const hasFilters = tenantSearch || roomSearch || statusFilter !== 'ALL' || categoryFilter !== 'ALL';

  const clearFilters = () => {
    setTenantSearch('');
    setRoomSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
  };

  const totalCount = complaints.length;
  const pendingCount = complaints.filter((c) => c.status === 'Pending').length;
  const doneCount = complaints.filter((c) => c.status === 'Done').length;

  return (
    <div className="repair-container">

      {/* HEADER */}
      <div className="repair-header">
        <div className="repair-header-top">
          <div className="repair-title-block">
            <div className="repair-title-row">
              <div className="repair-title-icon" aria-hidden>
                <MessageSquareWarning size={22} strokeWidth={2} />
              </div>
              <div className="repair-title-text">
                <h2>Quản lý Khiếu nại</h2>
                <p className="repair-subtitle">
                  Các khiếu nại do cư dân gửi lên tòa nhà Hoàng Nam.
                </p>
              </div>
            </div>
          </div>

          <div className="repair-header-aside">
            <div className="repair-stats-summary">
              <div className="repair-stat-item">
                <div className="repair-stat-icon icon-primary">
                  <MessageSquareWarning size={16} strokeWidth={2} />
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
              onChange={(e) => { setTenantSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div className="search-box">
            <LayoutGrid size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm theo số phòng..."
              value={roomSearch}
              onChange={(e) => { setRoomSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div className="control-group">
            <Filter size={16} className="repair-toolbar-icon" aria-hidden />
            <select
              className="custom-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Pending">Chờ xử lý</option>
              <option value="Processing">Đang xử lý</option>
              <option value="Done">Đã xử lý</option>
              <option value="Rejected">Từ chối</option>
            </select>
          </div>

          <div className="control-group">
            <select
              className="custom-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            >
              <option value="ALL">Tất cả loại</option>
              <option value="Tiếng ồn">Tiếng ồn</option>
              <option value="Vệ sinh">Vệ sinh</option>
              <option value="An ninh">An ninh</option>
              <option value="Cơ sở vật chất">Cơ sở vật chất</option>
              <option value="Thái độ phục vụ">Thái độ phục vụ</option>
              <option value="Khác">Khác</option>
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
              <th className="cell-category">Loại</th>
              <th className="cell-priority">Mức độ</th>
              <th className="cell-status">Trạng thái</th>
              <th className="cell-date">Ngày tạo</th>
              <th className="cell-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedComplaints.length > 0 ? (
              paginatedComplaints.map((c, index) => (
                <tr key={c._id}>
                  <td className="cell-stt">{startIndex + index + 1}</td>
                  <td className="cell-tenant">{c.tenantId?.fullname || c.tenantId?.username || '-'}</td>
                  <td className="cell-room">
                    <span className="room-badge">{c.room?.name || c.room?.roomCode || '-'}</span>
                  </td>
                  <td className="cell-category">{c.category}</td>
                  <td className="cell-priority">
                    <span className={`priority-badge priority-${(c.priority || 'Low').toLowerCase()}`}>
                      {getPriorityIcon(c.priority || 'Low')}
                      {c.priority === 'High' ? 'Cao' : c.priority === 'Medium' ? 'Trung bình' : 'Thấp'}
                    </span>
                  </td>
                  <td className="cell-status">
                    <span className={`status-badge status-${c.status.toLowerCase()}`}>
                      {getStatusIcon(c.status)}
                      {getComplaintStatusText(c.status)}
                    </span>
                  </td>
                  <td className="cell-date">{formatDate(c.createdDate)}</td>
                  <td className="cell-actions">
                    <div className="table-actions">
                      <button
                        className="btn-icon btn-view"
                        onClick={() => handleViewDetail(c)}
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
                <td colSpan={8} className="table-empty-cell">
                  {loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy khiếu nại nào phù hợp.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={(p) => { setPage(p); if (tableRef.current) tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
        />
      </div>

      {/* ==================================================================
          MODALS
          ================================================================== */}

      {/* 1. Modal Chi tiết */}
      <AppModal
        open={!!selectedComplaint}
        onClose={handleCloseDetail}
        title="Chi tiết khiếu nại"
        icon={<MessageSquareWarning size={18} />}
        color="orange"
        size="md"
        footer={
          <button type="button" className="ms-btn ms-btn--ghost" onClick={handleCloseDetail}>
            Đóng
          </button>
        }
      >
        {selectedComplaint && (
          <div className="rr-detail-body">
            {/* Profile strip */}
            <div className="rr-profile-strip">
              <div className="rr-avatar">
                {(selectedComplaint.tenantId?.fullname || selectedComplaint.tenantId?.username || '?').charAt(0).toUpperCase()}
              </div>
              <div className="rr-profile-info">
                <div className="rr-profile-name">
                  {selectedComplaint.tenantId?.fullname || selectedComplaint.tenantId?.username || '-'}
                </div>
                <div className="rr-profile-meta">
                  <span className="rr-meta-tag">{selectedComplaint.room?.name || selectedComplaint.room?.roomCode || '-'}</span>
                  <span className={`rr-status-tag rr-status-${selectedComplaint.status.toLowerCase()}`}>
                    {getStatusIcon(selectedComplaint.status)}
                    {getComplaintStatusText(selectedComplaint.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Info grid */}
            <div className="rr-two-col">
              <div className="rr-col-left">
                <div className="rr-section">
                  <div className="rr-section-title">
                    <MessageSquareWarning size={15} />
                    Thông tin khiếu nại
                  </div>
                  <div className="rr-rows">
                    <div className="rr-row">
                      <span className="rr-label">Loại</span>
                      <span className="rr-value">{selectedComplaint.category}</span>
                    </div>
                    <div className="rr-row">
                      <span className="rr-label">Mức độ</span>
                      <span className="rr-value">
                        <span className={`priority-badge priority-${(selectedComplaint.priority || 'Low').toLowerCase()}`}>
                          {getPriorityIcon(selectedComplaint.priority || 'Low')}
                          {selectedComplaint.priority === 'High' ? 'Cao' : selectedComplaint.priority === 'Medium' ? 'Trung bình' : 'Thấp'}
                        </span>
                      </span>
                    </div>
                    <div className="rr-row">
                      <span className="rr-label">Ngày tạo</span>
                      <span className="rr-value">{formatDate(selectedComplaint.createdDate)}</span>
                    </div>
                    <div className="rr-row">
                      <span className="rr-label">Email</span>
                      <span className="rr-value">{selectedComplaint.tenantId?.email || '-'}</span>
                    </div>
                    <div className="rr-row">
                      <span className="rr-label">Số điện thoại</span>
                      <span className="rr-value">{selectedComplaint.tenantId?.phoneNumber || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rr-col-right">
                <div className="rr-section">
                  <div className="rr-section-title">
                    <AlertCircle size={15} />
                    Nội dung khiếu nại
                  </div>
                  <p className="rr-description">{selectedComplaint.content}</p>
                </div>

                {selectedComplaint.response && (
                  <div className="rr-section">
                    <div className="rr-section-title">
                      <CheckCircle2 size={15} />
                      Phản hồi
                    </div>
                    <p className="rr-description">{selectedComplaint.response}</p>
                  </div>
                )}

                {selectedComplaint.managerNote && (
                  <div className="rr-section">
                    <div className="rr-section-title">
                      <AlertCircle size={15} />
                      Ghi chú xử lý
                    </div>
                    <p className="rr-description">{selectedComplaint.managerNote}</p>
                  </div>
                )}

                <div className="rr-section">
                  <div className="rr-section-title">
                    <Clock size={15} />
                    Cập nhật trạng thái
                  </div>
                  <div className="rr-status-row">
                    <select
                      className="rr-status-select"
                      value={selectedComplaint.status}
                      onChange={(e) =>
                        handleUpdateStatus(
                          selectedComplaint,
                          e.target.value as 'Pending' | 'Processing' | 'Done' | 'Rejected',
                        )
                      }
                      disabled={updatingId === selectedComplaint._id}
                    >
                      <option value="Pending" disabled={!canTransitionStatus(selectedComplaint.status, 'Pending')}>Chờ xử lý</option>
                      <option value="Done" disabled={!canTransitionStatus(selectedComplaint.status, 'Done')}>Đã xử lý</option>
                      <option value="Rejected" disabled={!canTransitionStatus(selectedComplaint.status, 'Rejected')}>Từ chối</option>
                    </select>
                    {updatingId === selectedComplaint._id && (
                      <span className="rr-updating-text">Đang cập nhật...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppModal>

      {/* 2. Modal Xác nhận chuyển trạng thái */}
      <AppModal
        open={showComplaintStatusConfirmModal}
        onClose={handleCloseComplaintStatusConfirmModal}
        title="Xác nhận chuyển trạng thái"
        icon={<AlertCircle size={18} />}
        color="orange"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="ms-btn ms-btn--ghost"
              onClick={handleCloseComplaintStatusConfirmModal}
              disabled={!!updatingId}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              className="ms-btn ms-btn--primary"
              onClick={handleConfirmComplaintStatusChange}
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
            Bạn có chắc muốn chuyển khiếu nại này sang trạng thái{' '}
            <strong>{pendingComplaintStatusChange ? getComplaintStatusText(pendingComplaintStatusChange.nextStatus) : ''}</strong>?
          </p>
        </div>
      </AppModal>

      {/* 3. Modal Ghi chú xử lý */}
      <AppModal
        open={showStatusNoteModal}
        onClose={handleCloseStatusNoteModal}
        title={statusNoteMode === 'Rejected' ? 'Ghi chú xử lý khiếu nại (Từ chối)' : 'Ghi chú xử lý khiếu nại'}
        icon={<AlertCircle size={18} />}
        color={statusNoteMode === 'Rejected' ? 'red' : 'green'}
        size="md"
        footer={
          <>
            <button
              type="button"
              className="ms-btn ms-btn--ghost"
              onClick={handleCloseStatusNoteModal}
              disabled={updatingId === completingComplaint?._id}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              className="ms-btn ms-btn--primary"
              onClick={handleConfirmStatusNote}
              disabled={updatingId === completingComplaint?._id}
            >
              <Check size={16} />
              {updatingId === completingComplaint?._id ? 'Đang xử lý...' : statusNoteMode === 'Rejected' ? 'Xác nhận từ chối' : 'Hoàn thành'}
            </button>
          </>
        }
      >
        <div className="ms-field">
          <label className="ms-label">
            Ghi chú xử lý <span className="ms-label-required">*</span>
          </label>
          <div className="ms-input-wrap">
            <textarea
              className={`ms-textarea ${statusNoteError ? 'ms-input--error' : ''}`}
              placeholder={
                statusNoteMode === 'Rejected'
                  ? 'Nhập lý do từ chối khiếu nại...'
                  : 'Nhập nội dung xử lý khiếu nại...'
              }
              value={statusNote}
              onChange={(e) => {
                setStatusNote(e.target.value);
                if (statusNoteError) setStatusNoteError('');
              }}
              rows={4}
            />
          </div>
          {statusNoteError && <span className="ms-error-text">{statusNoteError}</span>}
        </div>
      </AppModal>
    </div>
  );
}

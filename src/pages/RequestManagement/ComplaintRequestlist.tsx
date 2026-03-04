import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { complaintService } from '../../services/complaintService';
import './RepairRequestsList.css';

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
  status: 'Pending' | 'Processing' | 'Done';
  response?: string | null;
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

type StatusFilter = 'ALL' | 'Pending' | 'Processing' | 'Done';
type CategoryFilter =
  | 'ALL'
  | 'Tiếng ồn'
  | 'Vệ sinh'
  | 'An ninh'
  | 'Cơ sở vật chất'
  | 'Thái độ phục vụ'
  | 'Khác';

export default function ComplaintRequestList() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tenantSearch, setTenantSearch] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [completingComplaint, setCompletingComplaint] = useState<Complaint | null>(null);
  const [doneNote, setDoneNote] = useState('');
  const [doneNoteError, setDoneNoteError] = useState('');

  useEffect(() => {
    fetchComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError(null);

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
      const anyErr = err as { response?: { data?: { error?: { message?: string } } } };
      const msg =
        anyErr?.response?.data?.error?.message || 'Không thể tải danh sách khiếu nại';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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

  const handleUpdateStatus = async (
    complaint: Complaint,
    nextStatus: 'Pending' | 'Processing' | 'Done',
  ) => {
    // Chỉ cho phép chuyển tiến: Pending -> Processing -> Done
    const statusRank: Record<Complaint['status'], number> = {
      Pending: 0,
      Processing: 1,
      Done: 2,
    };
    const currentRank = statusRank[complaint.status];
    const nextRank = statusRank[nextStatus];
    if (nextRank <= currentRank) return;

    // Nếu chuyển sang Đã xử lý -> mở modal nhập ghi chú
    if (nextStatus === 'Done') {
      setCompletingComplaint(complaint);
      setDoneNote('');
      setDoneNoteError('');
      setShowDoneModal(true);
      return;
    }

    const confirmText = `Bạn có chắc muốn chuyển khiếu nại này sang trạng thái "${nextStatus}"?`;
    if (!window.confirm(confirmText)) return;

    try {
      setUpdatingId(complaint._id);

      const res = await complaintService.updateComplaintStatus(complaint._id, nextStatus);
      const updated = res.data;

      if (updated?._id) {
        setComplaints((prev) =>
          prev.map((c) =>
            c._id === updated._id
              ? {
                ...c,
                status: updated.status,
                response: updated.response,
                responseBy: updated.responseBy,
                responseDate: updated.responseDate,
              }
              : c,
          ),
        );

        if (selectedComplaint && selectedComplaint._id === updated._id) {
          setSelectedComplaint((prev) =>
            prev
              ? {
                ...prev,
                status: updated.status,
                response: updated.response,
                responseBy: updated.responseBy,
                responseDate: updated.responseDate,
              }
              : prev,
          );
        }
      }
    } catch (err: unknown) {
      console.error('Lỗi khi cập nhật trạng thái khiếu nại:', err);
      const anyErr = err as { response?: { data?: { error?: { message?: string } } } };
      alert(
        anyErr?.response?.data?.error?.message || 'Không thể cập nhật trạng thái khiếu nại',
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCloseDoneModal = () => {
    if (updatingId) return;
    setShowDoneModal(false);
    setCompletingComplaint(null);
    setDoneNote('');
    setDoneNoteError('');
  };

  const handleConfirmDone = async () => {
    if (!completingComplaint) return;

    if (!doneNote.trim()) {
      setDoneNoteError('Vui lòng nhập ghi chú xử lý');
      return;
    }

    try {
      setUpdatingId(completingComplaint._id);
      const res = await complaintService.updateComplaintStatus(
        completingComplaint._id,
        'Done',
        doneNote.trim(),
      );
      const updated = res.data;

      if (updated?._id) {
        setComplaints((prev) =>
          prev.map((c) =>
            c._id === updated._id
              ? {
                ...c,
                status: updated.status,
                response: updated.response,
                responseBy: updated.responseBy,
                responseDate: updated.responseDate,
              }
              : c,
          ),
        );

        if (selectedComplaint && selectedComplaint._id === updated._id) {
          setSelectedComplaint((prev) =>
            prev
              ? {
                ...prev,
                status: updated.status,
                response: updated.response,
                responseBy: updated.responseBy,
                responseDate: updated.responseDate,
              }
              : prev,
          );
        }
      }

      setShowDoneModal(false);
      setCompletingComplaint(null);
      setDoneNote('');
      setDoneNoteError('');
    } catch (err: unknown) {
      console.error('Lỗi khi cập nhật trạng thái khiếu nại:', err);
      const anyErr = err as { response?: { data?: { error?: { message?: string } } } };
      alert(
        anyErr?.response?.data?.error?.message || 'Không thể cập nhật trạng thái khiếu nại',
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // helper chuẩn hoá để tìm kiếm không phân biệt hoa/thường & dấu
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const filteredComplaints = complaints.filter((c) => {
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchCategory = categoryFilter === 'ALL' || c.category === categoryFilter;

    let matchTenant = true;
    if (tenantSearch.trim()) {
      const search = normalize(tenantSearch.trim());
      const username = normalize(c.tenantId?.username || '');
      const email = normalize(c.tenantId?.email || '');
      matchTenant = username.includes(search) || email.includes(search);
    }

    let matchRoom = true;
    if (roomSearch.trim()) {
      const search = normalize(roomSearch.trim());
      const roomName = normalize(c.room?.name || '');
      const roomCode = normalize(c.room?.roomCode || '');
      matchRoom = roomName.includes(search) || roomCode.includes(search);
    }

    return matchStatus && matchCategory && matchTenant && matchRoom;
  });

  const totalItems = filteredComplaints.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedComplaints = filteredComplaints.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <div className="repair-requests-page">
      <div className="repair-requests-card">
        <div className="repair-requests-header">
          <div>
            <h1>Danh sách khiếu nại</h1>
            <p className="subtitle">Các khiếu nại do cư dân gửi lên tòa nhà</p>
          </div>
          <div className="repair-filter-wrapper" style={{ gap: 16, flexWrap: 'wrap' }}>
            <div className="repair-filter-wrapper">
              <label htmlFor="tenant-search" className="repair-filter-label">
                Cư dân:
              </label>
              <input
                id="tenant-search"
                type="text"
                className="repair-filter-select"
                placeholder="Nhập tên cư dân"
                value={tenantSearch}
                onChange={(e) => {
                  setTenantSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="repair-filter-wrapper">
              <label htmlFor="room-search" className="repair-filter-label">
                Phòng:
              </label>
              <input
                id="room-search"
                type="text"
                className="repair-filter-select"
                placeholder="Nhập số phòng (ví dụ: 320)"
                value={roomSearch}
                onChange={(e) => {
                  setRoomSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="repair-filter-wrapper">
              <label htmlFor="status-filter" className="repair-filter-label">
                Trạng thái:
              </label>
              <select
                id="status-filter"
                className="repair-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="ALL">Tất cả</option>
                <option value="Pending">Chờ xử lý</option>
                <option value="Processing">Đang xử lý</option>
                <option value="Done">Đã xử lý</option>
              </select>
            </div>
            <div className="repair-filter-wrapper">
              <label htmlFor="category-filter" className="repair-filter-label">
                Loại:
              </label>
              <select
                id="category-filter"
                className="repair-filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              >
                <option value="ALL">Tất cả</option>
                <option value="Tiếng ồn">Tiếng ồn</option>
                <option value="Vệ sinh">Vệ sinh</option>
                <option value="An ninh">An ninh</option>
                <option value="Cơ sở vật chất">Cơ sở vật chất</option>
                <option value="Thái độ phục vụ">Thái độ phục vụ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="repair-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && complaints.length === 0 && (
          <div className="repair-empty">
            <p>Chưa có khiếu nại nào.</p>
          </div>
        )}

        {!loading && !error && complaints.length > 0 && (
          <div className="repair-table-wrap">
            <table className="repair-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Cư dân</th>
                  <th>Phòng</th>
                  <th>Loại</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedComplaints.map((c, index) => (
                  <tr key={c._id}>
                    <td>{startIndex + index + 1}</td>
                    <td>
                      <div className="cell-main">
                        <div className="cell-title">
                          {c.tenantId?.fullname || c.tenantId?.username || '-'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cell-main">
                        <div className="cell-title">
                          {c.room?.name || c.room?.roomCode || '-'}
                        </div>
                      </div>
                    </td>
                    <td>{c.category}</td>
                    <td>
                      <span className={`status-badge status-${c.status.toLowerCase()}`}>
                        {c.status === 'Pending'
                          ? 'Chờ xử lý'
                          : c.status === 'Processing'
                            ? 'Đang xử lý'
                            : 'Đã xử lý'}
                      </span>
                    </td>
                    <td>{formatDate(c.createdDate)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn-view-detail"
                          onClick={() => handleViewDetail(c)}
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalItems > 0 && (
          <div className="repair-pagination repair-pagination--right">
            <div className="repair-pagination-controls">
              <button
                type="button"
                className="pagination-arrow-btn"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || loading}
                aria-label="Trang trước"
              >
                ‹
              </button>
              <button
                type="button"
                className="pagination-current-page"
                disabled
              >
                {currentPage}
              </button>
              <button
                type="button"
                className="pagination-arrow-btn"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages || loading}
                aria-label="Trang sau"
              >
                ›
              </button>
            </div>
          </div>
        )}

        {/* Modal xem chi tiết khiếu nại */}
        {selectedComplaint && (
          <div className="repair-modal-overlay" onClick={handleCloseDetail}>
            <div className="repair-modal repair-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="repair-modal-header">
                <h2>Chi tiết khiếu nại</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={handleCloseDetail}
                  aria-label="Đóng"
                >
                  ×
                </button>
              </div>
              <div className="repair-modal-body">
                {/* Layout 2 cột thông tin */}
                <div className="detail-grid-layout">
                  <div className="detail-grid-fields">
                    {/* Hàng 1: Phòng + Cư dân */}
                    <div className="detail-field-group">
                      <div className="detail-field">
                        <span className="detail-field-label">Phòng</span>
                        <span className="detail-field-value">
                          {selectedComplaint.room?.name || selectedComplaint.room?.roomCode || '-'}
                        </span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-field-label">Cư dân</span>
                        <span className="detail-field-value">
                          {selectedComplaint.tenantId?.fullname || selectedComplaint.tenantId?.username || '-'}
                        </span>
                      </div>
                    </div>
                    {/* Hàng 2: Số điện thoại + Loại khiếu nại */}
                    <div className="detail-field-group">
                      <div className="detail-field">
                        <span className="detail-field-label">Số điện thoại</span>
                        <span className="detail-field-value">
                          {selectedComplaint.tenantId?.phoneNumber || '-'}
                        </span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-field-label">Loại khiếu nại</span>
                        <span className="detail-field-value">{selectedComplaint.category}</span>
                      </div>
                    </div>
                    {/* Hàng 3: Mức độ + Trạng thái */}
                    <div className="detail-field-group">
                      <div className="detail-field">
                        <span className="detail-field-label">Mức độ</span>
                        <span className="detail-field-value">
                          {selectedComplaint.priority === 'High'
                            ? 'Cao'
                            : selectedComplaint.priority === 'Medium'
                              ? 'Trung bình'
                              : 'Thấp'}
                        </span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-field-label">Trạng thái</span>
                        <span className="detail-field-value">
                          <span className={`status-badge status-${selectedComplaint.status.toLowerCase()}`}>
                            {selectedComplaint.status === 'Pending'
                              ? 'Chờ xử lý'
                              : selectedComplaint.status === 'Processing'
                                ? 'Đang xử lý'
                                : 'Đã xử lý'}
                          </span>
                        </span>
                      </div>
                    </div>
                    {/* Hàng 4: Ngày tạo */}
                    <div className="detail-field-group">
                      <div className="detail-field">
                        <span className="detail-field-label">Ngày tạo</span>
                        <span className="detail-field-value">
                          {formatDate(selectedComplaint.createdDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Không có ảnh cho khiếu nại */}
                </div>

                {/* Email - toàn chiều rộng */}
                <div className="detail-email-row">
                  <span className="detail-field-label">Email</span>
                  <span className="detail-email-value">
                    {selectedComplaint.tenantId?.email || '-'}
                  </span>
                </div>

                {/* Nội dung khiếu nại */}
                <div className="detail-description-block">
                  <span className="detail-field-label">Nội dung</span>
                  <p className="detail-description-text">{selectedComplaint.content}</p>
                </div>

                {/* Phản hồi (nếu có) */}
                {selectedComplaint.response && (
                  <div className="detail-description-block">
                    <span className="detail-field-label">Phản hồi</span>
                    <p className="detail-description-text">{selectedComplaint.response}</p>
                  </div>
                )}

                {/* Tình trạng xử lý + nút Xong */}
                <div className="detail-status-actions">
                  <div className="detail-status-actions-select-row">
                    <span className="detail-status-clock">🕐</span>
                    <span className="detail-status-label">Tình trạng xử lý</span>
                    <select
                      className="detail-status-select detail-status-select--inline"
                      value={selectedComplaint.status}
                      onChange={(e) =>
                        handleUpdateStatus(
                          selectedComplaint,
                          e.target.value as 'Pending' | 'Processing' | 'Done',
                        )
                      }
                      disabled={
                        updatingId === selectedComplaint._id || selectedComplaint.status === 'Done'
                      }
                    >
                      <option
                        value="Pending"
                        disabled={selectedComplaint.status !== 'Pending'}
                      >
                        Chờ xử lý
                      </option>
                      <option
                        value="Processing"
                        disabled={selectedComplaint.status !== 'Pending'}
                      >
                        Đang xử lý
                      </option>
                      <option value="Done" disabled={selectedComplaint.status === 'Done'}>
                        Đã xử lý
                      </option>
                    </select>
                    {updatingId === selectedComplaint._id && (
                      <span className="detail-status-updating">Đang cập nhật...</span>
                    )}
                    <button
                      type="button"
                      className="detail-done-btn-orange"
                      onClick={handleCloseDetail}
                    >
                      Xong
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal nhập ghi chú khi chuyển sang Đã xử lý */}
        {showDoneModal && completingComplaint && (
          <div className="repair-modal-overlay" onClick={handleCloseDoneModal}>
            <div
              className="repair-modal repair-complete-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="repair-modal-header">
                <h2>Ghi chú xử lý khiếu nại</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={handleCloseDoneModal}
                  aria-label="Đóng"
                >
                  ×
                </button>
              </div>
              <div className="repair-modal-body">
                <div className="complete-form-group">
                  <label htmlFor="done-note">Ghi chú xử lý *</label>
                  <textarea
                    id="done-note"
                    value={doneNote}
                    onChange={(e) => {
                      setDoneNote(e.target.value);
                      if (doneNoteError) setDoneNoteError('');
                    }}
                    placeholder="Nhập nội dung xử lý khiếu nại..."
                  />
                  {doneNoteError && <span className="error-message">{doneNoteError}</span>}
                </div>
                <div className="complete-form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={handleCloseDoneModal}
                    disabled={updatingId === completingComplaint._id}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn-submit"
                    onClick={handleConfirmDone}
                    disabled={updatingId === completingComplaint._id}
                  >
                    {updatingId === completingComplaint._id ? 'Đang xử lý...' : 'Hoàn thành'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


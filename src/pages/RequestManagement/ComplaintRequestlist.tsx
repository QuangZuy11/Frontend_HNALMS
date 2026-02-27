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

  const filteredComplaints =
    statusFilter === 'ALL' && categoryFilter === 'ALL'
      ? complaints
      : complaints.filter((c) => {
          const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
          const matchCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
          return matchStatus && matchCategory;
        });

  return (
    <div className="repair-requests-page">
      <div className="repair-requests-card">
        <div className="repair-requests-header">
          <div>
            <h1>Danh sách khiếu nại</h1>
            <p className="subtitle">Các khiếu nại do cư dân gửi lên tòa nhà</p>
          </div>
          <div className="repair-filter-wrapper" style={{ gap: 16 }}>
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
                  <th>Loại</th>
                  <th>Nội dung</th>
                  <th>Mức độ</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((c, index) => (
                  <tr key={c._id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="cell-main">
                        <div className="cell-title">
                          {c.tenantId?.username || 'Cư dân'}
                        </div>
                      </div>
                    </td>
                    <td>{c.category}</td>
                    <td>
                      <div className="cell-main col-description">
                        <div className="cell-title">{c.content}</div>
                      </div>
                    </td>
                    <td>
                      {c.priority === 'High'
                        ? 'Cao'
                        : c.priority === 'Medium'
                        ? 'Trung bình'
                        : 'Thấp'}
                    </td>
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

        {/* Modal xem chi tiết khiếu nại */}
        {selectedComplaint && (
          <div className="repair-modal-overlay" onClick={handleCloseDetail}>
            <div className="repair-modal" onClick={(e) => e.stopPropagation()}>
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
                <div className="detail-row">
                  <span className="detail-label">Cư dân:</span>
                  <span className="detail-value">
                    {selectedComplaint.tenantId?.username || '-'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">
                    {selectedComplaint.tenantId?.email || '-'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Loại khiếu nại:</span>
                  <span className="detail-value">{selectedComplaint.category}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Mức độ:</span>
                  <span className="detail-value">
                    {selectedComplaint.priority === 'High'
                      ? 'Cao'
                      : selectedComplaint.priority === 'Medium'
                      ? 'Trung bình'
                      : 'Thấp'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Trạng thái:</span>
                  <span className="detail-value">
                    <span
                      className={`status-badge status-${selectedComplaint.status.toLowerCase()}`}
                    >
                      {selectedComplaint.status === 'Pending'
                        ? 'Chờ xử lý'
                        : selectedComplaint.status === 'Processing'
                        ? 'Đang xử lý'
                        : 'Đã xử lý'}
                    </span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Ngày tạo:</span>
                  <span className="detail-value">
                    {formatDate(selectedComplaint.createdDate)}
                  </span>
                </div>
                <div className="detail-row detail-row-description">
                  <span className="detail-label">Nội dung:</span>
                  <span className="detail-value">{selectedComplaint.content}</span>
                </div>
                {selectedComplaint.response && (
                  <div className="detail-row detail-row-description">
                    <span className="detail-label">Phản hồi:</span>
                    <span className="detail-value">{selectedComplaint.response}</span>
                  </div>
                )}
                <div className="detail-status-actions">
                  <div className="detail-status-actions-header">
                    <span className="detail-label">Tình trạng xử lý</span>
                  </div>
                  <div className="detail-status-actions-select-row">
                    <select
                      className="detail-status-select"
                      value={selectedComplaint.status}
                      onChange={(e) =>
                        handleUpdateStatus(
                          selectedComplaint,
                          e.target.value as 'Pending' | 'Processing' | 'Done',
                        )
                      }
                      disabled={updatingId === selectedComplaint._id}
                    >
                      <option
                        value="Pending"
                        disabled={selectedComplaint.status === 'Pending'}
                      >
                        Chờ xử lý
                      </option>
                      <option
                        value="Processing"
                        disabled={selectedComplaint.status === 'Processing'}
                      >
                        Đang xử lý
                      </option>
                      <option value="Done" disabled={selectedComplaint.status === 'Done'}>
                        Đã xử lý
                      </option>
                    </select>
                    <button
                      type="button"
                      className="detail-status-done-btn"
                      onClick={handleCloseDetail}
                    >
                      Xong
                    </button>
                    {updatingId === selectedComplaint._id && (
                      <span className="detail-status-updating">Đang cập nhật...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


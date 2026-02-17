import { useEffect, useState } from 'react';
import { requestService } from '../../services/requestService';
import './RepairRequestsList.css';

interface RepairRequest {
  _id: string;
  type: string;
  description: string;
  status: string;
  cost: number;
  createdDate: string;
  tenantId?: {
    _id: string;
    username: string;
    email: string;
    phoneNumber?: string;
    fullname?: string | null;
  } | null;
  devicesId?: {
    _id: string;
    name: string;
    brand?: string;
    model?: string;
  } | null;
}

export default function RepairRequestsList() {
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await requestService.getRepairRequests();
      if (response.success && Array.isArray(response.data)) {
        setRequests(response.data);
      } else {
        setRequests([]);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách yêu cầu sửa chữa:', err);
      const msg =
        err?.response?.data?.message || 'Không thể tải danh sách yêu cầu sửa chữa';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleViewDetail = (request: RepairRequest) => {
    setSelectedRequest(request);
  };

  const handleCloseDetail = () => {
    setSelectedRequest(null);
  };

  const handleToggleMenu = (id: string) => {
    setOpenMenuId((prev) => (prev === id ? null : id));
  };

  const handleUpdateStatus = async (
    request: RepairRequest,
    nextStatus: 'Pending' | 'Processing' | 'Done',
  ) => {
    const confirmText = `Bạn có chắc muốn chuyển yêu cầu này sang trạng thái "${nextStatus}"?`;

    if (!window.confirm(confirmText)) return;

    try {
      setUpdatingId(request._id);
      setOpenMenuId(null);
      const response = await requestService.updateRepairStatus(request._id, nextStatus);
      const updated = response.data;

      if (updated?._id) {
        setRequests((prev) =>
          prev.map((r) => (r._id === updated._id ? { ...r, status: updated.status } : r)),
        );

        if (selectedRequest && selectedRequest._id === updated._id) {
          setSelectedRequest((prev) => (prev ? { ...prev, status: updated.status } : prev));
        }
      }
    } catch (err: any) {
      console.error('Lỗi khi cập nhật trạng thái yêu cầu:', err);
      alert(err?.response?.data?.message || 'Không thể cập nhật trạng thái yêu cầu');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="repair-requests-page">
      <div className="repair-requests-card">
        <div className="repair-requests-header">
          <div>
            <h1>Danh sách yêu cầu sửa chữa</h1>
            <p className="subtitle">
              Các yêu cầu sửa chữa/bảo trì do cư dân gửi lên tòa nhà
            </p>
          </div>
          <button className="btn-refresh" onClick={fetchRequests} disabled={loading}>
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>

        {error && (
          <div className="repair-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && requests.length === 0 && (
          <div className="repair-empty">
            <p>Chưa có yêu cầu sửa chữa nào.</p>
          </div>
        )}

        {!loading && !error && requests.length > 0 && (
          <div className="repair-table-wrap">
            <table className="repair-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Cư dân</th>
                  <th>Thiết bị</th>
                  <th>Loại</th>
                  <th>Mô tả</th>
                  <th>Trạng thái</th>
                  <th>Chi phí (VNĐ)</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r, index) => (
                  <tr key={r._id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="cell-main">
                        <div className="cell-title">
                          {r.tenantId?.fullname || r.tenantId?.username || '-'}
                        </div>
                        <div className="cell-sub">
                          {r.tenantId?.email}
                          {r.tenantId?.phoneNumber ? ` · ${r.tenantId.phoneNumber}` : ''}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cell-main">
                        <div className="cell-title">{r.devicesId?.name || '-'}</div>
                        {r.devicesId && (
                          <div className="cell-sub">
                            {[r.devicesId.brand, r.devicesId.model].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{r.type}</td>
                    <td className="col-description">{r.description}</td>
                    <td>
                      <span className={`status-badge status-${r.status.toLowerCase()}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>{r.cost?.toLocaleString('vi-VN') || 0}</td>
                    <td>{formatDate(r.createdDate)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn-view-detail"
                          onClick={() => handleViewDetail(r)}
                        >
                          Xem chi tiết
                        </button>
                        <div className="status-dropdown">
                          <button
                            type="button"
                            className={`status-toggle ${
                              r.status === 'Done'
                                ? 'btn-done'
                                : r.status === 'Processing'
                                ? 'btn-processing'
                                : 'btn-pending'
                            }`}
                            onClick={() => handleToggleMenu(r._id)}
                            disabled={updatingId === r._id}
                          >
                            {updatingId === r._id
                              ? 'Đang cập nhật...'
                              : r.status === 'Pending'
                              ? 'Chờ xử lý'
                              : r.status === 'Processing'
                              ? 'Đang xử lý'
                              : 'Đã xử lý'}
                          </button>
                          {openMenuId === r._id && (
                            <div className="status-menu">
                              {(['Pending', 'Processing', 'Done'] as const).map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  className={`status-menu-item${
                                    r.status === status ? ' status-menu-item--active' : ''
                                  }`}
                                  disabled={updatingId === r._id || r.status === status}
                                  onClick={() =>
                                    r.status === status ? undefined : handleUpdateStatus(r, status)
                                  }
                                >
                                  {status === 'Pending'
                                    ? 'Chờ xử lý'
                                    : status === 'Processing'
                                    ? 'Đang xử lý'
                                    : 'Đã xử lý'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal xem chi tiết */}
        {selectedRequest && (
          <div className="repair-modal-overlay" onClick={handleCloseDetail}>
            <div className="repair-modal" onClick={(e) => e.stopPropagation()}>
              <div className="repair-modal-header">
                <h2>Chi tiết yêu cầu sửa chữa</h2>
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
                    {selectedRequest.tenantId?.fullname ||
                      selectedRequest.tenantId?.username ||
                      '-'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{selectedRequest.tenantId?.email}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Số điện thoại:</span>
                  <span className="detail-value">
                    {selectedRequest.tenantId?.phoneNumber || '-'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Thiết bị:</span>
                  <span className="detail-value">
                    {selectedRequest.devicesId?.name || '-'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Loại:</span>
                  <span className="detail-value">{selectedRequest.type}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Trạng thái:</span>
                  <span className="detail-value">
                    <span
                      className={`status-badge status-${selectedRequest.status.toLowerCase()}`}
                    >
                      {selectedRequest.status}
                    </span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Chi phí:</span>
                  <span className="detail-value">
                    {selectedRequest.cost?.toLocaleString('vi-VN') || 0} VNĐ
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Ngày tạo:</span>
                  <span className="detail-value">{formatDate(selectedRequest.createdDate)}</span>
                </div>
                <div className="detail-row detail-row-description">
                  <span className="detail-label">Mô tả:</span>
                  <span className="detail-value">{selectedRequest.description}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


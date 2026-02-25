import { useEffect, useState } from 'react';
import { requestService } from '../../services/requestService';
import './RepairRequestsList.css';

interface RepairRequest {
  _id: string;
  type: string;
  description: string;
  images: string[];
  status: string;
  cost: number;
  notes?: string;
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
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingRequest, setCompletingRequest] = useState<RepairRequest | null>(null);
  const [completeForm, setCompleteForm] = useState({ cost: '', notes: '' });
  const [formErrors, setFormErrors] = useState({ cost: '', notes: '' });
  const [showEditCostModal, setShowEditCostModal] = useState(false);
  const [editingCostRequest, setEditingCostRequest] = useState<RepairRequest | null>(null);
  const [editCostValue, setEditCostValue] = useState('');
  const [editCostError, setEditCostError] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Processing' | 'Done'>(
    'ALL',
  );

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
    // Nếu chuyển sang "Đã xử lý", hiện modal để nhập chi phí và ghi chú
    if (nextStatus === 'Done') {
      setCompletingRequest(request);
      setCompleteForm({ cost: request.cost?.toString() || '', notes: request.notes || '' });
      setShowCompleteModal(true);
      setOpenMenuId(null);
      return;
    }

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

  const handleCompleteSubmit = async () => {
    if (!completingRequest) return;

    // Validate form
    const errors = { cost: '', notes: '' };
    let isValid = true;

    if (!completeForm.cost || completeForm.cost.trim() === '') {
      errors.cost = 'Vui lòng nhập chi phí';
      isValid = false;
    } else {
      const costValue = parseFloat(completeForm.cost);
      if (isNaN(costValue) || costValue < 0) {
        errors.cost = 'Chi phí phải là số hợp lệ và lớn hơn hoặc bằng 0';
        isValid = false;
      }
    }

    setFormErrors(errors);

    if (!isValid) {
      return;
    }

    const cost = parseFloat(completeForm.cost);

    try {
      setUpdatingId(completingRequest._id);
      const response = await requestService.updateRepairStatus(
        completingRequest._id,
        'Done',
        cost,
        completeForm.notes.trim() || undefined
      );
      const updated = response.data;

      if (updated?._id) {
        setRequests((prev) =>
          prev.map((r) =>
            r._id === updated._id
              ? { ...r, status: updated.status, cost: updated.cost, notes: updated.notes }
              : r
          ),
        );

        if (selectedRequest && selectedRequest._id === updated._id) {
          setSelectedRequest((prev) =>
            prev
              ? {
                  ...prev,
                  status: updated.status,
                  cost: updated.cost,
                  notes: updated.notes,
                }
              : prev
          );
        }
      }

      setShowCompleteModal(false);
      setCompletingRequest(null);
      setCompleteForm({ cost: '', notes: '' });
      setFormErrors({ cost: '', notes: '' });
    } catch (err: any) {
      console.error('Lỗi khi hoàn thành yêu cầu:', err);
      alert(err?.response?.data?.message || 'Không thể hoàn thành yêu cầu');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCloseCompleteModal = () => {
    setShowCompleteModal(false);
    setCompletingRequest(null);
    setCompleteForm({ cost: '', notes: '' });
    setFormErrors({ cost: '', notes: '' });
  };

  const handleEditCost = (request: RepairRequest) => {
    if (request.status === 'Done') {
      setEditingCostRequest(request);
      setEditCostValue(request.cost?.toString() || '');
      setEditCostError('');
      setShowEditCostModal(true);
    }
  };

  const handleSaveCost = async () => {
    if (!editingCostRequest) return;

    // Validate
    if (!editCostValue || editCostValue.trim() === '') {
      setEditCostError('Vui lòng nhập chi phí');
      return;
    }

    const costValue = parseFloat(editCostValue);
    if (isNaN(costValue) || costValue < 0) {
      setEditCostError('Chi phí phải là số hợp lệ và lớn hơn hoặc bằng 0');
      return;
    }

    try {
      setUpdatingId(editingCostRequest._id);
      const response = await requestService.updateRepairStatus(
        editingCostRequest._id,
        'Done',
        costValue,
        editingCostRequest.notes
      );
      const updated = response.data;

      if (updated?._id) {
        setRequests((prev) =>
          prev.map((r) =>
            r._id === updated._id ? { ...r, cost: updated.cost } : r
          ),
        );

        if (selectedRequest && selectedRequest._id === updated._id) {
          setSelectedRequest((prev) =>
            prev ? { ...prev, cost: updated.cost } : prev
          );
        }
      }

      setShowEditCostModal(false);
      setEditingCostRequest(null);
      setEditCostValue('');
      setEditCostError('');
    } catch (err: any) {
      console.error('Lỗi khi cập nhật chi phí:', err);
      alert(err?.response?.data?.message || 'Không thể cập nhật chi phí');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCloseEditCostModal = () => {
    setShowEditCostModal(false);
    setEditingCostRequest(null);
    setEditCostValue('');
    setEditCostError('');
  };

  const handleOpenImagePreview = (url: string) => {
    setPreviewImageUrl(url);
  };

  const handleCloseImagePreview = () => {
    setPreviewImageUrl(null);
  };

  const filteredRequests =
    statusFilter === 'ALL'
      ? requests
      : requests.filter((r) => r.status === statusFilter);

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
            <div className="repair-filter-wrapper">
              <label htmlFor="status-filter" className="repair-filter-label">
                Trạng thái:
              </label>
              <select
                id="status-filter"
                className="repair-filter-select"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'ALL' | 'Pending' | 'Processing' | 'Done')
                }
              >
                <option value="ALL">Tất cả</option>
                <option value="Pending">Chờ xử lý</option>
                <option value="Processing">Đang xử lý</option>
                <option value="Done">Đã xử lý</option>
              </select>
            </div>
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
                  <th>Trạng thái</th>
                  <th>Chi phí (VNĐ)</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((r, index) => (
                  <tr key={r._id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="cell-main">
                        <div className="cell-title">
                          {r.tenantId?.fullname || r.tenantId?.username || '-'}
                        </div>
                        <div className="cell-sub">
                          {r.tenantId?.phoneNumber || ''}
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
                    <td>
                      <span className={`status-badge status-${r.status.toLowerCase()}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.status === 'Done' ? (
                        <button
                          type="button"
                          className="cost-edit-btn"
                          onClick={() => handleEditCost(r)}
                          title="Click để sửa chi phí"
                        >
                          {r.cost?.toLocaleString('vi-VN') || 0}
                        </button>
                      ) : (
                        r.cost?.toLocaleString('vi-VN') || 0
                      )}
                    </td>
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
                {selectedRequest.notes && (
                  <div className="detail-row detail-row-description">
                    <span className="detail-label">Ghi chú:</span>
                    <span className="detail-value">{selectedRequest.notes}</span>
                  </div>
                )}
                {selectedRequest.images && selectedRequest.images.length > 0 && (
                  <div className="detail-row detail-row-description">
                    <span className="detail-label">Hình ảnh:</span>
                    <span className="detail-value">
                      <div className="repair-images-grid">
                        {selectedRequest.images.map((url, idx) => (
                          <button
                            type="button"
                            key={idx}
                            className="repair-image-item"
                            onClick={() => handleOpenImagePreview(url)}
                          >
                            <img src={url} alt={`Ảnh yêu cầu ${idx + 1}`} />
                          </button>
                        ))}
                      </div>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {previewImageUrl && (
          <div className="repair-modal-overlay" onClick={handleCloseImagePreview}>
            <div className="repair-image-preview-modal" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseImagePreview}
                aria-label="Đóng"
              >
                ×
              </button>
              <img src={previewImageUrl} alt="Xem ảnh yêu cầu" className="repair-image-preview" />
            </div>
          </div>
        )}

        {/* Modal sửa chi phí (chỉ sửa chi phí) */}
        {showEditCostModal && editingCostRequest && (
          <div className="repair-modal-overlay" onClick={handleCloseEditCostModal}>
            <div className="repair-modal repair-edit-cost-modal" onClick={(e) => e.stopPropagation()}>
              <div className="repair-modal-header">
                <h2>Sửa chi phí</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={handleCloseEditCostModal}
                  aria-label="Đóng"
                >
                  ×
                </button>
              </div>
              <div className="repair-modal-body">
                <div className="complete-form-group">
                  <label htmlFor="edit-cost">Chi phí (VNĐ) *</label>
                  <input
                    type="number"
                    id="edit-cost"
                    value={editCostValue}
                    onChange={(e) => {
                      setEditCostValue(e.target.value);
                      if (editCostError) {
                        setEditCostError('');
                      }
                    }}
                    placeholder="Nhập chi phí"
                    min="0"
                    step="1000"
                    className={editCostError ? 'input-error' : ''}
                  />
                  {editCostError && (
                    <span className="error-message">{editCostError}</span>
                  )}
                </div>
                <div className="complete-form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={handleCloseEditCostModal}
                    disabled={updatingId === editingCostRequest._id}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn-submit"
                    onClick={handleSaveCost}
                    disabled={updatingId === editingCostRequest._id || !editCostValue}
                  >
                    {updatingId === editingCostRequest._id ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal hoàn thành yêu cầu (chi phí + ghi chú) */}
        {showCompleteModal && completingRequest && (
          <div className="repair-modal-overlay" onClick={handleCloseCompleteModal}>
            <div className="repair-modal repair-complete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="repair-modal-header">
                <h2>Hoàn thành yêu cầu sửa chữa</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={handleCloseCompleteModal}
                  aria-label="Đóng"
                >
                  ×
                </button>
              </div>
              <div className="repair-modal-body">
                <div className="complete-form-group">
                  <label htmlFor="complete-cost">Chi phí (VNĐ) *</label>
                  <input
                    type="number"
                    id="complete-cost"
                    value={completeForm.cost}
                    onChange={(e) => {
                      setCompleteForm({ ...completeForm, cost: e.target.value });
                      if (formErrors.cost) {
                        setFormErrors({ ...formErrors, cost: '' });
                      }
                    }}
                    placeholder="Nhập chi phí"
                    min="0"
                    step="1000"
                    className={formErrors.cost ? 'input-error' : ''}
                  />
                  {formErrors.cost && (
                    <span className="error-message">{formErrors.cost}</span>
                  )}
                </div>
                <div className="complete-form-group">
                  <label htmlFor="complete-notes">Ghi chú</label>
                  <textarea
                    id="complete-notes"
                    value={completeForm.notes}
                    onChange={(e) =>
                      setCompleteForm({ ...completeForm, notes: e.target.value })
                    }
                    placeholder="Nhập ghi chú (tùy chọn)"
                    rows={4}
                  />
                </div>
                <div className="complete-form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={handleCloseCompleteModal}
                    disabled={updatingId === completingRequest._id}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn-submit"
                    onClick={handleCompleteSubmit}
                    disabled={updatingId === completingRequest._id || !completeForm.cost}
                  >
                    {updatingId === completingRequest._id ? 'Đang xử lý...' : 'Hoàn thành'}
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


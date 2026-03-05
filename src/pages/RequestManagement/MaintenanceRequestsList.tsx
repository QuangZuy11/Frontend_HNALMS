import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { requestService } from '../../services/requestService';
import { useAuth } from '../../hooks/useAuth';
import './RepairRequestsList.css';

interface RepairRequest {
  _id: string;
  type: 'Sửa chữa' | 'Bảo trì' | string;
  description: string;
  images: string[];
  status: 'Pending' | 'Processing' | 'Done' | 'Unpaid' | string;
  createdDate?: string;
  paymentType?: 'REVENUE' | 'EXPENSE' | null;
  cost?: number;
  notes?: string;
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
  room?: {
    _id: string;
    name: string;
    roomCode?: string;
  } | null;
}

export default function MaintenanceRequestsList() {
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [autoPaymentVoucher, setAutoPaymentVoucher] = useState<string>('');
  const [autoPaymentVoucherLoading, setAutoPaymentVoucherLoading] = useState(false);
  const [autoPaymentVoucherError, setAutoPaymentVoucherError] = useState<string>('');
  const [paymentForm, setPaymentForm] = useState({
    financialTitle: '',
    financialAmount: '',
  });
  const [paymentFormErrors, setPaymentFormErrors] = useState({
    financialTitle: '',
    financialAmount: '',
  });
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'Pending' | 'Processing' | 'Unpaid' | 'Done'
  >('ALL');
  const [roomSearch, setRoomSearch] = useState<string>('');
  const [tenantSearch, setTenantSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const { isManager } = useAuth();
  const tableRef = useRef<HTMLDivElement | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await requestService.getRepairRequests(
        roomSearch,
        tenantSearch,
        currentPage,
        itemsPerPage,
        'Bảo trì'
      );
      if (response.success && Array.isArray(response.data)) {
        setRequests(response.data as RepairRequest[]);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách yêu cầu bảo trì:', err);
      const msg =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.response?.data?.message ||
        (err as Error).message ||
        'Không thể tải danh sách yêu cầu bảo trì';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [roomSearch, tenantSearch, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Reset về trang 1 khi thay đổi filter
  useEffect(() => {
    setCurrentPage(1);
  }, [roomSearch, tenantSearch, statusFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleItemsPerPageChange = (limit: number) => {
    setItemsPerPage(limit);
    setCurrentPage(1);
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

  const getStatusLabel = (request: RepairRequest) => {
    if (request.status === 'Pending') return 'Chờ xử lý';
    if (request.status === 'Processing') return 'Đang xử lý';
    if (request.status === 'Unpaid') return 'Chờ thanh toán';
    return 'Đã xử lý';
  };

  const handleViewDetail = (request: RepairRequest) => {
    setSelectedRequest(request);
  };

  const handleCloseDetail = () => {
    setSelectedRequest(null);
  };

  const handleOpenImagePreview = (url: string) => {
    setPreviewImageUrl(url);
  };

  const handleCloseImagePreview = () => {
    setPreviewImageUrl(null);
  };

  const handleUpdateStatus = async (
    request: RepairRequest,
    nextStatus: 'Pending' | 'Processing' | 'Done',
  ) => {
    // Nếu chuyển sang "Đã xử lý", hiện modal nhập phiếu chi
    if (nextStatus === 'Done') {
      setSelectedRequest(request);
      setShowPaymentModal(true);
      setAutoPaymentVoucher('');
      setAutoPaymentVoucherError('');
      setPaymentForm({
        financialTitle: '',
        financialAmount: '',
      });
      setPaymentFormErrors({
        financialTitle: '',
        financialAmount: '',
      });

      // Auto-generate payment voucher code
      (async () => {
        try {
          setAutoPaymentVoucherLoading(true);
          const res = await requestService.getNextMaintenancePaymentVoucher();
          const code = res?.data?.paymentVoucher;
          if (!code) throw new Error('Không thể tạo mã phiếu chi');
          setAutoPaymentVoucher(code);
        } catch (err) {
          console.error('Lỗi khi tạo mã phiếu chi:', err);
          setAutoPaymentVoucherError(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (err as any)?.response?.data?.message ||
            (err as Error).message ||
            'Không thể tạo mã phiếu chi',
          );
        } finally {
          setAutoPaymentVoucherLoading(false);
        }
      })();
      return;
    }

    const confirmText = `Bạn có chắc muốn chuyển yêu cầu này sang trạng thái "${nextStatus}"?`;

    if (!window.confirm(confirmText)) return;

    try {
      setUpdatingId(request._id);
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
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái yêu cầu:', err);
      alert(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.response?.data?.message || 'Không thể cập nhật trạng thái yêu cầu',
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedRequest(null);
    setPaymentForm({
      financialTitle: '',
      financialAmount: '',
    });
    setPaymentFormErrors({
      financialTitle: '',
      financialAmount: '',
    });
    setAutoPaymentVoucher('');
    setAutoPaymentVoucherError('');
    setAutoPaymentVoucherLoading(false);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedRequest) return;

    const errors = {
      financialTitle: '',
      financialAmount: '',
    };
    let isValid = true;

    if (!paymentForm.financialTitle.trim()) {
      errors.financialTitle = 'Vui lòng nhập tiêu đề phiếu chi';
      isValid = false;
    }

    if (!paymentForm.financialAmount || paymentForm.financialAmount.trim() === '') {
      errors.financialAmount = 'Vui lòng nhập tổng số tiền';
      isValid = false;
    } else {
      const amount = parseFloat(paymentForm.financialAmount);
      if (isNaN(amount) || amount < 0) {
        errors.financialAmount = 'Tổng số tiền phải là số hợp lệ và lớn hơn hoặc bằng 0';
        isValid = false;
      }
    }

    setPaymentFormErrors(errors);
    if (!isValid) return;

    const amountNumber = parseFloat(paymentForm.financialAmount);

    try {
      setUpdatingId(selectedRequest._id);
      const response = await requestService.updateRepairStatus(
        selectedRequest._id,
        'Done',
        amountNumber,
        'Bảo trì thiết bị',
        undefined,
        {
          financialTitle: paymentForm.financialTitle.trim(),
          financialAmount: amountNumber,
          financialType: 'Payment',
          paymentVoucher: autoPaymentVoucher,
        },
        'EXPENSE',
      );
      const updated = response.data;

      if (updated?._id) {
        setRequests((prev) =>
          prev.map((r) =>
            r._id === updated._id
              ? {
                ...r,
                status: updated.status,
                cost: updated.cost,
                paymentType: updated.paymentType ?? 'EXPENSE',
              }
              : r,
          ),
        );

        if (selectedRequest && selectedRequest._id === updated._id) {
          setSelectedRequest((prev) =>
            prev
              ? {
                ...prev,
                status: updated.status,
                cost: updated.cost,
                paymentType: updated.paymentType ?? 'EXPENSE',
              }
              : prev,
          );
        }
      }

      setShowPaymentModal(false);
      setSelectedRequest(null);
      setPaymentForm({
        financialTitle: '',
        financialAmount: '',
      });
      setPaymentFormErrors({
        financialTitle: '',
        financialAmount: '',
      });
    } catch (err) {
      console.error('Lỗi khi hoàn thành yêu cầu bảo trì:', err);
      alert(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any)?.response?.data?.message || 'Không thể hoàn thành yêu cầu',
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter theo status
  const filteredRequests =
    statusFilter === 'ALL' ? requests : requests.filter((r) => r.status === statusFilter);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage) || 1);
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  const getVisiblePages = () => {
    const pages: number[] = [];
    let start = Math.max(1, safePage - 2);
    let end = Math.min(totalPages, safePage + 2);

    if (safePage <= 2) end = Math.min(totalPages, 5);
    if (safePage >= totalPages - 1) start = Math.max(1, totalPages - 4);

    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  };

  if (!isManager) {
    return (
      <div className="repair-requests-page">
        <p>Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  return (
    <div className="repair-requests-page">
      <div className="repair-requests-card">
        <div className="repair-requests-header">
          <div>
            <h1>Danh sách yêu cầu bảo trì</h1>
            <p className="subtitle">
              Các yêu cầu bảo trì do cư dân gửi lên tòa nhà
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="repair-filter-wrapper">
              <label htmlFor="tenant-search" className="repair-filter-label">
                Cư dân:
              </label>
              <input
                type="text"
                id="tenant-search"
                className="repair-filter-select"
                placeholder="Nhập tên cư dân"
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
              />
            </div>
            <div className="repair-filter-wrapper">
              <label htmlFor="room-search" className="repair-filter-label">
                Phòng:
              </label>
              <input
                type="text"
                id="room-search"
                className="repair-filter-select"
                placeholder="Nhập số phòng (ví dụ: 320)"
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
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
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as
                    | 'ALL'
                    | 'Pending'
                    | 'Processing'
                    | 'Done'
                    | 'Unpaid',
                  )
                }
              >
                <option value="ALL">Tất cả</option>
                <option value="Pending">Chờ xử lý</option>
                <option value="Processing">Đang xử lý</option>
                <option value="Done">Đã xử lý</option>
                <option value="Unpaid">Chờ thanh toán</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="repair-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && filteredRequests.length === 0 && (
          <div className="repair-empty">
            <p>Chưa có yêu cầu bảo trì nào.</p>
          </div>
        )}

        {!loading && !error && (
          <div className="repair-table-wrap" ref={tableRef}>
            <table className="repair-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Cư dân</th>
                  <th>Phòng</th>
                  <th>Thiết bị</th>
                  <th>Trạng thái</th>
                  <th>Chi phí (VNĐ)</th>
                  <th>Người thanh toán</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRequests.map((r, index) => (
                  <tr key={r._id}>
                    <td>{startIndex + index + 1}</td>
                    <td>
                      <div className="cell-main">
                        <div className="cell-title">
                          {r.tenantId?.fullname || r.tenantId?.username || '-'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cell-main">
                        <div className="cell-title">
                          {r.room?.name || r.room?.roomCode || '-'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cell-main">
                        <div className="cell-title">{r.devicesId?.name || '-'}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${r.status.toLowerCase()}`}>
                        {getStatusLabel(r)}
                      </span>
                    </td>
                    <td>{r.cost?.toLocaleString('vi-VN') || 0}</td>
                    <td>
                      <div className="cell-main">
                        <div className="cell-title">Kế toán</div>
                      </div>
                    </td>
                    <td>{formatDate(r.createdDate)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn-view-detail"
                          onClick={() => handleViewDetail(r)}
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
        {/* Modal xem chi tiết */}
        {selectedRequest && (
          <div className="repair-modal-overlay" onClick={handleCloseDetail}>
            <div className="repair-modal repair-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="repair-modal-header">
                <h2>Chi tiết yêu cầu bảo trì</h2>
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
                {/* Layout 2 cột chính + ảnh */}
                <div className="detail-grid-layout">
                  {/* Cột thông tin bên trái */}
                  <div className="detail-grid-fields">
                    {/* Hàng 1: Phòng + Cư dân */}
                    <div className="detail-field-group">
                      <div className="detail-field">
                        <span className="detail-field-label">Phòng</span>
                        <span className="detail-field-value">
                          {selectedRequest.room?.name || selectedRequest.room?.roomCode || '-'}
                        </span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-field-label">Cư dân</span>
                        <span className="detail-field-value">
                          {selectedRequest.tenantId?.fullname || selectedRequest.tenantId?.username || '-'}
                        </span>
                      </div>
                    </div>
                    {/* Hàng 2: Số điện thoại + Thiết bị */}
                    <div className="detail-field-group">
                      <div className="detail-field">
                        <span className="detail-field-label">Số điện thoại</span>
                        <span className="detail-field-value">
                          {selectedRequest.tenantId?.phoneNumber || '-'}
                        </span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-field-label">Thiết bị</span>
                        <span className="detail-field-value">
                          {selectedRequest.devicesId?.name || '-'}
                        </span>
                      </div>
                    </div>
                    {/* Hàng 3: Loại + Trạng thái */}
                    <div className="detail-field-group">
                      <div className="detail-field">
                        <span className="detail-field-label">Loại</span>
                        <span className="detail-field-value">{selectedRequest.type}</span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-field-label">Trạng thái</span>
                        <span className="detail-field-value">
                          <span className={`status-badge status-${selectedRequest.status.toLowerCase()}`}>
                            {getStatusLabel(selectedRequest)}
                          </span>
                        </span>
                      </div>
                    </div>
                    {/* Hàng 4: Chi phí + Ngày tạo */}
                    <div className="detail-field-group">
                      <div className="detail-field">
                        <span className="detail-field-label">Chi phí (VNĐ)</span>
                        <span className="detail-field-value">
                          {selectedRequest.cost?.toLocaleString('vi-VN') || 0}
                        </span>
                      </div>
                      <div className="detail-field">
                        <span className="detail-field-label">Ngày tạo</span>
                        <span className="detail-field-value">
                          {formatDate(selectedRequest.createdDate)}
                        </span>
                      </div>
                    </div>
                    {/* Hàng 5: Người thanh toán (bảo trì luôn là Kế toán) */}
                    <div className="detail-field-group">
                      <div className="detail-field">
                        <span className="detail-field-label">Người thanh toán</span>
                        <span className="detail-field-value">Kế toán</span>
                      </div>
                      {selectedRequest.notes && (
                        <div className="detail-field">
                          <span className="detail-field-label">Ghi chú</span>
                          <span className="detail-field-value">{selectedRequest.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Hình ảnh bên phải */}
                  {selectedRequest.images && selectedRequest.images.length > 0 && (
                    <div className="detail-grid-image">
                      <button
                        type="button"
                        className="detail-main-image-btn"
                        onClick={() => handleOpenImagePreview(selectedRequest.images[0])}
                        title="Xem ảnh lớn"
                      >
                        <img
                          src={selectedRequest.images[0]}
                          alt="Ảnh yêu cầu"
                          className="detail-main-image"
                        />
                      </button>
                      {selectedRequest.images.length > 1 && (
                        <div className="detail-extra-images">
                          {selectedRequest.images.slice(1).map((url, idx) => (
                            <button
                              type="button"
                              key={idx + 1}
                              className="detail-extra-image-btn"
                              onClick={() => handleOpenImagePreview(url)}
                            >
                              <img src={url} alt={`Ảnh ${idx + 2}`} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Email - toàn chiều rộng để hiển thị đầy đủ */}
                <div className="detail-email-row">
                  <span className="detail-field-label">Email</span>
                  <span className="detail-email-value">
                    {selectedRequest.tenantId?.email || '-'}
                  </span>
                </div>

                {/* Mô tả */}
                <div className="detail-description-block">
                  <span className="detail-field-label">Mô tả</span>
                  <p className="detail-description-text">{selectedRequest.description || '-'}</p>
                </div>

                {/* Tình trạng xử lý + nút Xong */}
                <div className="detail-status-actions">
                  <div className="detail-status-actions-select-row">
                    <span className="detail-status-clock">🕐</span>
                    <span className="detail-status-label">Tình trạng xử lý</span>
                    <select
                      className="detail-status-select detail-status-select--inline"
                      value={selectedRequest.status}
                      onChange={(e) =>
                        handleUpdateStatus(
                          selectedRequest,
                          e.target.value as 'Pending' | 'Processing' | 'Done',
                        )
                      }
                      disabled={
                        updatingId === selectedRequest._id ||
                        selectedRequest.status === 'Done'
                      }
                    >
                      <option value="Pending" disabled={selectedRequest.status !== 'Pending'}>
                        Chờ xử lý
                      </option>
                      <option
                        value="Processing"
                        disabled={selectedRequest.status === 'Done'}
                      >
                        Đang xử lý
                      </option>
                      <option value="Done" disabled={false}>
                        Đã xử lý
                      </option>
                    </select>
                    {updatingId === selectedRequest._id && (
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

        {/* Modal preview hình ảnh */}
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

        {/* Modal nhập phiếu chi khi chọn "Đã xử lý" */}
        {showPaymentModal && selectedRequest && (
          <div className="repair-modal-overlay" onClick={handleClosePaymentModal}>
            <div
              className="repair-modal repair-complete-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="repair-modal-header">
                <h2>Tạo phiếu chi bảo trì</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={handleClosePaymentModal}
                  aria-label="Đóng"
                >
                  ×
                </button>
              </div>
              <div className="repair-modal-body">
                <div className="complete-form-group">
                  <label>Mã phiếu chi</label>
                  <input
                    type="text"
                    value={
                      autoPaymentVoucherLoading
                        ? 'Đang tạo mã phiếu chi...'
                        : autoPaymentVoucher || 'Chưa tạo được mã phiếu chi'
                    }
                    disabled
                  />
                  {autoPaymentVoucherError && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        marginTop: 6,
                      }}
                    >
                      <span className="error-message" style={{ marginTop: 0 }}>
                        {autoPaymentVoucherError}
                      </span>
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => {
                          if (autoPaymentVoucherLoading) return;
                          setAutoPaymentVoucher('');
                          setAutoPaymentVoucherError('');
                          (async () => {
                            try {
                              setAutoPaymentVoucherLoading(true);
                              const res = await requestService.getNextMaintenancePaymentVoucher();
                              const code = res?.data?.paymentVoucher;
                              if (!code) throw new Error('Không thể tạo mã phiếu chi');
                              setAutoPaymentVoucher(code);
                            } catch (err) {
                              console.error('Lỗi khi tạo mã phiếu chi:', err);
                              setAutoPaymentVoucherError(
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (err as any)?.response?.data?.message ||
                                (err as Error).message ||
                                'Không thể tạo mã phiếu chi',
                              );
                            } finally {
                              setAutoPaymentVoucherLoading(false);
                            }
                          })();
                        }}
                        disabled={autoPaymentVoucherLoading}
                      >
                        Thử lại
                      </button>
                    </div>
                  )}
                </div>
                <div className="complete-form-group">
                  <label>
                    Tiêu đề phiếu chi <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentForm.financialTitle}
                    onChange={(e) => {
                      setPaymentForm((prev) => ({ ...prev, financialTitle: e.target.value }));
                      if (paymentFormErrors.financialTitle) {
                        setPaymentFormErrors((prev) => ({ ...prev, financialTitle: '' }));
                      }
                    }}
                    placeholder="Nhập tiêu đề phiếu chi"
                  />
                  {paymentFormErrors.financialTitle && (
                    <span className="error-message">{paymentFormErrors.financialTitle}</span>
                  )}
                </div>
                <div className="complete-form-group">
                  <label>
                    Tổng số tiền (VNĐ) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentForm.financialAmount}
                    onChange={(e) => {
                      setPaymentForm((prev) => ({ ...prev, financialAmount: e.target.value }));
                      if (paymentFormErrors.financialAmount) {
                        setPaymentFormErrors((prev) => ({ ...prev, financialAmount: '' }));
                      }
                    }}
                    placeholder="Nhập tổng số tiền"
                  />
                  {paymentFormErrors.financialAmount && (
                    <span className="error-message">{paymentFormErrors.financialAmount}</span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button
                    type="button"
                    className="btn-submit"
                    onClick={handlePaymentSubmit}
                    disabled={
                      updatingId === selectedRequest._id ||
                      !paymentForm.financialTitle.trim() ||
                      !paymentForm.financialAmount ||
                      autoPaymentVoucherLoading ||
                      !!autoPaymentVoucherError ||
                      !autoPaymentVoucher
                    }
                    style={{ padding: '6px 16px', fontSize: '14px' }}
                  >
                    {updatingId === selectedRequest._id ? 'Đang xử lý...' : 'Hoàn thành'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination đưa ra ngoài thẻ card và dùng chung thiết kế với màn yêu cầu sửa chữa */}
      {!loading && !error && (
        <div className={`repair-pagination ${isManager ? 'repair-pagination--manager' : ''}`}>
          <div className="repair-pagination-info">
            <span>
              Tổng: <strong>{filteredRequests.length}</strong> bản ghi | Trang{' '}
              <strong>{safePage}</strong>/{Math.max(totalPages, 1)}
            </span>
            {!isManager && (
              <div className="repair-pagination-items-per-page">
                <label htmlFor="items-per-page">Hiển thị:</label>
                <select
                  id="items-per-page"
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="repair-pagination-select"
                >
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={10}>10</option>
                  <option value={11}>11</option>
                  <option value={20}>20</option>
                </select>
              </div>
            )}
          </div>
          <div className="repair-pagination-controls">
            <button
              type="button"
              className="pagination-arrow-btn"
              onClick={() => handlePageChange(1)}
              disabled={safePage === 1 || loading}
              aria-label="Trang đầu"
            >
              «
            </button>
            <button
              type="button"
              className="pagination-arrow-btn"
              onClick={() => handlePageChange(safePage - 1)}
              disabled={safePage === 1 || loading}
              aria-label="Trang trước"
            >
              ‹
            </button>

            {getVisiblePages().map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={pageNumber === safePage ? 'pagination-current-page' : 'pagination-arrow-btn'}
                onClick={() => handlePageChange(pageNumber)}
                disabled={loading}
                aria-label={`Trang ${pageNumber}`}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              className="pagination-arrow-btn"
              onClick={() => handlePageChange(safePage + 1)}
              disabled={safePage >= totalPages || totalPages === 0 || loading}
              aria-label="Trang sau"
            >
              ›
            </button>
            <button
              type="button"
              className="pagination-arrow-btn"
              onClick={() => handlePageChange(totalPages)}
              disabled={safePage >= totalPages || totalPages === 0 || loading}
              aria-label="Trang cuối"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

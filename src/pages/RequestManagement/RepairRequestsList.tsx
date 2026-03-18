import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { requestService } from '../../services/requestService';
import useAuth from '../../hooks/useAuth';
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
  paymentType?: 'REVENUE' | 'EXPENSE' | null;
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

export default function RepairRequestsList() {
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showCompleteTypeModal, setShowCompleteTypeModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showFreeModal, setShowFreeModal] = useState(false);
  const [completingRequest, setCompletingRequest] = useState<RepairRequest | null>(null);
  const [autoInvoiceCode, setAutoInvoiceCode] = useState<string>('');
  const [autoInvoiceCodeLoading, setAutoInvoiceCodeLoading] = useState(false);
  const [autoInvoiceCodeError, setAutoInvoiceCodeError] = useState<string>('');
  const [autoPaymentVoucher, setAutoPaymentVoucher] = useState<string>('');
  const [autoPaymentVoucherLoading, setAutoPaymentVoucherLoading] = useState(false);
  const [autoPaymentVoucherError, setAutoPaymentVoucherError] = useState<string>('');
  const [completeForm, setCompleteForm] = useState({
    invoiceTitle: '',
    invoiceTotalAmount: '',
  });
  const [formErrors, setFormErrors] = useState({
    invoiceTitle: '',
    invoiceTotalAmount: '',
  });
  const [freeForm, setFreeForm] = useState({
    financialTitle: '',
    financialAmount: '',
  });
  const [freeFormErrors, setFreeFormErrors] = useState({
    financialTitle: '',
    financialAmount: '',
  });
  // Chi phí hiển thị được backend tính sẵn dựa trên invoice/financial ticket,
  // không cho sửa tay nữa nên bỏ modal chỉnh sửa cost.
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'Pending' | 'Processing' | 'Unpaid' | 'Done' | 'Paid'
  >(
    'ALL',
  );
  const [roomSearch, setRoomSearch] = useState<string>('');
  const [tenantSearch, setTenantSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(11);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const { isManager } = useAuth();
  const tableRef = useRef<HTMLDivElement | null>(null);

  // Không khoá scroll toàn trang nữa để hành vi giống màn cư dân (/manager/residents),
  // màn cư dân dùng scroll mặc định của layout. Khi vào màn hình, scroll về đầu.
  useEffect(() => {
    const main = document.querySelector('.dashboard-layout-main') as HTMLElement | null;
    if (main) {
      main.scrollTop = 0;
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await requestService.getRepairRequests(
        roomSearch,
        tenantSearch,
        currentPage,
        itemsPerPage,
        'Sửa chữa'
      );
      if (response.success && Array.isArray(response.data)) {
        setRequests(response.data);
        setTotalItems(response.total || 0);
        setTotalPages(response.totalPages || 0);
      } else {
        setRequests([]);
        setTotalItems(0);
        setTotalPages(0);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách yêu cầu sửa chữa:', err);
      const msg =
        err?.response?.data?.message || 'Không thể tải danh sách yêu cầu sửa chữa';
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
    setCurrentPage(1); // Reset về trang 1 khi thay đổi số item mỗi trang
  };

  const getVisiblePages = () => {
    const pages: number[] = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 2) end = Math.min(totalPages, 5);
    if (currentPage >= totalPages - 1) start = Math.max(1, totalPages - 4);

    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
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

  const canTransitionStatus = (
    current: 'Pending' | 'Processing' | 'Done' | 'Unpaid' | 'Paid',
    target: 'Pending' | 'Processing' | 'Done' | 'Unpaid' | 'Paid',
  ) => {
    const order: Array<'Pending' | 'Processing' | 'Done' | 'Unpaid' | 'Paid'> = [
      'Pending',
      'Processing',
      'Done',
      'Unpaid',
      'Paid',
    ];
    const currentIndex = order.indexOf(current);
    const targetIndex = order.indexOf(target);

    // Không cho lùi trạng thái hoặc nhảy cóc
    // Chỉ cho phép: giữ nguyên hoặc tiến đúng 1 bước
    if (currentIndex === -1 || targetIndex === -1) return false;
    return targetIndex === currentIndex || targetIndex === currentIndex + 1;
  };

  const getStatusLabel = (request: RepairRequest) => {
    if (request.status === 'Pending') return 'Chờ xử lý';
    if (request.status === 'Processing') return 'Đang xử lý';
    if (request.status === 'Unpaid') return 'Chờ thanh toán';
    if (request.status === 'Paid') return 'Đã thanh toán';
    return 'Đã xử lý';
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
    nextStatus: 'Pending' | 'Processing' | 'Done' | 'Unpaid',
  ) => {
    // Nếu chuyển sang "Đã xử lý", hiện modal chọn loại xử lý (có phí / miễn phí)
    if (nextStatus === 'Done') {
      setCompletingRequest(request);
      setShowCompleteTypeModal(true);
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

  const handleChoosePaidRepair = () => {
    if (!completingRequest) return;
    setShowCompleteTypeModal(false);
    setAutoInvoiceCode('');
    setAutoInvoiceCodeError('');
    setCompleteForm({
      invoiceTitle: '',
      invoiceTotalAmount: '',
    });
    setFormErrors({
      invoiceTitle: '',
      invoiceTotalAmount: '',
    });
    setShowCompleteModal(true);

    // Auto-generate invoice code for paid repair only
    (async () => {
      try {
        setAutoInvoiceCodeLoading(true);
        const res = await requestService.getNextRepairInvoiceCode();
        const code = res?.data?.invoiceCode;
        if (!code) throw new Error('Không thể tạo mã hóa đơn');
        setAutoInvoiceCode(code);
      } catch (err: any) {
        console.error('Lỗi khi tạo mã hóa đơn:', err);
        setAutoInvoiceCodeError(
          err?.response?.data?.message || err?.message || 'Không thể tạo mã hóa đơn',
        );
      } finally {
        setAutoInvoiceCodeLoading(false);
      }
    })();
  };

  const handleChooseFreeRepair = () => {
    if (!completingRequest) return;
    setShowCompleteTypeModal(false);
    setFreeForm({
      financialTitle: '',
      financialAmount: '',
    });
    setFreeFormErrors({
      financialTitle: '',
      financialAmount: '',
    });
    setShowFreeModal(true);

    // Auto-generate payment voucher for free repair
    (async () => {
      try {
        setAutoPaymentVoucherLoading(true);
        setAutoPaymentVoucherError('');
        const res = await requestService.getNextRepairPaymentVoucher();
        const code = res?.data?.paymentVoucher;
        if (!code) throw new Error('Không thể tạo mã phiếu chi');
        setAutoPaymentVoucher(code);
      } catch (err: any) {
        console.error('Lỗi khi tạo mã phiếu chi:', err);
        setAutoPaymentVoucherError(
          err?.response?.data?.message || err?.message || 'Không thể tạo mã phiếu chi',
        );
      } finally {
        setAutoPaymentVoucherLoading(false);
      }
    })();
  };

  const handleCompleteSubmit = async () => {
    if (!completingRequest) return;

    // Validate form
    const errors = {
      invoiceTitle: '',
      invoiceTotalAmount: '',
    };
    let isValid = true;

    if (!completeForm.invoiceTitle.trim()) {
      errors.invoiceTitle = 'Vui lòng nhập tiêu đề hóa đơn';
      isValid = false;
    }

    if (!completeForm.invoiceTotalAmount || completeForm.invoiceTotalAmount.trim() === '') {
      errors.invoiceTotalAmount = 'Vui lòng nhập tổng số tiền';
      isValid = false;
    } else {
      const total = parseFloat(completeForm.invoiceTotalAmount);
      if (isNaN(total) || total < 0) {
        errors.invoiceTotalAmount = 'Tổng số tiền phải là số hợp lệ và lớn hơn hoặc bằng 0';
        isValid = false;
      }
    }

    setFormErrors(errors);

    if (!isValid) {
      return;
    }

    const totalAmount = parseFloat(completeForm.invoiceTotalAmount);
    const cost = totalAmount; // Chi phí trên request sẽ bằng tổng số tiền hóa đơn

    // Due date is auto-set: +7 days starting from the moment user clicks "Hoàn thành"
    const toDateInputValue = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    const dueDate = (() => {
      const now = new Date();
      const target = new Date(now);
      target.setDate(target.getDate() + 7);
      return toDateInputValue(target);
    })();

    try {
      setUpdatingId(completingRequest._id);

      let invoiceCodeToUse = autoInvoiceCode;
      if (!invoiceCodeToUse) {
        const res = await requestService.getNextRepairInvoiceCode();
        const code = res?.data?.invoiceCode;
        if (!code) throw new Error('Không thể tạo mã hóa đơn');
        invoiceCodeToUse = code;
        setAutoInvoiceCode(code);
      }

      const response = await requestService.updateRepairStatus(
        completingRequest._id,
        'Done',
        cost,
        undefined,
        {
          invoiceCode: invoiceCodeToUse,
          title: completeForm.invoiceTitle.trim(),
          totalAmount,
          dueDate,
        },
        undefined,
        'REVENUE'
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
                paymentType: updated.paymentType ?? 'REVENUE',
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
                paymentType: updated.paymentType ?? 'REVENUE',
              }
              : prev,
          );
        }
      }

      setShowCompleteModal(false);
      setCompletingRequest(null);
      setAutoInvoiceCode('');
      setAutoInvoiceCodeError('');
      setCompleteForm({
        invoiceTitle: '',
        invoiceTotalAmount: '',
      });
      setFormErrors({
        invoiceTitle: '',
        invoiceTotalAmount: '',
      });
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
    setShowCompleteTypeModal(false);
    setAutoInvoiceCode('');
    setAutoInvoiceCodeError('');
    setCompleteForm({
      invoiceTitle: '',
      invoiceTotalAmount: '',
    });
    setFormErrors({
      invoiceTitle: '',
      invoiceTotalAmount: '',
    });
  };

  const handleCloseFreeModal = () => {
    setShowFreeModal(false);
    setCompletingRequest(null);
    setFreeForm({
      financialTitle: '',
      financialAmount: '',
    });
    setFreeFormErrors({
      financialTitle: '',
      financialAmount: '',
    });
    setAutoPaymentVoucher('');
    setAutoPaymentVoucherError('');
    setAutoPaymentVoucherLoading(false);
  };

  const handleFreeSubmit = async () => {
    if (!completingRequest) return;

    const errors = {
      financialTitle: '',
      financialAmount: '',
    };
    let isValid = true;

    if (!freeForm.financialTitle.trim()) {
      errors.financialTitle = 'Vui lòng nhập tiêu đề phiếu chi';
      isValid = false;
    }

    if (!freeForm.financialAmount || freeForm.financialAmount.trim() === '') {
      errors.financialAmount = 'Vui lòng nhập tổng số tiền';
      isValid = false;
    } else {
      const amount = parseFloat(freeForm.financialAmount);
      if (isNaN(amount) || amount < 0) {
        errors.financialAmount = 'Tổng số tiền phải là số hợp lệ và lớn hơn hoặc bằng 0';
        isValid = false;
      }
    }

    setFreeFormErrors(errors);
    if (!isValid) return;

    const amountNumber = parseFloat(freeForm.financialAmount);

    try {
      setUpdatingId(completingRequest._id);
      const response = await requestService.updateRepairStatus(
        completingRequest._id,
        'Done',
        amountNumber,
        'Sửa chữa miễn phí cho cư dân',
        undefined,
        {
          financialTitle: freeForm.financialTitle.trim(),
          financialAmount: amountNumber,
          paymentVoucher: autoPaymentVoucher,
        },
        'EXPENSE'
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

      setShowFreeModal(false);
      setCompletingRequest(null);
      setFreeForm({
        financialTitle: '',
        financialAmount: '',
      });
      setFreeFormErrors({
        financialTitle: '',
        financialAmount: '',
      });
    } catch (err: any) {
      console.error('Lỗi khi hoàn thành yêu cầu (miễn phí):', err);
      alert(err?.response?.data?.message || 'Không thể hoàn thành yêu cầu');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenImagePreview = (url: string) => {
    setPreviewImageUrl(url);
  };

  const handleCloseImagePreview = () => {
    setPreviewImageUrl(null);
  };

  const filteredRequests =
    statusFilter === 'ALL' ? requests : requests.filter((r) => r.status === statusFilter);

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
          <div className="repair-requests-filters">
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
                        | 'Unpaid'
                        | 'Paid',
                      )
                    }
              >
                <option value="ALL">Tất cả</option>
                <option value="Pending">Chờ xử lý</option>
                <option value="Processing">Đang xử lý</option>
                <option value="Done">Đã xử lý</option>
                <option value="Unpaid">Chờ thanh toán</option>
                <option value="Paid">Đã thanh toán</option>
              </select>
            </div>
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
                {filteredRequests.map((r, index) => (
                  <tr key={r._id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
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
                        <div className="cell-title">
                          {r.paymentType === 'REVENUE'
                            ? 'Cư dân'
                            : r.paymentType === 'EXPENSE'
                              ? 'Kế toán'
                              : '-'}
                        </div>
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
                    {/* Hàng 5: Loại thanh toán + Người thanh toán (nếu có) */}
                    {selectedRequest.paymentType && (
                      <div className="detail-field-group">
                        <div className="detail-field">
                          <span className="detail-field-label">Loại thanh toán</span>
                          <span className="detail-field-value">
                            {selectedRequest.paymentType === 'REVENUE' ? 'Sửa chữa có phí' : 'Sửa chữa miễn phí'}
                          </span>
                        </div>
                        <div className="detail-field">
                          <span className="detail-field-label">Người thanh toán</span>
                          <span className="detail-field-value">
                            {selectedRequest.paymentType === 'REVENUE' ? 'Cư dân' : 'Kế toán'}
                          </span>
                        </div>
                      </div>
                    )}
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
                  <p className="detail-description-text">{selectedRequest.description}</p>

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
                          e.target.value as
                          | 'Pending'
                          | 'Processing'
                          | 'Done'
                          | 'Unpaid',
                        )
                      }
                      disabled={
                        updatingId === selectedRequest._id ||
                        selectedRequest.status === 'Done' ||
                        selectedRequest.status === 'Unpaid' ||
                        selectedRequest.status === 'Paid'
                      }
                    >
                      <option
                        value="Pending"
                        disabled={
                          !canTransitionStatus(
                            selectedRequest.status as 'Pending' | 'Processing' | 'Done' | 'Unpaid' | 'Paid',
                            'Pending',
                          )
                        }
                      >
                        Chờ xử lý
                      </option>
                      <option
                        value="Processing"
                        disabled={
                          !canTransitionStatus(
                            selectedRequest.status as 'Pending' | 'Processing' | 'Done' | 'Unpaid' | 'Paid',
                            'Processing',
                          )
                        }
                      >
                        Đang xử lý
                      </option>
                      <option
                        value="Done"
                        disabled={
                          !canTransitionStatus(
                            selectedRequest.status as 'Pending' | 'Processing' | 'Done' | 'Unpaid' | 'Paid',
                            'Done',
                          )
                        }
                      >
                        Đã xử lý
                      </option>
                      <option value="Unpaid" disabled>
                        Chờ thanh toán
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

        {/* Modal chọn loại sửa chữa khi hoàn thành */}
        {showCompleteTypeModal && completingRequest && (
          <div className="repair-modal-overlay" onClick={() => setShowCompleteTypeModal(false)}>
            <div
              className="repair-modal repair-complete-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="repair-modal-header">
                <h2>Chọn hình thức xử lý</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowCompleteTypeModal(false)}
                  aria-label="Đóng"
                >
                  ×
                </button>
              </div>
              <div className="repair-modal-body">
                <p style={{ marginBottom: 16 }}>
                  Vui lòng chọn hình thức xử lý cho yêu cầu sửa chữa này:
                </p>
                <div className="complete-form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={handleChoosePaidRepair}
                    disabled={updatingId === completingRequest._id}
                  >
                    Sửa chữa có phí (tạo hóa đơn)
                  </button>
                  <button
                    type="button"
                    className="btn-submit"
                    onClick={handleChooseFreeRepair}
                    disabled={updatingId === completingRequest._id}
                  >
                    Sửa chữa miễn phí (tạo phiếu chi)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal hoàn thành yêu cầu - tạo hóa đơn sửa chữa (có phí) */}
        {showCompleteModal && completingRequest && (
          <div className="repair-modal-overlay" onClick={handleCloseCompleteModal}>
            <div className="repair-modal repair-complete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="repair-modal-header">
                <h2>Tạo hoá đơn sửa chữa</h2>
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
                  <label>Mã hóa đơn</label>
                  <input
                    type="text"
                    value={
                      autoInvoiceCodeLoading
                        ? 'Đang tạo mã hoá đơn...'
                        : autoInvoiceCode || 'Chưa tạo được mã hoá đơn'
                    }
                    disabled
                  />
                  {autoInvoiceCodeError && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6 }}>
                      <span className="error-message" style={{ marginTop: 0 }}>
                        {autoInvoiceCodeError}
                      </span>
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => {
                          if (autoInvoiceCodeLoading) return;
                          setAutoInvoiceCode('');
                          setAutoInvoiceCodeError('');
                          (async () => {
                            try {
                              setAutoInvoiceCodeLoading(true);
                              const res = await requestService.getNextRepairInvoiceCode();
                              const code = res?.data?.invoiceCode;
                              if (!code) throw new Error('Không thể tạo mã hóa đơn');
                              setAutoInvoiceCode(code);
                            } catch (err: any) {
                              console.error('Lỗi khi tạo mã hóa đơn:', err);
                              setAutoInvoiceCodeError(
                                err?.response?.data?.message ||
                                err?.message ||
                                'Không thể tạo mã hóa đơn',
                              );
                            } finally {
                              setAutoInvoiceCodeLoading(false);
                            }
                          })();
                        }}
                        disabled={autoInvoiceCodeLoading}
                      >
                        Thử lại
                      </button>
                    </div>
                  )}
                </div>
                <div className="complete-form-group">
                  <label htmlFor="invoice-title">Tiêu đề hóa đơn *</label>
                  <input
                    type="text"
                    id="invoice-title"
                    value={completeForm.invoiceTitle}
                    onChange={(e) => {
                      setCompleteForm({ ...completeForm, invoiceTitle: e.target.value });
                      if (formErrors.invoiceTitle) {
                        setFormErrors({ ...formErrors, invoiceTitle: '' });
                      }
                    }}
                    placeholder="Nhập tiêu đề hóa đơn"
                  />
                  {formErrors.invoiceTitle && (
                    <span className="error-message">{formErrors.invoiceTitle}</span>
                  )}
                </div>
                <div className="complete-form-group">
                  <label htmlFor="invoice-total">Tổng số tiền (VNĐ) *</label>
                  <input
                    type="number"
                    id="invoice-total"
                    value={completeForm.invoiceTotalAmount}
                    onChange={(e) => {
                      setCompleteForm({ ...completeForm, invoiceTotalAmount: e.target.value });
                      if (formErrors.invoiceTotalAmount) {
                        setFormErrors({ ...formErrors, invoiceTotalAmount: '' });
                      }
                    }}
                    placeholder="Nhập tổng số tiền"
                    min="0"
                    step="1000"
                    className={formErrors.invoiceTotalAmount ? 'input-error' : ''}
                  />
                  {formErrors.invoiceTotalAmount && (
                    <span className="error-message">{formErrors.invoiceTotalAmount}</span>
                  )}
                </div>
                <div className="complete-form-group">
                  <label>Ngày đến hạn</label>
                  <input
                    type="text"
                    value={(() => {
                      const now = new Date();
                      const target = new Date(now);
                      target.setDate(target.getDate() + 7);
                      const y = target.getFullYear();
                      const m = String(target.getMonth() + 1).padStart(2, '0');
                      const d = String(target.getDate()).padStart(2, '0');
                      return `${d}/${m}/${y} `;
                    })()}
                    disabled
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
                    disabled={
                      updatingId === completingRequest._id ||
                      !completeForm.invoiceTitle.trim() ||
                      !completeForm.invoiceTotalAmount ||
                      autoInvoiceCodeLoading ||
                      !!autoInvoiceCodeError ||
                      !autoInvoiceCode
                    }
                  >
                    {updatingId === completingRequest._id ? 'Đang xử lý...' : 'Hoàn thành'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal hoàn thành yêu cầu - tạo phiếu chi sửa chữa miễn phí */}
        {showFreeModal && completingRequest && (
          <div className="repair-modal-overlay" onClick={handleCloseFreeModal}>
            <div
              className="repair-modal repair-complete-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="repair-modal-header">
                <h2>Tạo phiếu chi sửa chữa miễn phí</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={handleCloseFreeModal}
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
                              const res = await requestService.getNextRepairPaymentVoucher();
                              const code = res?.data?.paymentVoucher;
                              if (!code) throw new Error('Không thể tạo mã phiếu chi');
                              setAutoPaymentVoucher(code);
                            } catch (err: any) {
                              console.error('Lỗi khi tạo mã phiếu chi:', err);
                              setAutoPaymentVoucherError(
                                err?.response?.data?.message ||
                                err?.message ||
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
                  <label htmlFor="financial-title">Tiêu đề phiếu chi *</label>
                  <input
                    type="text"
                    id="financial-title"
                    value={freeForm.financialTitle}
                    onChange={(e) => {
                      setFreeForm({ ...freeForm, financialTitle: e.target.value });
                      if (freeFormErrors.financialTitle) {
                        setFreeFormErrors({ ...freeFormErrors, financialTitle: '' });
                      }
                    }}
                    placeholder="Nhập tiêu đề phiếu chi"
                  />
                  {freeFormErrors.financialTitle && (
                    <span className="error-message">{freeFormErrors.financialTitle}</span>
                  )}
                </div>
                <div className="complete-form-group">
                  <label htmlFor="financial-amount">Tổng số tiền (VNĐ) *</label>
                  <input
                    type="number"
                    id="financial-amount"
                    value={freeForm.financialAmount}
                    onChange={(e) => {
                      setFreeForm({ ...freeForm, financialAmount: e.target.value });
                      if (freeFormErrors.financialAmount) {
                        setFreeFormErrors({ ...freeFormErrors, financialAmount: '' });
                      }
                    }}
                    placeholder="Nhập tổng số tiền"
                    min="0"
                    step="1000"
                    className={freeFormErrors.financialAmount ? 'input-error' : ''}
                  />
                  {freeFormErrors.financialAmount && (
                    <span className="error-message">{freeFormErrors.financialAmount}</span>
                  )}
                </div>
                <div className="complete-form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={handleCloseFreeModal}
                    disabled={updatingId === completingRequest._id}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn-submit"
                    onClick={handleFreeSubmit}
                    disabled={
                      updatingId === completingRequest._id ||
                      !freeForm.financialAmount ||
                      autoPaymentVoucherLoading ||
                      !!autoPaymentVoucherError ||
                      !autoPaymentVoucher
                    }
                  >
                    {updatingId === completingRequest._id ? 'Đang xử lý...' : 'Hoàn thành'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination đưa ra ngoài thẻ bảng để giống màn cư dân */}
      {!loading && !error && (
        <div className={`repair-pagination ${isManager ? 'repair-pagination--manager' : ''}`}>
          <div className="repair-pagination-info">
            <span>
              Tổng: <strong>{totalItems}</strong> bản ghi | Trang <strong>{currentPage}</strong>/
              {Math.max(totalPages, 1)}
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
              disabled={currentPage === 1 || loading}
              aria-label="Trang đầu"
            >
              «
            </button>
            <button
              type="button"
              className="pagination-arrow-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              aria-label="Trang trước"
            >
              ‹
            </button>

            {getVisiblePages().map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={pageNumber === currentPage ? 'pagination-current-page' : 'pagination-arrow-btn'}
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
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || totalPages === 0 || loading}
              aria-label="Trang sau"
            >
              ›
            </button>
            <button
              type="button"
              className="pagination-arrow-btn"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage >= totalPages || totalPages === 0 || loading}
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


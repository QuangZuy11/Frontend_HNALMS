  import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye,
  Filter, ArrowUpDown,
  Wrench,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  DollarSign,
  LayoutGrid,
  Search,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { AppModal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import { useToast } from '../../components/common/Toast';
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
  const { showToast } = useToast();
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
  const [showCompleteTypeModal, setShowCompleteTypeModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showFreeModal, setShowFreeModal] = useState(false);
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    request: RepairRequest;
    nextStatus: 'Pending' | 'Processing' | 'Done' | 'Unpaid';
  } | null>(null);
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
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'Pending' | 'Processing' | 'Unpaid' | 'Done' | 'Paid'
  >('ALL');
  const [roomSearch, setRoomSearch] = useState<string>('');
  const [tenantSearch, setTenantSearch] = useState<string>('');
  const [sortOption, setSortOption] = useState('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 11;
  const tableRef = useRef<HTMLDivElement | null>(null);

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
        setTotalPages(response.totalPages || 1);
      } else {
        setRequests([]);
        setTotalItems(0);
        setTotalPages(1);
      }
    } catch (err: unknown) {
      console.error('Lỗi khi tải danh sách yêu cầu sửa chữa:', err);
      const e = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi', e.response?.data?.message || 'Không thể tải danh sách yêu cầu sửa chữa.');
    } finally {
      setLoading(false);
    }
  }, [roomSearch, tenantSearch, currentPage, showToast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    setCurrentPage(1);
  }, [roomSearch, tenantSearch, statusFilter, sortOption]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const canTransitionStatus = (
    current: 'Pending' | 'Processing' | 'Done' | 'Unpaid' | 'Paid',
    target: 'Pending' | 'Processing' | 'Done' | 'Unpaid' | 'Paid',
  ) => {
    const order: Array<'Pending' | 'Processing' | 'Done' | 'Unpaid' | 'Paid'> = [
      'Pending', 'Processing', 'Done', 'Unpaid', 'Paid',
    ];
    const currentIndex = order.indexOf(current);
    const targetIndex = order.indexOf(target);
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

  const getStatusText = (status: 'Pending' | 'Processing' | 'Done' | 'Unpaid') => {
    if (status === 'Pending') return 'Chờ xử lý';
    if (status === 'Processing') return 'Đang xử lý';
    if (status === 'Unpaid') return 'Chờ thanh toán';
    return 'Đã xử lý';
  };

  const handleViewDetail = (request: RepairRequest) => {
    setSelectedRequest(request);
  };

  const handleCloseDetail = () => {
    setSelectedRequest(null);
  };

  const applyStatusUpdate = async (
    request: RepairRequest,
    nextStatus: 'Pending' | 'Processing' | 'Done' | 'Unpaid',
  ) => {
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
      showToast('success', 'Thành công', 'Cập nhật trạng thái thành công!');
    } catch (err: unknown) {
      console.error('Lỗi khi cập nhật trạng thái:', err);
      const e = err as { response?: { data?: { message?: string } } };
      showToast('error', 'Lỗi', e.response?.data?.message || 'Không thể cập nhật trạng thái.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateStatus = async (
    request: RepairRequest,
    nextStatus: 'Pending' | 'Processing' | 'Done' | 'Unpaid',
  ) => {
    if (nextStatus === 'Done') {
      setCompletingRequest(request);
      setShowCompleteTypeModal(true);
      return;
    }
    setPendingStatusChange({ request, nextStatus });
    setShowStatusConfirmModal(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!pendingStatusChange) return;
    const { request, nextStatus } = pendingStatusChange;
    setShowStatusConfirmModal(false);
    setPendingStatusChange(null);
    await applyStatusUpdate(request, nextStatus);
    setTimeout(() => { setSelectedRequest(null); }, 600);
  };

  const handleCloseStatusConfirmModal = () => {
    if (updatingId) return;
    setShowStatusConfirmModal(false);
    setPendingStatusChange(null);
  };

  const handleChoosePaidRepair = () => {
    if (!completingRequest) return;
    setShowCompleteTypeModal(false);
    setAutoInvoiceCode('');
    setAutoInvoiceCodeError('');
    setCompleteForm({ invoiceTitle: '', invoiceTotalAmount: '' });
    setFormErrors({ invoiceTitle: '', invoiceTotalAmount: '' });
    setShowCompleteModal(true);

    (async () => {
      try {
        setAutoInvoiceCodeLoading(true);
        const res = await requestService.getNextRepairInvoiceCode();
        const code = res?.data?.invoiceCode;
        if (!code) throw new Error('Không thể tạo mã hóa đơn');
        setAutoInvoiceCode(code);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        console.error('Lỗi khi tạo mã hóa đơn:', err);
        setAutoInvoiceCodeError(e.response?.data?.message || e.message || 'Không thể tạo mã hóa đơn');
      } finally {
        setAutoInvoiceCodeLoading(false);
      }
    })();
  };

  const handleChooseFreeRepair = () => {
    if (!completingRequest) return;
    setShowCompleteTypeModal(false);
    setFreeForm({ financialTitle: '', financialAmount: '' });
    setFreeFormErrors({ financialTitle: '', financialAmount: '' });
    setShowFreeModal(true);

    (async () => {
      try {
        setAutoPaymentVoucherLoading(true);
        setAutoPaymentVoucherError('');
        const res = await requestService.getNextRepairPaymentVoucher();
        const code = res?.data?.paymentVoucher;
        if (!code) throw new Error('Không thể tạo mã phiếu chi');
        setAutoPaymentVoucher(code);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        console.error('Lỗi khi tạo mã phiếu chi:', err);
        setAutoPaymentVoucherError(e.response?.data?.message || e.message || 'Không thể tạo mã phiếu chi');
      } finally {
        setAutoPaymentVoucherLoading(false);
      }
    })();
  };

  const handleCompleteSubmit = async () => {
    if (!completingRequest) return;
    const errors = { invoiceTitle: '', invoiceTotalAmount: '' };
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
    if (!isValid) return;

    const totalAmount = parseFloat(completeForm.invoiceTotalAmount);
    const toDateInputValue = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    const dueDate = (() => {
      const target = new Date();
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
        completingRequest._id, 'Done', totalAmount, undefined, {
          invoiceCode: invoiceCodeToUse,
          title: completeForm.invoiceTitle.trim(),
          totalAmount,
          dueDate,
        }, undefined, 'REVENUE'
      );
      const updated = response.data;

      if (updated?._id) {
        setRequests((prev) =>
          prev.map((r) => r._id === updated._id ? { ...r, status: updated.status, cost: updated.cost, paymentType: updated.paymentType ?? 'REVENUE' } : r),
        );
        if (selectedRequest && selectedRequest._id === updated._id) {
          setSelectedRequest((prev) => prev ? { ...prev, status: updated.status, cost: updated.cost, paymentType: updated.paymentType ?? 'REVENUE' } : prev);
        }
      }

      setShowCompleteModal(false);
      setCompletingRequest(null);
      setAutoInvoiceCode('');
      setAutoInvoiceCodeError('');
      setCompleteForm({ invoiceTitle: '', invoiceTotalAmount: '' });
      setFormErrors({ invoiceTitle: '', invoiceTotalAmount: '' });
      showToast('success', 'Thành công', 'Tạo yêu cầu sửa chữa có phí thành công!');
      setTimeout(() => { setSelectedRequest(null); }, 600);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      console.error('Lỗi khi hoàn thành yêu cầu:', err);
      showToast('error', 'Lỗi', e.response?.data?.message || 'Không thể hoàn thành yêu cầu.');
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
    setCompleteForm({ invoiceTitle: '', invoiceTotalAmount: '' });
    setFormErrors({ invoiceTitle: '', invoiceTotalAmount: '' });
  };

  const handleCloseFreeModal = () => {
    setShowFreeModal(false);
    setCompletingRequest(null);
    setFreeForm({ financialTitle: '', financialAmount: '' });
    setFreeFormErrors({ financialTitle: '', financialAmount: '' });
    setAutoPaymentVoucher('');
    setAutoPaymentVoucherError('');
    setAutoPaymentVoucherLoading(false);
  };

  const handleFreeSubmit = async () => {
    if (!completingRequest) return;
    const errors = { financialTitle: '', financialAmount: '' };
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
        completingRequest._id, 'Done', amountNumber, 'Sửa chữa miễn phí cho cư dân', undefined, {
          financialTitle: freeForm.financialTitle.trim(),
          financialAmount: amountNumber,
          paymentVoucher: autoPaymentVoucher,
        }, 'EXPENSE'
      );
      const updated = response.data;

      if (updated?._id) {
        setRequests((prev) =>
          prev.map((r) => r._id === updated._id ? { ...r, status: updated.status, cost: updated.cost, paymentType: updated.paymentType ?? 'EXPENSE' } : r),
        );
        if (selectedRequest && selectedRequest._id === updated._id) {
          setSelectedRequest((prev) => prev ? { ...prev, status: updated.status, cost: updated.cost, paymentType: updated.paymentType ?? 'EXPENSE' } : prev);
        }
      }

      setShowFreeModal(false);
      setCompletingRequest(null);
      setFreeForm({ financialTitle: '', financialAmount: '' });
      setFreeFormErrors({ financialTitle: '', financialAmount: '' });
      showToast('success', 'Thành công', 'Tạo yêu cầu sửa chữa miễn phí thành công!');
      setTimeout(() => { setSelectedRequest(null); }, 600);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      console.error('Lỗi khi hoàn thành yêu cầu (miễn phí):', err);
      showToast('error', 'Lỗi', e.response?.data?.message || 'Không thể hoàn thành yêu cầu.');
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

  // Stats
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'Pending').length;
  const paidCount = requests.filter((r) => r.status === 'Paid').length;

  const filteredRequests = useMemo(() => {
    let result = [...requests];
    result = statusFilter === 'ALL' ? result : result.filter((r) => r.status === statusFilter);
    if (sortOption === 'name-asc') {
      result.sort((a, b) => (a.tenantId?.fullname || '').localeCompare(b.tenantId?.fullname || ''));
    } else if (sortOption === 'name-desc') {
      result.sort((a, b) => (b.tenantId?.fullname || '').localeCompare(a.tenantId?.fullname || ''));
    }
    return result;
  }, [requests, statusFilter, sortOption]);

  const displayedRequests = filteredRequests;

  const hasFilters = roomSearch || tenantSearch || statusFilter !== 'ALL';

  const clearFilters = () => {
    setRoomSearch('');
    setTenantSearch('');
    setStatusFilter('ALL');
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Pending') return <Clock size={14} />;
    if (status === 'Processing') return <AlertCircle size={14} />;
    if (status === 'Paid') return <CheckCircle2 size={14} />;
    if (status === 'Unpaid') return <XCircle size={14} />;
    return <CheckCircle2 size={14} />;
  };

  return (
    <div className="repair-container">

      {/* HEADER */}
      <div className="repair-header">
        <div className="repair-header-top">
          <div className="repair-title-block">
            <div className="repair-title-row">
              <div className="repair-title-icon" aria-hidden>
                <Wrench size={22} strokeWidth={2} />
              </div>
              <div className="repair-title-text">
                <h2>Quản lý Yêu cầu Sửa chữa</h2>
                <p className="repair-subtitle">
                  Các yêu cầu sửa chữa/bảo trì do cư dân gửi lên tòa nhà Hoàng Nam.
                </p>
              </div>
            </div>
          </div>

          <div className="repair-header-aside">
            <div className="repair-stats-summary">
              <div className="repair-stat-item">
                <div className="repair-stat-icon icon-primary">
                  <Wrench size={16} strokeWidth={2} />
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
                  <span className="repair-stat-value">{paidCount}</span>
                  <span className="repair-stat-label">Đã thanh toán</span>
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
              onChange={(e) => setTenantSearch(e.target.value)}
            />
          </div>

          <div className="search-box">
            <LayoutGrid size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm theo số phòng..."
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
            />
          </div>

          <div className="control-group">
            <Filter size={16} className="repair-toolbar-icon" aria-hidden />
            <select
              className="custom-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Pending">Chờ xử lý</option>
              <option value="Processing">Đang xử lý</option>
              <option value="Done">Đã xử lý</option>
              <option value="Unpaid">Chờ thanh toán</option>
              <option value="Paid">Đã thanh toán</option>
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

      {/* BẢNG DỮ LIỆU */}
      <div className="repair-table-container" ref={tableRef}>
        <table className="repair-table">
          <thead>
            <tr>
              <th className="cell-stt">STT</th>
              <th className="cell-tenant">Cư dân</th>
              <th className="cell-room">Phòng</th>
              <th className="cell-device">Thiết bị</th>
              <th className="cell-status">Trạng thái</th>
              <th className="cell-cost">Chi phí (VNĐ)</th>
              <th className="cell-payer">Người thanh toán</th>
              <th className="cell-date">Ngày tạo</th>
              <th className="cell-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {displayedRequests.length > 0 ? (
              displayedRequests.map((r, index) => (
                <tr key={r._id}>
                  <td className="cell-stt">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>

                  <td className="cell-tenant">
                    {r.tenantId?.fullname || r.tenantId?.username || '-'}
                  </td>

                  <td className="cell-room">
                    <span className="room-badge">{r.room?.name || r.room?.roomCode || '-'}</span>
                  </td>

                  <td className="cell-device">
                    {r.devicesId?.name || '-'}
                  </td>

                  <td className="cell-status">
                    <span className={`status-badge status-${r.status.toLowerCase()}`}>
                      {getStatusIcon(r.status)}
                      {getStatusLabel(r)}
                    </span>
                  </td>

                  <td className="cell-cost">
                    {r.cost?.toLocaleString('vi-VN') || 0}
                  </td>

                  <td className="cell-payer">
                    {r.paymentType === 'REVENUE'
                      ? 'Cư dân'
                      : r.paymentType === 'EXPENSE'
                        ? 'Kế toán'
                        : '-'}
                  </td>

                  <td className="cell-date">
                    {formatDate(r.createdDate)}
                  </td>

                  <td className="cell-actions">
                    <div className="table-actions">
                      <button
                        className="btn-icon btn-view"
                        onClick={() => handleViewDetail(r)}
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
                <td colSpan={9} className="table-empty-cell">
                  {loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy yêu cầu nào phù hợp.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={handlePageChange}
        />
      </div>

      {/* ==================================================================
          CÁC MODAL
          ================================================================== */}

      {/* 1. Modal Chi tiết */}
      <AppModal
        open={!!selectedRequest}
        onClose={handleCloseDetail}
        title="Chi tiết yêu cầu sửa chữa"
        icon={<Wrench size={18} />}
        color="blue"
        size="md"
        footer={
          <button type="button" className="ms-btn ms-btn--ghost" onClick={handleCloseDetail}>
            Đóng
          </button>
        }
      >
        {selectedRequest && (
          <div className="rr-detail-body">
            {/* Profile strip */}
            <div className="rr-profile-strip">
              <div className="rr-avatar">
                {(selectedRequest.tenantId?.fullname || selectedRequest.tenantId?.username || '?').charAt(0).toUpperCase()}
              </div>
              <div className="rr-profile-info">
                <div className="rr-profile-name">
                  {selectedRequest.tenantId?.fullname || selectedRequest.tenantId?.username || '-'}
                </div>
                <div className="rr-profile-meta">
                  <span className="rr-meta-tag">{selectedRequest.room?.name || selectedRequest.room?.roomCode || '-'}</span>
                  <span className={`rr-status-tag rr-status-${selectedRequest.status.toLowerCase()}`}>
                    {getStatusIcon(selectedRequest.status)}
                    {getStatusLabel(selectedRequest)}
                  </span>
                </div>
              </div>
            </div>

            {/* Info grid */}
            <div className="rr-two-col">
              <div className="rr-col-left">
                <div className="rr-section">
                  <div className="rr-section-title">
                    <Wrench size={15} />
                    Thông tin cơ bản
                  </div>
                  <div className="rr-rows">
                    <div className="rr-row">
                      <span className="rr-label">Thiết bị</span>
                      <span className="rr-value">{selectedRequest.devicesId?.name || '-'}</span>
                    </div>
                    <div className="rr-row">
                      <span className="rr-label">Chi phí</span>
                      <span className="rr-value rr-value--amount">
                        {selectedRequest.cost?.toLocaleString('vi-VN') || 0} VNĐ
                      </span>
                    </div>
                    <div className="rr-row">
                      <span className="rr-label">Ngày tạo</span>
                      <span className="rr-value">{formatDate(selectedRequest.createdDate)}</span>
                    </div>
                    <div className="rr-row">
                      <span className="rr-label">Người thanh toán</span>
                      <span className="rr-value">
                        {selectedRequest.paymentType === 'REVENUE'
                          ? 'Cư dân'
                          : selectedRequest.paymentType === 'EXPENSE'
                            ? 'Kế toán'
                            : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rr-section">
                  <div className="rr-section-title">
                    <ImageIcon size={15} />
                    Hình ảnh ({selectedRequest.images?.length || 0})
                  </div>
                  {selectedRequest.images && selectedRequest.images.length > 0 ? (
                    <div className="rr-images-grid">
                      {selectedRequest.images.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="rr-image-btn"
                          onClick={() => handleOpenImagePreview(url)}
                        >
                          <img src={url} alt={`Ảnh ${idx + 1}`} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rr-images-empty">Chưa có hình ảnh.</div>
                  )}
                </div>
              </div>

              <div className="rr-col-right">
                <div className="rr-section">
                  <div className="rr-section-title">
                    <AlertCircle size={15} />
                    Mô tả
                  </div>
                  <p className="rr-description">{selectedRequest.description || 'Không có mô tả.'}</p>
                </div>

                {/* Status update controls */}
                <div className="rr-section">
                  <div className="rr-section-title">
                    <Clock size={15} />
                    Cập nhật trạng thái
                  </div>
                  <div className="rr-status-row">
                    <select
                      className="rr-status-select"
                      value={selectedRequest.status}
                      onChange={(e) =>
                        handleUpdateStatus(
                          selectedRequest,
                          e.target.value as 'Pending' | 'Processing' | 'Done' | 'Unpaid',
                        )
                      }
                      disabled={
                        updatingId === selectedRequest._id ||
                        selectedRequest.status === 'Done' ||
                        selectedRequest.status === 'Unpaid' ||
                        selectedRequest.status === 'Paid'
                      }
                    >
                      <option value="Pending" disabled={!canTransitionStatus(selectedRequest.status as 'Pending' | 'Processing' | 'Done' | 'Unpaid' | 'Paid', 'Pending')}>Chờ xử lý</option>
                      <option value="Processing" disabled={!canTransitionStatus(selectedRequest.status as 'Pending' | 'Processing' | 'Done' | 'Unpaid' | 'Paid', 'Processing')}>Đang xử lý</option>
                      <option value="Done" disabled={!canTransitionStatus(selectedRequest.status as 'Pending' | 'Processing' | 'Done' | 'Unpaid' | 'Paid', 'Done')}>Đã xử lý</option>
                      <option value="Unpaid" disabled>Chờ thanh toán</option>
                    </select>
                    {updatingId === selectedRequest._id && (
                      <span className="rr-updating-text">Đang cập nhật...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppModal>

      {/* 2. Modal Xem ảnh */}
      <AppModal
        open={!!previewImageUrl}
        onClose={handleCloseImagePreview}
        size="md"
        hideClose
      >
        <div className="rr-image-fullscreen">
          <img src={previewImageUrl || ''} alt="Ảnh yêu cầu" />
        </div>
      </AppModal>

      {/* 3. Modal Xác nhận chuyển trạng thái */}
      <AppModal
        open={showStatusConfirmModal}
        onClose={handleCloseStatusConfirmModal}
        title="Xác nhận chuyển trạng thái"
        icon={<AlertCircle size={18} />}
        color="orange"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="ms-btn ms-btn--ghost"
              onClick={handleCloseStatusConfirmModal}
              disabled={!!updatingId}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              className="ms-btn ms-btn--primary"
              onClick={handleConfirmStatusChange}
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
            Bạn có chắc muốn chuyển yêu cầu này sang trạng thái{' '}
            <strong>{pendingStatusChange ? getStatusText(pendingStatusChange.nextStatus) : ''}</strong>?
          </p>
        </div>
      </AppModal>

      {/* 4. Modal Chọn loại sửa chữa */}
      <AppModal
        open={showCompleteTypeModal}
        onClose={() => setShowCompleteTypeModal(false)}
        title="Chọn hình thức xử lý"
        icon={<Wrench size={18} />}
        color="blue"
        size="sm"
        footer={
          <button
            type="button"
            className="ms-btn ms-btn--ghost"
            onClick={() => setShowCompleteTypeModal(false)}
          >
            Hủy bỏ
          </button>
        }
      >
        <div className="rr-complete-type-body">
          <p className="rr-complete-type-desc">
            Vui lòng chọn hình thức xử lý cho yêu cầu sửa chữa này:
          </p>
          <div className="rr-complete-type-actions">
            <button
              type="button"
              className="ms-btn ms-btn--primary"
              onClick={handleChoosePaidRepair}
              disabled={updatingId === completingRequest?._id}
            >
              <DollarSign size={16} />
              Sửa chữa có phí (tạo hóa đơn)
            </button>
            <button
              type="button"
              className="ms-btn ms-btn--ghost"
              onClick={handleChooseFreeRepair}
              disabled={updatingId === completingRequest?._id}
            >
              <CheckCircle2 size={16} />
              Sửa chữa miễn phí (tạo phiếu chi)
            </button>
          </div>
        </div>
      </AppModal>

      {/* 5. Modal Tạo hóa đơn sửa chữa */}
      <AppModal
        open={showCompleteModal}
        onClose={handleCloseCompleteModal}
        title="Tạo hóa đơn sửa chữa"
        icon={<DollarSign size={18} />}
        color="blue"
        size="md"
        footer={
          <>
            <button type="button" className="ms-btn ms-btn--ghost" onClick={handleCloseCompleteModal}>
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="rr-complete-form"
              className="ms-btn ms-btn--primary"
              disabled={
                updatingId === completingRequest?._id ||
                !completeForm.invoiceTitle.trim() ||
                !completeForm.invoiceTotalAmount ||
                autoInvoiceCodeLoading ||
                !!autoInvoiceCodeError ||
                !autoInvoiceCode
              }
            >
              <CheckCircle2 size={16} />
              {updatingId === completingRequest?._id ? 'Đang xử lý...' : 'Hoàn thành'}
            </button>
          </>
        }
      >
        <form id="rr-complete-form" onSubmit={(e) => { e.preventDefault(); handleCompleteSubmit(); }}>
          <div className="ms-field">
            <label className="ms-label">Mã hóa đơn</label>
            <div className="ms-input-wrap">
              <input
                type="text"
                className="ms-input"
                value={
                  autoInvoiceCodeLoading
                    ? 'Đang tạo mã hoá đơn...'
                    : autoInvoiceCode || 'Chưa tạo được mã hoá đơn'
                }
                readOnly
              />
            </div>
            {autoInvoiceCodeError && (
              <div className="rr-retry-row">
                <span className="ms-error-text">{autoInvoiceCodeError}</span>
                <button
                  type="button"
                  className="ms-btn ms-btn--ghost"
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
                      } catch (err: unknown) {
                        const e = err as { response?: { data?: { message?: string } }; message?: string };
                        setAutoInvoiceCodeError(e.response?.data?.message || e.message || 'Không thể tạo mã hóa đơn');
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

          <div className="ms-field">
            <label className="ms-label">Tiêu đề hóa đơn <span className="ms-label-required">*</span></label>
            <div className="ms-input-wrap">
              <input
                type="text"
                className={`ms-input ${formErrors.invoiceTitle ? 'ms-input--error' : ''}`}
                placeholder="Nhập tiêu đề hóa đơn"
                value={completeForm.invoiceTitle}
                onChange={(e) => {
                  setCompleteForm({ ...completeForm, invoiceTitle: e.target.value });
                  if (formErrors.invoiceTitle) setFormErrors({ ...formErrors, invoiceTitle: '' });
                }}
              />
            </div>
            {formErrors.invoiceTitle && (
              <span className="ms-error-text">{formErrors.invoiceTitle}</span>
            )}
          </div>

          <div className="ms-field-row">
            <div className="ms-field">
              <label className="ms-label">Tổng số tiền (VNĐ) <span className="ms-label-required">*</span></label>
              <div className="ms-input-wrap ms-input-wrap--prefix">
                <span className="ms-input-prefix">₫</span>
                <input
                  type="number"
                  className={`ms-input ms-input--prefix ${formErrors.invoiceTotalAmount ? 'ms-input--error' : ''}`}
                  placeholder="0"
                  value={completeForm.invoiceTotalAmount}
                  onChange={(e) => {
                    setCompleteForm({ ...completeForm, invoiceTotalAmount: e.target.value });
                    if (formErrors.invoiceTotalAmount) setFormErrors({ ...formErrors, invoiceTotalAmount: '' });
                  }}
                  min="0"
                  step="1000"
                />
              </div>
              {formErrors.invoiceTotalAmount && (
                <span className="ms-error-text">{formErrors.invoiceTotalAmount}</span>
              )}
            </div>

            <div className="ms-field">
              <label className="ms-label">Ngày đến hạn</label>
              <div className="ms-input-wrap">
                <input
                  type="text"
                  className="ms-input"
                  value={((): string => {
                    const now = new Date();
                    now.setDate(now.getDate() + 7);
                    const y = now.getFullYear();
                    const m = String(now.getMonth() + 1).padStart(2, '0');
                    const d = String(now.getDate()).padStart(2, '0');
                    return `${d}/${m}/${y}`;
                  })()}
                  readOnly
                />
              </div>
            </div>
          </div>
        </form>
      </AppModal>

      {/* 6. Modal Tạo phiếu chi sửa chữa miễn phí */}
      <AppModal
        open={showFreeModal}
        onClose={handleCloseFreeModal}
        title="Tạo phiếu chi sửa chữa miễn phí"
        icon={<CheckCircle2 size={18} />}
        color="green"
        size="md"
        footer={
          <>
            <button type="button" className="ms-btn ms-btn--ghost" onClick={handleCloseFreeModal}>
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="rr-free-form"
              className="ms-btn ms-btn--primary"
              disabled={
                updatingId === completingRequest?._id ||
                !freeForm.financialAmount ||
                autoPaymentVoucherLoading ||
                !!autoPaymentVoucherError ||
                !autoPaymentVoucher
              }
            >
              <CheckCircle2 size={16} />
              {updatingId === completingRequest?._id ? 'Đang xử lý...' : 'Hoàn thành'}
            </button>
          </>
        }
      >
        <form id="rr-free-form" onSubmit={(e) => { e.preventDefault(); handleFreeSubmit(); }}>
          <div className="ms-field">
            <label className="ms-label">Mã phiếu chi</label>
            <div className="ms-input-wrap">
              <input
                type="text"
                className="ms-input"
                value={
                  autoPaymentVoucherLoading
                    ? 'Đang tạo mã phiếu chi...'
                    : autoPaymentVoucher || 'Chưa tạo được mã phiếu chi'
                }
                readOnly
              />
            </div>
            {autoPaymentVoucherError && (
              <div className="rr-retry-row">
                <span className="ms-error-text">{autoPaymentVoucherError}</span>
                <button
                  type="button"
                  className="ms-btn ms-btn--ghost"
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
                      } catch (err: unknown) {
                        const e = err as { response?: { data?: { message?: string } }; message?: string };
                        setAutoPaymentVoucherError(e.response?.data?.message || e.message || 'Không thể tạo mã phiếu chi');
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

          <div className="ms-field">
            <label className="ms-label">Tiêu đề phiếu chi <span className="ms-label-required">*</span></label>
            <div className="ms-input-wrap">
              <input
                type="text"
                className={`ms-input ${freeFormErrors.financialTitle ? 'ms-input--error' : ''}`}
                placeholder="Nhập tiêu đề phiếu chi"
                value={freeForm.financialTitle}
                onChange={(e) => {
                  setFreeForm({ ...freeForm, financialTitle: e.target.value });
                  if (freeFormErrors.financialTitle) setFreeFormErrors({ ...freeFormErrors, financialTitle: '' });
                }}
              />
            </div>
            {freeFormErrors.financialTitle && (
              <span className="ms-error-text">{freeFormErrors.financialTitle}</span>
            )}
          </div>

          <div className="ms-field">
            <label className="ms-label">Tổng số tiền (VNĐ) <span className="ms-label-required">*</span></label>
            <div className="ms-input-wrap ms-input-wrap--prefix">
              <span className="ms-input-prefix">₫</span>
              <input
                type="number"
                className={`ms-input ms-input--prefix ${freeFormErrors.financialAmount ? 'ms-input--error' : ''}`}
                placeholder="0"
                value={freeForm.financialAmount}
                onChange={(e) => {
                  setFreeForm({ ...freeForm, financialAmount: e.target.value });
                  if (freeFormErrors.financialAmount) setFreeFormErrors({ ...freeFormErrors, financialAmount: '' });
                }}
                min="0"
                step="1000"
              />
            </div>
            {freeFormErrors.financialAmount && (
              <span className="ms-error-text">{freeFormErrors.financialAmount}</span>
            )}
          </div>
        </form>
      </AppModal>
    </div>
  );
}

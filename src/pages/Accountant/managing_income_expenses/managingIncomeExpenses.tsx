import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  Plus,
  TrendingDown,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  Filter,
  ArrowUpDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cashFlowService } from "../../../services/cashFlowService";
import { useToast } from "../../../components/common/Toast";
import "./managingIncomeExpenses.css";

interface Room {
  _id: string;
  name: string;
  roomCode?: string;
}

interface FinancialTicket {
  _id: string;
  type: "Receipt" | "Payment" | string;
  amount: number;
  title: string;
  referenceId?: string | { _id: string; tenantId?: string } | null;
  status: string;
  transactionDate: string;
  createdAt?: string;
  accountantPaidAt?: string;
  paymentVoucher?: string | null;
  rejectionReason?: string | null;
  room?: Room | null;
}

type UiPaymentStatus = "pending" | "approved" | "paid" | "rejected";

export default function ManagingIncomeExpenses() {
  const { showToast } = useToast();

  const [tickets, setTickets] = useState<FinancialTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "paid" | "rejected"
  >("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 11;
  const [selectedTicket, setSelectedTicket] = useState<FinancialTicket | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [autoVoucherCode, setAutoVoucherCode] = useState<string>("");
  const [autoVoucherLoading, setAutoVoucherLoading] = useState<boolean>(false);
  const [autoVoucherError, setAutoVoucherError] = useState<string>("");
  const [createForm, setCreateForm] = useState<{ title: string; amount: string }>({
    title: "",
    amount: "",
  });
  const [createErrors, setCreateErrors] = useState<{ title: string; amount: string }>({
    title: "",
    amount: "",
  });
  const [formError, setFormError] = useState<string>("");

  // Khoá scroll
  useEffect(() => {
    const main = document.querySelector(".dashboard-layout-main") as HTMLElement;
    if (main) main.style.overflowY = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      if (main) main.style.overflowY = "";
      document.body.style.overflow = "";
    };
  }, []);

  const fetchTickets = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const params: { from?: string; to?: string } = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      type ApiResponse = {
        success: boolean;
        data: FinancialTicket[];
        message?: string;
      };

      const response: ApiResponse = await cashFlowService.getPaymentTickets(params);

      if (response.success && Array.isArray(response.data)) {
        setTickets(response.data);
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách phiếu chi:", err);
      let msg = "Không thể tải danh sách phiếu chi";
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
      ) {
        msg = (err as { response?: { data?: { message?: string } } }).response!.data!
          .message as string;
      }
      showToast("error", "Lỗi kết nối", msg);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const resetCreateForm = () => {
    setCreateForm({ title: "", amount: "" });
    setCreateErrors({ title: "", amount: "" });
    setAutoVoucherCode("");
    setAutoVoucherError("");
    setAutoVoucherLoading(false);
    setFormError("");
  };

  const openCreateModal = async () => {
    setShowCreateModal(true);
    resetCreateForm();
    try {
      setAutoVoucherLoading(true);
      const res = await cashFlowService.getNextPaymentVoucher();
      const code = res?.data?.paymentVoucher;
      if (!code) throw new Error("Không thể tạo mã phiếu chi");
      setAutoVoucherCode(code);
    } catch (err) {
      console.error("Lỗi khi tạo mã phiếu chi:", err);
      setAutoVoucherError("Không thể tạo mã phiếu chi");
    } finally {
      setAutoVoucherLoading(false);
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    resetCreateForm();
  };

  const handleCreateTicket = async () => {
    const errors = { title: "", amount: "" };
    let isValid = true;

    if (!createForm.title.trim()) {
      errors.title = "Vui lòng nhập tiêu đề";
      isValid = false;
    }
    if (!createForm.amount.trim()) {
      errors.amount = "Vui lòng nhập số tiền";
      isValid = false;
    } else {
      const amountNumber = Number(createForm.amount);
      if (!Number.isFinite(amountNumber) || amountNumber < 1000) {
        errors.amount = "Số tiền phải lớn hơn hoặc bằng 1.000 VNĐ";
        isValid = false;
      }
    }

    setCreateErrors(errors);
    if (!isValid) {
      setFormError(errors.title || errors.amount);
      return;
    }
    setFormError("");

    try {
      setCreating(true);
      const response = await cashFlowService.createManualPaymentTicket({
        title: createForm.title.trim(),
        amount: Number(createForm.amount),
      });
      if (response?.success && response?.data?._id) {
        setTickets((prev) => [response.data, ...prev]);
        setCurrentPage(1);
        closeCreateModal();
        showToast("success", "Thành công", "Tạo phiếu chi thành công!");
      }
    } catch (err) {
      console.error("Lỗi khi tạo phiếu chi:", err);
      showToast("error", "Lỗi", "Không thể tạo phiếu chi. Vui lòng thử lại!");
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmPaid = async (ticket: FinancialTicket) => {
    try {
      setCreating(true);
      const res = await cashFlowService.updatePaymentTicketStatus(
        ticket._id,
        "Paid",
        ticket.paymentVoucher || undefined,
      );
      if (res?.success && res?.data?._id) {
        setTickets((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)));
        setSelectedTicket((prev) => (prev?._id === res.data._id ? res.data : prev));
        showToast("success", "Thành công", "Xác nhận đã chi tiền thành công!");
      }
    } catch (err) {
      console.error("Lỗi khi xác nhận đã thanh toán:", err);
      showToast("error", "Lỗi", "Không thể cập nhật trạng thái phiếu chi!");
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (typeof value !== "number") return "0 ₫";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const toUiStatus = (status?: string): UiPaymentStatus => {
    const s = (status || "").toLowerCase();
    if (s === "paid" || s.includes("đã thanh toán") || s.includes("da thanh toan"))
      return "paid";
    if (s === "approved" || s.includes("đã duyệt") || s.includes("da duyet"))
      return "approved";
    if (s === "rejected" || s.includes("từ chối") || s.includes("tu choi"))
      return "rejected";
    return "pending";
  };

  const statusLabel = (status?: string) => {
    const ui = toUiStatus(status);
    if (ui === "paid") return "Đã thanh toán";
    if (ui === "approved") return "Đã duyệt";
    if (ui === "rejected") return "Từ chối";
    return "Chờ duyệt";
  };

  const statusIcon = (status?: string) => {
    const ui = toUiStatus(status);
    if (ui === "paid") return <CheckCircle2 size={12} />;
    if (ui === "approved") return <CheckCircle2 size={12} />;
    if (ui === "rejected") return <XCircle size={12} />;
    return <Clock size={12} />;
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === "all") return true;
    const ui = toUiStatus(t.status);
    return ui === statusFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize) || 1);
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + pageSize);

  // Stats
  const totalCount = tickets.length;
  const pendingCount = tickets.filter((t) => toUiStatus(t.status) === "pending").length;
  const approvedCount = tickets.filter((t) => toUiStatus(t.status) === "approved").length;
  const paidCount = tickets.filter((t) => toUiStatus(t.status) === "paid").length;

  // Pagination numbers
  const buildPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [];
    pages.push(1);
    if (safePage > 3) pages.push("...");
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
      pages.push(i);
    }
    if (safePage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="pchi-container">
      {/* ─── HEADER ─────────────────────────────── */}
      <div className="pchi-header">
        <div className="pchi-header-top">
          {/* Title block */}
          <div className="pchi-title-block">
            <div className="pchi-title-row">
              <div className="pchi-title-icon" aria-hidden>
                <TrendingDown size={22} strokeWidth={2} />
              </div>
              <div className="pchi-title-text">
                <h2>Quản lý Phiếu Chi</h2>
                <p className="pchi-subtitle">
                  Tạo và theo dõi tất cả các phiếu chi của tòa nhà Hoàng Nam.
                </p>
              </div>
            </div>
          </div>

          {/* Stats + Add button */}
          <div className="pchi-header-aside">
            <div className="pchi-stats-summary">
              <div className="pchi-stat-item">
                <div className="pchi-stat-icon pchi-icon-total">
                  <FileText size={16} />
                </div>
                <div className="pchi-stat-text">
                  <span className="pchi-stat-value">{totalCount}</span>
                  <span className="pchi-stat-label">Tổng số</span>
                </div>
              </div>
              <div className="pchi-stat-divider" />
              <div className="pchi-stat-item">
                <div className="pchi-stat-icon pchi-icon-pending">
                  <Clock size={16} />
                </div>
                <div className="pchi-stat-text">
                  <span className="pchi-stat-value">{pendingCount}</span>
                  <span className="pchi-stat-label">Chờ duyệt</span>
                </div>
              </div>
              <div className="pchi-stat-divider" />
              <div className="pchi-stat-item">
                <div className="pchi-stat-icon pchi-icon-approved">
                  <Banknote size={16} />
                </div>
                <div className="pchi-stat-text">
                  <span className="pchi-stat-value">{approvedCount}</span>
                  <span className="pchi-stat-label">Đã duyệt</span>
                </div>
              </div>
              <div className="pchi-stat-divider" />
              <div className="pchi-stat-item">
                <div className="pchi-stat-icon pchi-icon-paid">
                  <CheckCircle2 size={16} />
                </div>
                <div className="pchi-stat-text">
                  <span className="pchi-stat-value">{paidCount}</span>
                  <span className="pchi-stat-label">Đã chi</span>
                </div>
              </div>
            </div>

            <button type="button" className="pchi-add-btn" onClick={openCreateModal}>
              <Plus size={18} /> Tạo phiếu chi
            </button>
          </div>
        </div>
      </div>

      {/* ─── TOOLBAR ────────────────────────────── */}
      <div className="pchi-toolbar">
        <div className="pchi-toolbar-left">
          {/* Từ ngày */}
          <div className="pchi-control-group">
            <CalendarDays size={16} className="pchi-toolbar-icon" aria-hidden />
            <span className="pchi-control-label">Từ ngày:</span>
            <input
              id="pchi-from-date"
              type="date"
              className="pchi-date-input"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Đến ngày */}
          <div className="pchi-control-group">
            <span className="pchi-control-label">Đến ngày:</span>
            <input
              id="pchi-to-date"
              type="date"
              className="pchi-date-input"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Lọc trạng thái */}
          <div className="pchi-control-group">
            <Filter size={16} className="pchi-toolbar-icon" aria-hidden />
            <select
              id="pchi-status-filter"
              className="pchi-custom-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(
                  e.target.value as "all" | "pending" | "approved" | "paid" | "rejected",
                );
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="paid">Đã thanh toán</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>
        </div>

        <div className="pchi-toolbar-right">
          <ArrowUpDown size={16} className="pchi-toolbar-icon" aria-hidden />
          <span className="pchi-control-label">Mới nhất</span>
        </div>
      </div>

      {/* ─── ERROR BANNER ───────────────────────── */}
      {error && <div className="pchi-error-banner">{error}</div>}

      {/* ─── TABLE ─────────────────────────────── */}
      <div className="pchi-table-container">
        <table className="pchi-table">
          <thead>
            <tr>
              <th className="pchi-cell-stt">STT</th>
              <th className="pchi-cell-code">Mã phiếu</th>
              <th className="pchi-cell-title">Tiêu đề</th>
              <th className="pchi-cell-amount">Số tiền (VNĐ)</th>
              <th className="pchi-cell-status">Trạng thái</th>
              <th className="pchi-cell-date">Ngày tạo</th>
              <th className="pchi-cell-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="pchi-loading-cell">
                  <div className="pchi-loading-inner">
                    <div className="pchi-spinner" />
                    <p className="pchi-empty-text">Đang tải dữ liệu...</p>
                  </div>
                </td>
              </tr>
            ) : !error && filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={7} className="pchi-table-empty-cell">
                  <div className="pchi-empty-inner">
                    <div className="pchi-empty-icon">
                      <TrendingDown size={28} />
                    </div>
                    <p className="pchi-empty-text">Chưa có phiếu chi nào.</p>
                    <p className="pchi-empty-sub">
                      Thử thay đổi bộ lọc hoặc tạo phiếu chi mới.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTickets.map((t, index) => (
                <tr key={t._id}>
                  <td className="pchi-cell-stt">{startIndex + index + 1}</td>
                  <td className="pchi-cell-code">
                    <span className="pchi-code-badge">{t.paymentVoucher || "—"}</span>
                  </td>
                  <td className="pchi-cell-title">{t.title}</td>
                  <td className="pchi-cell-amount">{formatCurrency(t.amount)}</td>
                  <td className="pchi-cell-status">
                    <span className={`pchi-status-badge ${toUiStatus(t.status)}`}>
                      {statusIcon(t.status)}
                      {statusLabel(t.status)}
                    </span>
                  </td>
                  <td className="pchi-cell-date">
                    {formatDate(t.createdAt || t.transactionDate)}
                  </td>
                  <td className="pchi-cell-actions">
                    <div className="pchi-table-actions">
                      <button
                        type="button"
                        className="pchi-btn-icon pchi-btn-view"
                        title="Xem chi tiết"
                        onClick={() => setSelectedTicket(t)}
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ─── PAGINATION ──────────────────────── */}
        {!loading && !error && filteredTickets.length > 0 && (
          <div className="pchi-pagination">
            <div className="pchi-pagination-info">
              Tổng: <strong>{filteredTickets.length}</strong> phiếu chi &nbsp;|&nbsp; Trang{" "}
              <strong>{safePage}</strong>/{totalPages}
            </div>
            <div className="pchi-pagination-controls">
              <button
                type="button"
                className="pchi-page-btn"
                disabled={safePage === 1}
                onClick={() => setCurrentPage(1)}
                title="Trang đầu"
              >
                «
              </button>
              <button
                type="button"
                className="pchi-page-btn"
                disabled={safePage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="Trang trước"
              >
                <ChevronLeft size={14} />
              </button>

              {buildPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} style={{ padding: "0 4px", color: "#94a3b8" }}>
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    className={`pchi-page-btn${safePage === p ? " active" : ""}`}
                    onClick={() => setCurrentPage(p as number)}
                    aria-current={safePage === p ? "page" : undefined}
                  >
                    {p}
                  </button>
                ),
              )}

              <button
                type="button"
                className="pchi-page-btn"
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="Trang sau"
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                className="pchi-page-btn"
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                title="Trang cuối"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── CREATE MODAL ──────────────────────── */}
      {showCreateModal && (
        <div className="pchi-modal-overlay" onClick={closeCreateModal}>
          <div className="pchi-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="pchi-modal-header">
              <div className="pchi-modal-header-left">
                <div className="pchi-modal-icon pchi-modal-icon--create">
                  <Plus size={20} />
                </div>
                <div>
                  <p className="pchi-modal-title">Tạo phiếu chi</p>
                  <p className="pchi-modal-subtitle-text">Nhập thông tin phiếu chi mới</p>
                </div>
              </div>
              <button
                type="button"
                className="pchi-modal-close"
                onClick={closeCreateModal}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="pchi-modal-body">
              {formError && <div className="pchi-form-error-banner">{formError}</div>}

              {/* Mã phiếu (auto) */}
              <div className="pchi-field">
                <label className="pchi-label">Mã phiếu (tự động)</label>
                <input
                  type="text"
                  className="pchi-input"
                  value={
                    autoVoucherLoading
                      ? "Đang tạo mã phiếu..."
                      : autoVoucherCode || "Chưa tạo được mã phiếu"
                  }
                  disabled
                />
                {autoVoucherError && (
                  <span className="pchi-field-error">{autoVoucherError}</span>
                )}
              </div>

              {/* Tiêu đề */}
              <div className="pchi-field">
                <label className="pchi-label">
                  Tiêu đề <span className="pchi-label-required">*</span>
                </label>
                <input
                  type="text"
                  className="pchi-input"
                  value={createForm.title}
                  onChange={(e) => {
                    setCreateForm((prev) => ({ ...prev, title: e.target.value }));
                    if (createErrors.title) setCreateErrors((prev) => ({ ...prev, title: "" }));
                  }}
                  placeholder="Nhập tiêu đề phiếu chi"
                />
                {createErrors.title && (
                  <span className="pchi-field-error">{createErrors.title}</span>
                )}
              </div>

              {/* Số tiền */}
              <div className="pchi-field">
                <label className="pchi-label">
                  Số tiền (VNĐ) <span className="pchi-label-required">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  className="pchi-input"
                  value={createForm.amount}
                  onChange={(e) => {
                    setCreateForm((prev) => ({ ...prev, amount: e.target.value }));
                    if (createErrors.amount)
                      setCreateErrors((prev) => ({ ...prev, amount: "" }));
                  }}
                  placeholder="Nhập số tiền (tối thiểu 1.000 VNĐ)"
                />
                {createErrors.amount && (
                  <span className="pchi-field-error">{createErrors.amount}</span>
                )}
              </div>

              {/* Ngày tạo */}
              <div className="pchi-field">
                <label className="pchi-label">Ngày tạo</label>
                <input
                  type="text"
                  className="pchi-input"
                  value={formatDate(new Date().toISOString())}
                  disabled
                />
              </div>
            </div>

            {/* Footer */}
            <div className="pchi-modal-footer">
              <button
                type="button"
                className="pchi-btn pchi-btn--ghost"
                onClick={closeCreateModal}
                disabled={creating}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="pchi-btn pchi-btn--primary"
                onClick={handleCreateTicket}
                disabled={
                  creating ||
                  autoVoucherLoading ||
                  !!autoVoucherError ||
                  !autoVoucherCode ||
                  !createForm.title.trim() ||
                  !createForm.amount.trim()
                }
              >
                <Plus size={16} />
                {creating ? "Đang tạo..." : "Tạo phiếu chi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DETAIL MODAL ──────────────────────── */}
      {selectedTicket && (
        <div className="pchi-modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="pchi-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="pchi-modal-header">
              <div className="pchi-modal-header-left">
                <div className="pchi-modal-icon pchi-modal-icon--detail">
                  <TrendingDown size={20} />
                </div>
                <div>
                  <p className="pchi-modal-title">Chi tiết phiếu chi</p>
                  <p className="pchi-modal-subtitle-text">{selectedTicket.title}</p>
                </div>
              </div>
              <button
                type="button"
                className="pchi-modal-close"
                onClick={() => setSelectedTicket(null)}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="pchi-modal-body">
              {/* Section: Thông tin phiếu chi */}
              <div className="pchi-section-divider">Thông tin phiếu chi</div>
              <div className="pchi-section-block">
                <div className="pchi-detail-row">
                  <span className="pchi-detail-label">Mã phiếu:</span>
                  <span className="pchi-detail-value">
                    <span className="pchi-code-badge">
                      {selectedTicket.paymentVoucher || "—"}
                    </span>
                  </span>
                </div>
                <div className="pchi-detail-row">
                  <span className="pchi-detail-label">Tiêu đề:</span>
                  <span className="pchi-detail-value">{selectedTicket.title}</span>
                </div>
                <div className="pchi-detail-row">
                  <span className="pchi-detail-label">Số tiền:</span>
                  <span className="pchi-detail-value amount">
                    {formatCurrency(selectedTicket.amount)}
                  </span>
                </div>
              </div>

              {/* Section: Thời gian */}
              <div className="pchi-section-divider">Thời gian</div>
              <div className="pchi-section-block">
                <div className="pchi-detail-row">
                  <span className="pchi-detail-label">Ngày tạo:</span>
                  <span className="pchi-detail-value">
                    {formatDate(selectedTicket.createdAt || selectedTicket.transactionDate)}
                  </span>
                </div>
                {toUiStatus(selectedTicket.status) === "paid" && (
                  <div className="pchi-detail-row">
                    <span className="pchi-detail-label">Ngày thanh toán:</span>
                    <span className="pchi-detail-value">
                      {formatDate(selectedTicket.accountantPaidAt)}
                    </span>
                  </div>
                )}
              </div>

              {/* Section: Trạng thái */}
              <div className="pchi-section-divider">Trạng thái</div>
              <div className="pchi-section-block">
                <div className="pchi-detail-row">
                  <span className="pchi-detail-label">Trạng thái:</span>
                  <span className="pchi-detail-value">
                    <span className={`pchi-status-badge ${toUiStatus(selectedTicket.status)}`}>
                      {statusIcon(selectedTicket.status)}
                      {statusLabel(selectedTicket.status)}
                    </span>
                  </span>
                </div>
                {toUiStatus(selectedTicket.status) === "rejected" &&
                  selectedTicket.rejectionReason && (
                    <div className="pchi-detail-row">
                      <span className="pchi-detail-label">Lý do từ chối:</span>
                      <span className="pchi-detail-value rejection">
                        {selectedTicket.rejectionReason}
                      </span>
                    </div>
                  )}
              </div>
            </div>

            {/* Footer */}
            <div className="pchi-modal-footer">
              {toUiStatus(selectedTicket.status) === "approved" ? (
                <>
                  <button
                    type="button"
                    className="pchi-btn pchi-btn--ghost"
                    onClick={() => setSelectedTicket(null)}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="pchi-btn pchi-btn--confirm"
                    onClick={() => handleConfirmPaid(selectedTicket)}
                    disabled={creating}
                  >
                    <CheckCircle2 size={16} />
                    {creating ? "Đang lưu..." : "Xác nhận đã chi"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="pchi-btn pchi-btn--ghost"
                  onClick={() => setSelectedTicket(null)}
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

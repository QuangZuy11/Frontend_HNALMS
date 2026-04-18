import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  TrendingDown,
  FileText,
  Clock,
  Banknote,
  CheckCircle2,
  XCircle,
  Filter,
  ArrowUpDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cashFlowService } from "../../../services/cashFlowService";
import "./OwnerPaymentsList.css";

interface OwnerPaymentTicket {
  _id: string;
  type: "Payment" | string;
  amount: number;
  title: string;
  status: string;
  transactionDate: string;
  createdAt?: string;
  paymentVoucher?: string | null;
  accountantPaidAt?: string;
  rejectionReason?: string | null;
}

type UiPaymentStatus = "pending" | "approved" | "paid" | "rejected";

export default function OwnerPaymentsList() {
  const [tickets, setTickets] = useState<OwnerPaymentTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 11;
  const [selectedTicket, setSelectedTicket] = useState<OwnerPaymentTicket | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [rejectError, setRejectError] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "paid" | "rejected"
  >("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const fetchTickets = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      type ApiResponse = {
        success: boolean;
        data: OwnerPaymentTicket[];
        message?: string;
      };

      const params: { from?: string; to?: string } = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const response: ApiResponse = await cashFlowService.getOwnerPaymentTickets(params);

      if (response.success && Array.isArray(response.data)) {
        setTickets(response.data);
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách phiếu chi (owner):", err);
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
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const formatCurrency = (value: number | undefined) => {
    if (typeof value !== "number") return "0 ₫";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const toUiStatus = (status?: string): UiPaymentStatus => {
    const s = (status || "").toLowerCase();
    if (s === "paid" || s.includes("đã thanh toán") || s.includes("da thanh toan")) return "paid";
    if (s === "approved" || s.includes("đã duyệt") || s.includes("da duyet")) return "approved";
    if (s === "rejected" || s.includes("từ chối") || s.includes("tu choi")) return "rejected";
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

  const toApiStatus = (
    ui: UiPaymentStatus,
  ): "Pending" | "Approved" | "Paid" | "Rejected" =>
    ui === "paid"
      ? "Paid"
      : ui === "rejected"
        ? "Rejected"
        : ui === "approved"
          ? "Approved"
          : "Pending";

  const handleChangeStatus = async (
    ticketId: string,
    uiStatus: UiPaymentStatus,
    reason?: string,
  ) => {
    setTickets((prev) =>
      prev.map((t) => (t._id === ticketId ? { ...t, status: toApiStatus(uiStatus) } : t)),
    );

    try {
      const res = await cashFlowService.updatePaymentTicketStatus(
        ticketId,
        toApiStatus(uiStatus),
        undefined,
        reason,
      );

      if (res?.success && res?.data?._id) {
        setTickets((prev) =>
          prev.map((t) =>
            t._id === ticketId
              ? {
                  ...t,
                  status: res.data.status,
                  accountantPaidAt: res.data.accountantPaidAt,
                  rejectionReason: res.data.rejectionReason ?? null,
                }
              : t,
          ),
        );
        setSelectedTicket((prev) =>
          prev && prev._id === ticketId
            ? {
                ...prev,
                status: res.data.status,
                accountantPaidAt: res.data.accountantPaidAt,
                rejectionReason: res.data.rejectionReason ?? null,
              }
            : prev,
        );
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật trạng thái phiếu chi:", err);
      setError("Không thể cập nhật trạng thái phiếu chi");
      fetchTickets();
    }
  };

  const handleOpenRejectModal = (ticket: OwnerPaymentTicket) => {
    setSelectedTicket(ticket);
    setRejectReason("");
    setRejectError("");
    setShowRejectModal(true);
  };

  const handleCloseRejectModal = () => {
    setShowRejectModal(false);
    setRejectReason("");
    setRejectError("");
  };

  const handleConfirmReject = async () => {
    if (!selectedTicket) return;
    if (!rejectReason.trim()) {
      setRejectError("Vui lòng nhập lý do từ chối");
      return;
    }
    setRejectError("");
    setShowRejectModal(false);
    await handleChangeStatus(selectedTicket._id, "rejected", rejectReason.trim());
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === "all") return true;
    return toUiStatus(t.status) === statusFilter;
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
    <div className="opay-container">
      {/* ─── HEADER ─────────────────────────────── */}
      <div className="opay-header">
        <div className="opay-header-top">
          {/* Title block */}
          <div className="opay-title-block">
            <div className="opay-title-row">
              <div className="opay-title-icon" aria-hidden>
                <TrendingDown size={22} strokeWidth={2} />
              </div>
              <div className="opay-title-text">
                <h2>Danh sách Phiếu Chi</h2>
                <p className="opay-subtitle">
                  Theo dõi và phê duyệt các phiếu chi của tòa nhà.
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="opay-header-aside">
            <div className="opay-stats-summary">
              <div className="opay-stat-item">
                <div className="opay-stat-icon opay-icon-total">
                  <FileText size={16} />
                </div>
                <div className="opay-stat-text">
                  <span className="opay-stat-value">{totalCount}</span>
                  <span className="opay-stat-label">Tổng số</span>
                </div>
              </div>
              <div className="opay-stat-divider" />
              <div className="opay-stat-item">
                <div className="opay-stat-icon opay-icon-pending">
                  <Clock size={16} />
                </div>
                <div className="opay-stat-text">
                  <span className="opay-stat-value">{pendingCount}</span>
                  <span className="opay-stat-label">Chờ duyệt</span>
                </div>
              </div>
              <div className="opay-stat-divider" />
              <div className="opay-stat-item">
                <div className="opay-stat-icon opay-icon-approved">
                  <Banknote size={16} />
                </div>
                <div className="opay-stat-text">
                  <span className="opay-stat-value">{approvedCount}</span>
                  <span className="opay-stat-label">Đã duyệt</span>
                </div>
              </div>
              <div className="opay-stat-divider" />
              <div className="opay-stat-item">
                <div className="opay-stat-icon opay-icon-paid">
                  <CheckCircle2 size={16} />
                </div>
                <div className="opay-stat-text">
                  <span className="opay-stat-value">{paidCount}</span>
                  <span className="opay-stat-label">Đã chi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TOOLBAR ────────────────────────────── */}
      <div className="opay-toolbar">
        <div className="opay-toolbar-left">
          <div className="opay-control-group">
            <CalendarDays size={16} className="opay-toolbar-icon" aria-hidden />
            <span className="opay-control-label">Từ ngày:</span>
            <input
              id="opay-from-date"
              type="date"
              className="opay-date-input"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="opay-control-group">
            <span className="opay-control-label">Đến ngày:</span>
            <input
              id="opay-to-date"
              type="date"
              className="opay-date-input"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="opay-control-group">
            <Filter size={16} className="opay-toolbar-icon" aria-hidden />
            <select
              id="opay-status-filter"
              className="opay-custom-select"
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

        <div className="opay-toolbar-right">
          <ArrowUpDown size={16} className="opay-toolbar-icon" aria-hidden />
          <span className="opay-control-label">Mới nhất</span>
        </div>
      </div>

      {/* ─── ERROR BANNER ───────────────────────── */}
      {error && <div className="opay-error-banner">{error}</div>}

      {/* ─── TABLE ─────────────────────────────── */}
      <div className="opay-table-container">
        <table className="opay-table">
          <thead>
            <tr>
              <th className="opay-cell-stt">STT</th>
              <th className="opay-cell-code">Mã phiếu</th>
              <th className="opay-cell-title">Tiêu đề</th>
              <th className="opay-cell-amount">Số tiền (VNĐ)</th>
              <th className="opay-cell-status">Trạng thái</th>
              <th className="opay-cell-date">Ngày tạo</th>
              <th className="opay-cell-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="opay-loading-cell">
                  <div className="opay-loading-inner">
                    <div className="opay-spinner" />
                    <p className="opay-empty-text">Đang tải dữ liệu...</p>
                  </div>
                </td>
              </tr>
            ) : !error && filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={7} className="opay-table-empty-cell">
                  <div className="opay-empty-inner">
                    <div className="opay-empty-icon">
                      <TrendingDown size={28} />
                    </div>
                    <p className="opay-empty-text">Chưa có phiếu chi nào.</p>
                    <p className="opay-empty-sub">Thử thay đổi bộ lọc để xem kết quả khác.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTickets.map((t, index) => (
                <tr key={t._id}>
                  <td className="opay-cell-stt">{startIndex + index + 1}</td>
                  <td className="opay-cell-code">
                    <span className="opay-code-badge">{t.paymentVoucher || "—"}</span>
                  </td>
                  <td className="opay-cell-title">{t.title}</td>
                  <td className="opay-cell-amount">{formatCurrency(t.amount)}</td>
                  <td className="opay-cell-status">
                    <span className={`opay-status-badge ${toUiStatus(t.status)}`}>
                      {statusIcon(t.status)}
                      {statusLabel(t.status)}
                    </span>
                  </td>
                  <td className="opay-cell-date">
                    {formatDate(t.createdAt || t.transactionDate)}
                  </td>
                  <td className="opay-cell-actions">
                    <div className="opay-table-actions">
                      <button
                        type="button"
                        className="opay-btn-icon opay-btn-view"
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
          <div className="opay-pagination">
            <div className="opay-pagination-info">
              Tổng: <strong>{filteredTickets.length}</strong> phiếu chi &nbsp;|&nbsp; Trang{" "}
              <strong>{safePage}</strong>/{totalPages}
            </div>
            <div className="opay-pagination-controls">
              <button
                type="button"
                className="opay-page-btn"
                disabled={safePage === 1}
                onClick={() => setCurrentPage(1)}
                title="Trang đầu"
              >
                «
              </button>
              <button
                type="button"
                className="opay-page-btn"
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
                    className={`opay-page-btn${safePage === p ? " active" : ""}`}
                    onClick={() => setCurrentPage(p as number)}
                    aria-current={safePage === p ? "page" : undefined}
                  >
                    {p}
                  </button>
                ),
              )}

              <button
                type="button"
                className="opay-page-btn"
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="Trang sau"
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                className="opay-page-btn"
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

      {/* ─── DETAIL MODAL ──────────────────────── */}
      {selectedTicket && !showRejectModal && (
        <div className="opay-modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="opay-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="opay-modal-header">
              <div className="opay-modal-header-left">
                <div className="opay-modal-icon opay-modal-icon--detail">
                  <TrendingDown size={20} />
                </div>
                <div>
                  <p className="opay-modal-title">Chi tiết phiếu chi</p>
                  <p className="opay-modal-subtitle-text">{selectedTicket.title}</p>
                </div>
              </div>
              <button
                type="button"
                className="opay-modal-close"
                onClick={() => setSelectedTicket(null)}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="opay-modal-body">
              {/* Section: Thông tin phiếu chi */}
              <div className="opay-section-divider">Thông tin phiếu chi</div>
              <div className="opay-section-block">
                <div className="opay-detail-row">
                  <span className="opay-detail-label">Mã phiếu:</span>
                  <span className="opay-detail-value">
                    <span className="opay-code-badge">
                      {selectedTicket.paymentVoucher || "—"}
                    </span>
                  </span>
                </div>
                <div className="opay-detail-row">
                  <span className="opay-detail-label">Tiêu đề:</span>
                  <span className="opay-detail-value">{selectedTicket.title}</span>
                </div>
                <div className="opay-detail-row">
                  <span className="opay-detail-label">Số tiền:</span>
                  <span className="opay-detail-value amount">
                    {formatCurrency(selectedTicket.amount)}
                  </span>
                </div>
              </div>

              {/* Section: Thời gian */}
              <div className="opay-section-divider">Thời gian</div>
              <div className="opay-section-block">
                <div className="opay-detail-row">
                  <span className="opay-detail-label">Ngày tạo:</span>
                  <span className="opay-detail-value">
                    {formatDate(selectedTicket.createdAt || selectedTicket.transactionDate)}
                  </span>
                </div>
                {toUiStatus(selectedTicket.status) === "paid" && (
                  <div className="opay-detail-row">
                    <span className="opay-detail-label">Ngày thanh toán:</span>
                    <span className="opay-detail-value">
                      {formatDate(selectedTicket.accountantPaidAt)}
                    </span>
                  </div>
                )}
              </div>

              {/* Section: Trạng thái */}
              <div className="opay-section-divider">Trạng thái</div>
              <div className="opay-section-block">
                <div className="opay-detail-row">
                  <span className="opay-detail-label">Trạng thái:</span>
                  <span className="opay-detail-value">
                    <span className={`opay-status-badge ${toUiStatus(selectedTicket.status)}`}>
                      {statusIcon(selectedTicket.status)}
                      {statusLabel(selectedTicket.status)}
                    </span>
                  </span>
                </div>
                {toUiStatus(selectedTicket.status) === "rejected" &&
                  selectedTicket.rejectionReason && (
                    <div className="opay-detail-row">
                      <span className="opay-detail-label">Lý do từ chối:</span>
                      <span className="opay-detail-value rejection">
                        {selectedTicket.rejectionReason}
                      </span>
                    </div>
                  )}
              </div>
            </div>

            {/* Footer */}
            <div className="opay-modal-footer">
              {toUiStatus(selectedTicket.status) === "pending" ? (
                <>
                  <button
                    type="button"
                    className="opay-btn opay-btn--ghost"
                    onClick={() => setSelectedTicket(null)}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="opay-btn opay-btn--reject"
                    onClick={() => handleOpenRejectModal(selectedTicket)}
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    className="opay-btn opay-btn--approve"
                    onClick={() => {
                      handleChangeStatus(selectedTicket._id, "approved");
                      setSelectedTicket(null);
                    }}
                  >
                    Duyệt phiếu
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="opay-btn opay-btn--ghost"
                  onClick={() => setSelectedTicket(null)}
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── REJECT MODAL ──────────────────────── */}
      {showRejectModal && selectedTicket && (
        <div className="opay-modal-overlay" onClick={handleCloseRejectModal}>
          <div
            className="opay-modal opay-modal--reject"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="opay-modal-header">
              <div className="opay-modal-header-left">
                <div className="opay-modal-icon opay-modal-icon--reject">
                  <XCircle size={20} />
                </div>
                <div>
                  <p className="opay-modal-title">Từ chối phiếu chi</p>
                  <p className="opay-modal-subtitle-text">{selectedTicket.title}</p>
                </div>
              </div>
              <button
                type="button"
                className="opay-modal-close"
                onClick={handleCloseRejectModal}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="opay-modal-body">
              <div className="opay-field">
                <label className="opay-label">
                  Lý do từ chối <span className="opay-label-required">*</span>
                </label>
                <textarea
                  className="opay-textarea"
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (rejectError) setRejectError("");
                  }}
                  placeholder="Nhập lý do từ chối phiếu chi..."
                  rows={3}
                />
                {rejectError && (
                  <span className="opay-field-error">{rejectError}</span>
                )}
              </div>
            </div>

            <div className="opay-modal-footer">
              <button
                type="button"
                className="opay-btn opay-btn--ghost"
                onClick={handleCloseRejectModal}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="opay-btn opay-btn--confirm-reject"
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

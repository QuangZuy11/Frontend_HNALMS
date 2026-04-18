import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  Receipt,
  FileText,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown,
  CalendarDays,
} from "lucide-react";
import { cashFlowService } from "../../../services/cashFlowService";
import "./receiptsList.css";

interface ReceiptTicket {
  _id: string;
  type: "Receipt" | string;
  amount: number;
  totalAmount?: number;
  title: string;
  status: string;
  transactionDate: string;
  createdAt?: string;
  invoiceCode?: string | null;
  paymentVoucher?: string | null;
  accountantPaidAt?: string;
  sourceType?: "violation" | "repair" | "manual";
  invoiceIncurredId?: string | null;
}

type UiPaymentStatus = "paid" | "unpaid";

export default function ReceiptsList() {
  const [tickets, setTickets] = useState<ReceiptTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 11;
  const [selectedTicket, setSelectedTicket] = useState<ReceiptTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const fetchTickets = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      type ApiResponse = {
        success: boolean;
        data: ReceiptTicket[];
        message?: string;
      };

      const params: {
        from?: string;
        to?: string;
        status?: "Paid" | "Unpaid";
      } = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (statusFilter !== "all") {
        params.status = statusFilter === "paid" ? "Paid" : "Unpaid";
      }

      const response: ApiResponse = await cashFlowService.getReceiptTickets(params);

      if (response.success && Array.isArray(response.data)) {
        setTickets(response.data);
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách phiếu thu:", err);
      let msg = "Không thể tải danh sách phiếu thu";
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
  }, [fromDate, toDate, statusFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

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
    return "unpaid";
  };

  const statusLabel = (status?: string) => {
    const ui = toUiStatus(status);
    return ui === "paid" ? "Đã thanh toán" : "Chưa thanh toán";
  };

  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize) || 1);
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedTickets = tickets.slice(startIndex, startIndex + pageSize);

  const totalCount = tickets.length;
  const paidCount = tickets.filter((t) => toUiStatus(t.status) === "paid").length;
  const unpaidCount = tickets.filter((t) => toUiStatus(t.status) === "unpaid").length;

  // Build page numbers array
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
    <div className="rcpt-container">
      {/* ─── HEADER ─────────────────────────────────── */}
      <div className="rcpt-header">
        <div className="rcpt-header-top">
          {/* Title block */}
          <div className="rcpt-title-block">
            <div className="rcpt-title-row">
              <div className="rcpt-title-icon" aria-hidden>
                <Receipt size={22} strokeWidth={2} />
              </div>
              <div className="rcpt-title-text">
                <h2>Quản lý Phiếu Thu</h2>
                <p className="rcpt-subtitle">
                  Theo dõi và quản lý tất cả các phiếu thu của tòa nhà Hoàng Nam.
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="rcpt-header-aside">
            <div className="rcpt-stats-summary">
              <div className="rcpt-stat-item">
                <div className="rcpt-stat-icon rcpt-icon-total">
                  <FileText size={16} />
                </div>
                <div className="rcpt-stat-text">
                  <span className="rcpt-stat-value">{totalCount}</span>
                  <span className="rcpt-stat-label">Tổng số</span>
                </div>
              </div>
              <div className="rcpt-stat-divider" />
              <div className="rcpt-stat-item">
                <div className="rcpt-stat-icon rcpt-icon-paid">
                  <CheckCircle2 size={16} />
                </div>
                <div className="rcpt-stat-text">
                  <span className="rcpt-stat-value">{paidCount}</span>
                  <span className="rcpt-stat-label">Đã thu</span>
                </div>
              </div>
              <div className="rcpt-stat-divider" />
              <div className="rcpt-stat-item">
                <div className="rcpt-stat-icon rcpt-icon-unpaid">
                  <Clock size={16} />
                </div>
                <div className="rcpt-stat-text">
                  <span className="rcpt-stat-value">{unpaidCount}</span>
                  <span className="rcpt-stat-label">Chờ thu</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TOOLBAR ────────────────────────────────── */}
      <div className="rcpt-toolbar">
        <div className="rcpt-toolbar-left">
          {/* Từ ngày */}
          <div className="rcpt-control-group">
            <CalendarDays size={16} className="rcpt-toolbar-icon" aria-hidden />
            <span className="rcpt-control-label">Từ ngày:</span>
            <input
              id="rcpt-from-date"
              type="date"
              className="rcpt-date-input"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Đến ngày */}
          <div className="rcpt-control-group">
            <span className="rcpt-control-label">Đến ngày:</span>
            <input
              id="rcpt-to-date"
              type="date"
              className="rcpt-date-input"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Lọc trạng thái */}
          <div className="rcpt-control-group">
            <Filter size={16} className="rcpt-toolbar-icon" aria-hidden />
            <select
              id="rcpt-status-filter"
              className="rcpt-custom-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "all" | "paid" | "unpaid");
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="unpaid">Chưa thanh toán</option>
              <option value="paid">Đã thanh toán</option>
            </select>
          </div>
        </div>

        <div className="rcpt-toolbar-right">
          <ArrowUpDown size={16} className="rcpt-toolbar-icon" aria-hidden />
          <span className="rcpt-control-label">Mới nhất</span>
        </div>
      </div>

      {/* ─── ERROR BANNER ───────────────────────────── */}
      {error && <div className="rcpt-error-banner">{error}</div>}

      {/* ─── TABLE ─────────────────────────────────── */}
      <div className="rcpt-table-container">
        <table className="rcpt-table">
          <thead>
            <tr>
              <th className="rcpt-cell-stt">STT</th>
              <th className="rcpt-cell-code">Mã phiếu</th>
              <th className="rcpt-cell-title">Tiêu đề</th>
              <th className="rcpt-cell-amount">Số tiền (VNĐ)</th>
              <th className="rcpt-cell-status">Trạng thái</th>
              <th className="rcpt-cell-date">Ngày tạo</th>
              <th className="rcpt-cell-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="rcpt-loading-cell">
                  <div className="rcpt-loading-inner">
                    <div className="rcpt-spinner" />
                    <p className="rcpt-empty-text">Đang tải dữ liệu...</p>
                  </div>
                </td>
              </tr>
            ) : !error && tickets.length === 0 ? (
              <tr>
                <td colSpan={7} className="rcpt-table-empty-cell">
                  <div className="rcpt-empty-inner">
                    <div className="rcpt-empty-icon">
                      <Receipt size={28} />
                    </div>
                    <p className="rcpt-empty-text">Chưa có phiếu thu nào.</p>
                    <p className="rcpt-empty-sub">Thử thay đổi bộ lọc để tìm kiếm phiếu thu.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTickets.map((t, index) => (
                <tr key={t._id}>
                  <td className="rcpt-cell-stt">{startIndex + index + 1}</td>
                  <td className="rcpt-cell-code">
                    <span className="rcpt-code-badge">{t.invoiceCode || "—"}</span>
                  </td>
                  <td className="rcpt-cell-title">{t.title}</td>
                  <td className="rcpt-cell-amount">
                    {formatCurrency(t.totalAmount ?? t.amount)}
                  </td>
                  <td className="rcpt-cell-status">
                    <span
                      className={`rcpt-status-badge ${toUiStatus(t.status) === "paid" ? "paid" : "unpaid"}`}
                    >
                      {toUiStatus(t.status) === "paid" ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <Clock size={12} />
                      )}
                      {statusLabel(t.status)}
                    </span>
                  </td>
                  <td className="rcpt-cell-date">
                    {formatDate(t.createdAt || t.transactionDate)}
                  </td>
                  <td className="rcpt-cell-actions">
                    <div className="rcpt-table-actions">
                      <button
                        type="button"
                        className="rcpt-btn-icon rcpt-btn-view"
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

        {/* ─── PAGINATION ──────────────────────────── */}
        {!loading && !error && tickets.length > 0 && (
          <div className="rcpt-pagination">
            <div className="rcpt-pagination-info">
              Tổng: <strong>{tickets.length}</strong> phiếu thu &nbsp;|&nbsp; Trang{" "}
              <strong>{safePage}</strong>/{totalPages}
            </div>
            <div className="rcpt-pagination-controls">
              <button
                type="button"
                className="rcpt-page-btn"
                disabled={safePage === 1}
                onClick={() => setCurrentPage(1)}
                title="Trang đầu"
              >
                «
              </button>
              <button
                type="button"
                className="rcpt-page-btn"
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
                    className={`rcpt-page-btn${safePage === p ? " active" : ""}`}
                    onClick={() => setCurrentPage(p as number)}
                    aria-current={safePage === p ? "page" : undefined}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                className="rcpt-page-btn"
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="Trang sau"
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                className="rcpt-page-btn"
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

      {/* ─── DETAIL MODAL ──────────────────────────── */}
      {selectedTicket && (
        <div
          className="rcpt-modal-overlay"
          onClick={() => setSelectedTicket(null)}
        >
          <div className="rcpt-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="rcpt-modal-header">
              <div className="rcpt-modal-header-left">
                <div className="rcpt-modal-icon">
                  <Receipt size={20} />
                </div>
                <div>
                  <p className="rcpt-modal-title">Chi tiết phiếu thu</p>
                  <p className="rcpt-modal-subtitle-text">{selectedTicket.title}</p>
                </div>
              </div>
              <button
                type="button"
                className="rcpt-modal-close"
                onClick={() => setSelectedTicket(null)}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="rcpt-modal-body">
              {/* Section: Thông tin phiếu thu */}
              <div className="rcpt-section-divider">Thông tin phiếu thu</div>
              <div className="rcpt-section-block">
                <div className="rcpt-detail-row">
                  <span className="rcpt-detail-label">Mã phiếu:</span>
                  <span className="rcpt-detail-value">
                    <span className="rcpt-code-badge">
                      {selectedTicket.invoiceCode || "—"}
                    </span>
                  </span>
                </div>
                <div className="rcpt-detail-row">
                  <span className="rcpt-detail-label">Tiêu đề:</span>
                  <span className="rcpt-detail-value">{selectedTicket.title}</span>
                </div>
                <div className="rcpt-detail-row">
                  <span className="rcpt-detail-label">Số tiền:</span>
                  <span className="rcpt-detail-value amount">
                    {formatCurrency(selectedTicket.totalAmount ?? selectedTicket.amount)}
                  </span>
                </div>
              </div>

              {/* Section: Thời gian */}
              <div className="rcpt-section-divider">Thời gian</div>
              <div className="rcpt-section-block">
                <div className="rcpt-detail-row">
                  <span className="rcpt-detail-label">Ngày tạo:</span>
                  <span className="rcpt-detail-value">
                    {formatDate(selectedTicket.createdAt || selectedTicket.transactionDate)}
                  </span>
                </div>
                {toUiStatus(selectedTicket.status) === "paid" && (
                  <div className="rcpt-detail-row">
                    <span className="rcpt-detail-label">Ngày thanh toán:</span>
                    <span className="rcpt-detail-value">
                      {formatDate(selectedTicket.accountantPaidAt)}
                    </span>
                  </div>
                )}
              </div>

              {/* Section: Trạng thái */}
              <div className="rcpt-section-divider">Trạng thái</div>
              <div className="rcpt-section-block">
                <div className="rcpt-detail-row">
                  <span className="rcpt-detail-label">Trạng thái:</span>
                  <span className="rcpt-detail-value">
                    <span
                      className={`rcpt-status-badge ${toUiStatus(selectedTicket.status) === "paid" ? "paid" : "unpaid"}`}
                    >
                      {toUiStatus(selectedTicket.status) === "paid" ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <Clock size={12} />
                      )}
                      {statusLabel(selectedTicket.status)}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="rcpt-modal-footer">
              <button
                type="button"
                className="rcpt-btn-ghost"
                onClick={() => setSelectedTicket(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

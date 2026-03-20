import { useCallback, useEffect, useState } from "react";
import { Eye } from "lucide-react";
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
  sourceType?: 'violation' | 'repair' | 'manual';
  invoiceIncurredId?: string | null;
}

type UiPaymentStatus = "paid" | "unpaid";

export default function ReceiptsList() {
  const [tickets, setTickets] = useState<ReceiptTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 11;
  const [selectedTicket, setSelectedTicket] = useState<ReceiptTicket | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">(
    "all",
  );
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

      const response: ApiResponse =
        await cashFlowService.getReceiptTickets(params);

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
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message
      ) {
        msg = (err as { response?: { data?: { message?: string } } }).response!
          .data!.message as string;
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
    if (typeof value !== "number") return "0";
    return value.toLocaleString("vi-VN");
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize) || 1);

  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedTickets = tickets.slice(startIndex, startIndex + pageSize);

  const toUiStatus = (status?: string): UiPaymentStatus => {
    const s = (status || "").toLowerCase();
    if (
      s === "paid" ||
      s.includes("đã thanh toán") ||
      s.includes("da thanh toan")
    )
      return "paid";
    return "unpaid";
  };

  const statusLabel = (status?: string) => {
    const ui = toUiStatus(status);
    return ui === "paid" ? "Đã thanh toán" : "Chưa thanh toán";
  };



  return (
    <div className="receipts-page">
      <div className="receipts-card">
        <div className="receipts-header">
          <div>
            <h1>Danh sách phiếu thu</h1>
          </div>
          <div className="receipts-header-actions">
            <div className="receipts-filter-wrapper">
              <label htmlFor="from-date" className="receipts-filter-label">
                Từ ngày:
              </label>
              <input
                id="from-date"
                type="date"
                className="receipts-filter-input"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="receipts-filter-wrapper">
              <label htmlFor="to-date" className="receipts-filter-label">
                Đến ngày:
              </label>
              <input
                id="to-date"
                type="date"
                className="receipts-filter-input"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="receipts-filter-wrapper">
              <label htmlFor="status-filter" className="receipts-filter-label">
                Trạng thái:
              </label>
              <select
                id="status-filter"
                className="receipts-filter-select receipts-status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as "all" | "paid" | "unpaid");
                  setCurrentPage(1);
                }}
              >
                <option value="all">Tất cả</option>
                <option value="unpaid">Chưa thanh toán</option>
                <option value="paid">Đã thanh toán</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="receipts-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div className="receipts-empty">
            <p>Chưa có phiếu thu nào.</p>
          </div>
        )}

        {!loading && !error && tickets.length > 0 && (
          <div className="receipts-table-wrap">
            <table className="receipts-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã phiếu</th>
                  <th>Tiêu đề</th>
                  <th>Số tiền (VNĐ)</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTickets.map((t, index) => (
                  <tr key={t._id}>
                    <td>{startIndex + index + 1}</td>
                    <td>
                      <span className="payments-code-badge">
                        {t.invoiceCode || "—"}
                      </span>
                    </td>
                    <td>{t.title}</td>
                    <td>{formatCurrency(t.totalAmount ?? t.amount)}</td>
                    <td>
                      <span
                        className={`receipts-status-badge ${
                          toUiStatus(t.status) === "paid" ? "paid" : "unpaid"
                        }`}
                      >
                        {statusLabel(t.status)}
                      </span>
                    </td>
                    <td>{formatDate(t.createdAt || t.transactionDate)}</td>
                    <td>
                      <div className="receipts-actions">
                        <button
                          type="button"
                          className="receipts-icon-btn"
                          title="Xem"
                          onClick={() => setSelectedTicket(t)}
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

        {selectedTicket && (
          <div
            className="receipts-modal-overlay"
            onClick={() => setSelectedTicket(null)}
          >
            <div
              className="receipts-modal receipts-modal--detail"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="receipts-modal-header receipts-modal-header--detail">
                <div>
                  <h3>Chi tiết phiếu thu</h3>
                  <p className="receipts-modal-subtitle">
                    {selectedTicket.title}
                  </p>
                </div>
                <button
                  type="button"
                  className="receipts-modal-close receipts-modal-close--detail"
                  onClick={() => setSelectedTicket(null)}
                >
                  ✕
                </button>
              </div>

              <div className="receipts-modal-body receipts-detail-content">
                <div className="receipts-section-divider">
                  Thông tin phiếu thu
                </div>
                <div className="receipts-section-block">
                  <div className="receipts-detail-row">
                    <span className="receipts-detail-label">Mã phiếu:</span>
                    <span className="receipts-detail-value">
                      {selectedTicket.invoiceCode || "-"}
                    </span>
                  </div>
                  <div className="receipts-detail-row">
                    <span className="receipts-detail-label">Tiêu đề:</span>
                    <span className="receipts-detail-value">
                      {selectedTicket.title}
                    </span>
                  </div>
                  <div className="receipts-detail-row">
                    <span className="receipts-detail-label">Số tiền:</span>
                    <span className="receipts-detail-value">
                      {formatCurrency(selectedTicket.totalAmount ?? selectedTicket.amount)} VNĐ
                    </span>
                  </div>
                </div>

                <div className="receipts-section-divider">Thời gian</div>
                <div className="receipts-section-block">
                  <div className="receipts-detail-row">
                    <span className="receipts-detail-label">Ngày tạo:</span>
                    <span className="receipts-detail-value">
                      {formatDate(
                        selectedTicket.createdAt ||
                          selectedTicket.transactionDate,
                      )}
                    </span>
                  </div>
                  {toUiStatus(selectedTicket.status) === "paid" && (
                    <div className="receipts-detail-row">
                      <span className="receipts-detail-label">
                        Ngày thanh toán:
                      </span>
                      <span className="receipts-detail-value">
                        {formatDate(selectedTicket.accountantPaidAt)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="receipts-section-divider">Trạng thái</div>
                <div className="receipts-section-block">
                  <div className="receipts-detail-row">
                    <span className="receipts-detail-label">Trạng thái:</span>
                    <div className="receipts-detail-value receipts-detail-status">
                      <span
                        className={`receipts-status-badge ${
                          toUiStatus(selectedTicket.status) === "paid"
                            ? "paid"
                            : "unpaid"
                        }`}
                      >
                        {statusLabel(selectedTicket.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Thanh phân trang đặt ngoài bảng, giống màn hóa đơn */}
      {!loading && !error && tickets.length > 0 && (
        <div className="receipts-pagination receipts-pagination-outside">
          <div className="receipts-pagination-info">
            Tổng: <strong>{tickets.length}</strong> phiếu thu | Trang{" "}
            <strong>{safePage}</strong>/{totalPages}
          </div>
          <div className="receipts-pagination-controls">
            <button
              type="button"
              className="receipts-page-nav"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              {"<"}
            </button>

            <button
              type="button"
              className="receipts-page-number active"
              aria-current="page"
            >
              {safePage}
            </button>

            <button
              type="button"
              className="receipts-page-nav"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              {">"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

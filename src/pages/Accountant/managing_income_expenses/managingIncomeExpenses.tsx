import { useCallback, useEffect, useState } from "react";
import { cashFlowService } from "../../../services/cashFlowService";
import "./managingIncomeExpenses.css";
import { Eye } from "lucide-react";

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
  room?: Room | null;
}

type UiPaymentStatus = "paid" | "unpaid";

export default function ManagingIncomeExpenses() {
  const [tickets, setTickets] = useState<FinancialTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // roomSearch removed (màn này không cần tìm kiếm theo phòng)
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">(
    "all"
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 11;
  const [selectedTicket, setSelectedTicket] = useState<FinancialTicket | null>(
    null
  );

  // Khoá scroll trang này
  useEffect(() => {
    const main = document.querySelector('.dashboard-layout-main') as HTMLElement;
    if (main) main.style.overflowY = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      if (main) main.style.overflowY = '';
      document.body.style.overflow = '';
    };
  }, []);

  const fetchTickets = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const params: { roomSearch?: string } = {};

      type ApiResponse = {
        success: boolean;
        data: FinancialTicket[];
        message?: string;
      };

      const response: ApiResponse =
        await cashFlowService.getPaymentTickets(params);

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
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message
      ) {
        msg = (
          err as { response?: { data?: { message?: string } } }
        ).response!.data!.message as string;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const toApiStatus = (ui: UiPaymentStatus): "Paid" | "Unpaid" =>
    ui === "paid" ? "Paid" : "Unpaid";

  const handleChangeStatus = async (
    ticketId: string,
    uiStatus: UiPaymentStatus
  ) => {
    // optimistic update
    setTickets((prev) =>
      prev.map((t) => (t._id === ticketId ? { ...t, status: toApiStatus(uiStatus) } : t))
    );

    try {
      const res = await cashFlowService.updatePaymentTicketStatus(
        ticketId,
        toApiStatus(uiStatus)
      );

      if (res?.success && res?.data?._id) {
        setTickets((prev) =>
          prev.map((t) =>
            t._id === ticketId
              ? { ...t, status: res.data.status, accountantPaidAt: res.data.accountantPaidAt }
              : t
          )
        );

        setSelectedTicket((prev) =>
          prev && prev._id === ticketId
            ? { ...prev, status: res.data.status, accountantPaidAt: res.data.accountantPaidAt }
            : prev
        );
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật trạng thái phiếu chi:", err);
      setError("Không thể cập nhật trạng thái phiếu chi");
      // revert by refetch
      fetchTickets();
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === "all") return true;
    const ui = toUiStatus(t.status);
    return statusFilter === "paid" ? ui === "paid" : ui === "unpaid";
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTickets.length / pageSize) || 1
  );

  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedTickets = filteredTickets.slice(
    startIndex,
    startIndex + pageSize
  );

  return (
    <div className="payments-page">
      <div className="payments-card">
        <div className="payments-header">
          <div>
            <h1>Danh sách phiếu chi</h1>
            <p className="subtitle">
              Các phiếu chi phát sinh từ sửa chữa miễn phí và các nghiệp vụ khác
            </p>
          </div>
          <div className="payments-filter-wrapper">
            <label htmlFor="status-filter" className="payments-filter-label">
              Trạng thái:
            </label>
            <select
              id="status-filter"
              className="payments-filter-select payments-status-filter"
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

        {error && (
          <div className="payments-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && filteredTickets.length === 0 && (
          <div className="payments-empty">
            <p>Chưa có phiếu chi nào.</p>
          </div>
        )}

        {!loading && !error && filteredTickets.length > 0 && (
          <div className="payments-table-wrap">
            <table className="payments-table">
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
                    <td>{t.paymentVoucher || "-"}</td>
                    <td>{t.title}</td>
                    <td>{formatCurrency(t.amount)}</td>
                    <td>
                      <span
                        className={`status-badge ${toUiStatus(t.status) === "paid" ? "paid" : "unpaid"
                          }`}
                      >
                        {statusLabel(t.status)}
                      </span>
                    </td>
                    <td>
                      {formatDate(t.createdAt || t.transactionDate)}
                    </td>
                    <td>
                      <div className="payments-actions">
                        <button
                          type="button"
                          className="payments-icon-btn"
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

        {!loading && !error && filteredTickets.length > 0 && (
          <div className="payments-pagination">
            <button
              type="button"
              className="payments-page-nav"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              {"<"}
            </button>

            <button
              type="button"
              className="payments-page-number active"
              aria-current="page"
            >
              {safePage}
            </button>

            <button
              type="button"
              className="payments-page-nav"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              {">"}
            </button>
          </div>
        )}

        {selectedTicket && (
          <div
            className="payments-modal-overlay"
            onClick={() => setSelectedTicket(null)}
          >
            <div
              className="payments-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="payments-modal-header">
                <h3>Chi tiết phiếu chi</h3>
                <button
                  type="button"
                  className="payments-modal-close"
                  onClick={() => setSelectedTicket(null)}
                >
                  ✕
                </button>
              </div>

              <div className="payments-modal-body">
                <div className="payments-detail-row">
                  <span className="payments-detail-label">Mã phiếu</span>
                  <span className="payments-detail-value">
                    {selectedTicket.paymentVoucher || "-"}
                  </span>
                </div>
                <div className="payments-detail-row">
                  <span className="payments-detail-label">Tiêu đề</span>
                  <span className="payments-detail-value">
                    {selectedTicket.title}
                  </span>
                </div>
                <div className="payments-detail-row">
                  <span className="payments-detail-label">Số tiền</span>
                  <span className="payments-detail-value">
                    {formatCurrency(selectedTicket.amount)} VNĐ
                  </span>
                </div>
                <div className="payments-detail-row">
                  <span className="payments-detail-label">Ngày tạo</span>
                  <span className="payments-detail-value">
                    {formatDate(
                      selectedTicket.createdAt || selectedTicket.transactionDate
                    )}
                  </span>
                </div>
                {toUiStatus(selectedTicket.status) === "paid" && (
                  <div className="payments-detail-row">
                    <span className="payments-detail-label">
                      Ngày kế toán thanh toán
                    </span>
                    <span className="payments-detail-value">
                      {formatDate(selectedTicket.accountantPaidAt)}
                    </span>
                  </div>
                )}
                <div className="payments-detail-row payments-detail-row--column">
                  <span className="payments-detail-label">Trạng thái</span>
                  <div className="payments-detail-value payments-detail-status">
                    <select
                      className="payments-status-select payments-status-select--compact"
                      value={toUiStatus(selectedTicket.status)}
                      onChange={(e) =>
                        handleChangeStatus(
                          selectedTicket._id,
                          e.target.value as UiPaymentStatus
                        )
                      }
                      disabled={toUiStatus(selectedTicket.status) === "paid"}
                    >
                      <option value="unpaid">Chưa thanh toán</option>
                      <option value="paid">Đã thanh toán</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="payments-modal-footer">
                {toUiStatus(selectedTicket.status) === "paid" && (
                  <button
                    type="button"
                    className="payments-done-button"
                    onClick={() => setSelectedTicket(null)}
                  >
                    Xong
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

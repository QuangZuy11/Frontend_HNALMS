import { useCallback, useEffect, useState } from "react";
import { cashFlowService } from "../../../services/cashFlowService";
import { Eye } from "lucide-react";
import "../../Accountant/managing_income_expenses/managingIncomeExpenses.css";

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
  const [selectedTicket, setSelectedTicket] = useState<OwnerPaymentTicket | null>(
    null,
  );
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

      const params: {
        from?: string;
        to?: string;
      } = {};

      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const response: ApiResponse =
        await cashFlowService.getOwnerPaymentTickets(params);

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
  }, [fromDate, toDate]);

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
    if (
      s === "paid" ||
      s.includes("đã thanh toán") ||
      s.includes("da thanh toan")
    ) {
      return "paid";
    }
    if (s === "approved" || s.includes("đã duyệt") || s.includes("da duyet")) {
      return "approved";
    }
    if (s === "rejected" || s.includes("từ chối") || s.includes("tu choi")) {
      return "rejected";
    }
    return "pending";
  };


  const statusLabel = (status?: string) => {
    const ui = toUiStatus(status);
    if (ui === "paid") return "Đã thanh toán";
    if (ui === "approved") return "Đã duyệt";
    if (ui === "rejected") return "Từ chối";
    return "Chờ duyệt";
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === "all") return true;
    const ui = toUiStatus(t.status);
    if (statusFilter === "paid") return ui === "paid";
    if (statusFilter === "rejected") return ui === "rejected";
    if (statusFilter === "approved") return ui === "approved";
    return ui === "pending";
  });

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
      prev.map((t) =>
        t._id === ticketId ? { ...t, status: toApiStatus(uiStatus) } : t,
      ),
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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTickets.length / pageSize) || 1,
  );

  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedTickets = filteredTickets.slice(
    startIndex,
    startIndex + pageSize,
  );

  return (
    <div className="payments-page">
      <div className="payments-card">
        <div className="payments-header">
          <div>
            <h1>Danh sách phiếu chi</h1>
          </div>
          <div className="payments-header-actions">
            <div className="payments-filter-wrapper">
              <label htmlFor="from-date" className="payments-filter-label">
                Từ ngày:
              </label>
              <input
                id="from-date"
                type="date"
                className="payments-filter-input"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="payments-filter-wrapper">
              <label htmlFor="to-date" className="payments-filter-label">
                Đến ngày:
              </label>
              <input
                id="to-date"
                type="date"
                className="payments-filter-input"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
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
                  setStatusFilter(
                    e.target.value as
                    | "all"
                    | "pending"
                    | "approved"
                    | "paid"
                    | "rejected",
                  );
                  setCurrentPage(1);
                }}
              >
                <option value="all">Tất cả</option>
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="paid">Đã thanh toán</option>
                <option value="rejected">Từ chối</option>
              </select>
            </div>
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
                    <td>
                      <span className="payments-code-badge">
                        {t.paymentVoucher || "—"}
                      </span>
                    </td>
                    <td>{t.title}</td>
                    <td>
                      <span className="payments-amount">
                        {formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`payments-status-badge ${toUiStatus(t.status)}`}
                      >
                        {statusLabel(t.status)}
                      </span>
                    </td>
                    <td>{formatDate(t.createdAt || t.transactionDate)}</td>
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

        {selectedTicket && (
          <div
            className="paychi-modal-overlay"
            onClick={() => setSelectedTicket(null)}
          >
            <div
              className="paychi-modal paychi-modal--detail"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="paychi-modal-header paychi-modal-header--detail">
                <div>
                  <h3>Chi tiết phiếu chi</h3>
                  <p className="paychi-modal-subtitle">
                    {selectedTicket.title}
                  </p>
                </div>
                <button
                  type="button"
                  className="paychi-modal-close paychi-modal-close--detail"
                  onClick={() => setSelectedTicket(null)}
                >
                  ✕
                </button>
              </div>

              <div className="paychi-modal-body paychi-detail-content">
                <div className="paychi-section-divider">Thông tin phiếu chi</div>
                <div className="paychi-section-block">
                  <div className="paychi-detail-row">
                    <span className="paychi-detail-label">Mã phiếu:</span>
                    <span className="paychi-detail-value">
                      {selectedTicket.paymentVoucher || "-"}
                    </span>
                  </div>
                  <div className="paychi-detail-row">
                    <span className="paychi-detail-label">Tiêu đề:</span>
                    <span className="paychi-detail-value">
                      {selectedTicket.title}
                    </span>
                  </div>
                  <div className="paychi-detail-row">
                    <span className="paychi-detail-label">Số tiền:</span>
                    <span className="paychi-detail-value">
                      {formatCurrency(selectedTicket.amount)} VNĐ
                    </span>
                  </div>
                </div>

                <div className="paychi-section-divider">Thời gian</div>
                <div className="paychi-section-block">
                  <div className="paychi-detail-row">
                    <span className="paychi-detail-label">Ngày tạo:</span>
                    <span className="paychi-detail-value">
                      {formatDate(
                        selectedTicket.createdAt ||
                        selectedTicket.transactionDate,
                      )}
                    </span>
                  </div>
                  {toUiStatus(selectedTicket.status) === "paid" && (
                    <div className="paychi-detail-row">
                      <span className="paychi-detail-label">
                        Ngày thanh toán:
                      </span>
                      <span className="paychi-detail-value">
                        {formatDate(selectedTicket.accountantPaidAt)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="paychi-section-divider">Trạng thái</div>
                <div className="paychi-section-block">
                  <div className="paychi-detail-row">
                    <span className="paychi-detail-label">Trạng thái:</span>
                    <span className="paychi-detail-value">
                      {statusLabel(selectedTicket.status)}
                    </span>
                  </div>
                  {toUiStatus(selectedTicket.status) === "rejected" &&
                    selectedTicket.rejectionReason && (
                      <div className="paychi-detail-row">
                        <span className="paychi-detail-label">Lý do từ chối:</span>
                        <span className="paychi-detail-value">
                          {selectedTicket.rejectionReason}
                        </span>
                      </div>
                    )}
                </div>

                <div className="paychi-detail-actions">
                  {toUiStatus(selectedTicket.status) === "pending" ? (
                    <>
                      <button
                        type="button"
                        className="paychi-done-btn"
                        onClick={() =>
                          handleChangeStatus(selectedTicket._id, "approved")
                        }
                      >
                        Duyệt
                      </button>
                      <button
                        type="button"
                        className="paychi-cancel-btn"
                        onClick={() => handleOpenRejectModal(selectedTicket)}
                      >
                        Từ chối
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="paychi-done-btn"
                      onClick={() => setSelectedTicket(null)}
                    >
                      Xong
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showRejectModal && selectedTicket && (
          <div className="payments-modal-overlay" onClick={handleCloseRejectModal}>
            <div
              className="payments-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="payments-modal-header payments-modal-header--detail">
                <h3>Lý do từ chối phiếu chi</h3>
                <button
                  type="button"
                  className="payments-modal-close payments-modal-close--detail"
                  onClick={handleCloseRejectModal}
                >
                  ✕
                </button>
              </div>

              <div className="payments-modal-body">
                <div className="payments-form-group">
                  <label>Lý do từ chối *</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => {
                      setRejectReason(e.target.value);
                      if (rejectError) setRejectError("");
                    }}
                    className="payments-form-input"
                    placeholder="Nhập lý do từ chối"
                    rows={3}
                  />
                  {rejectError && (
                    <span className="payments-form-error">{rejectError}</span>
                  )}
                </div>
              </div>

              <div
                className="payments-modal-footer"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  className="payments-btn-secondary"
                  onClick={handleCloseRejectModal}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="payments-btn-primary"
                  onClick={handleConfirmReject}
                  disabled={!rejectReason.trim()}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {!loading && !error && filteredTickets.length > 0 && (
        <div className="payments-pagination payments-pagination-outside">
          <div className="payments-pagination-info">
            Tổng: <strong>{filteredTickets.length}</strong> phiếu chi | Trang{" "}
            <strong>{safePage}</strong>/{totalPages}
          </div>
          <div className="payments-pagination-controls">
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
        </div>
      )}
    </div>
  );
}

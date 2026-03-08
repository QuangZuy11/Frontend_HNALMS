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
    "all",
  );
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 11;
  const [selectedTicket, setSelectedTicket] = useState<FinancialTicket | null>(
    null,
  );
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [autoVoucherCode, setAutoVoucherCode] = useState<string>("");
  const [autoVoucherLoading, setAutoVoucherLoading] = useState<boolean>(false);
  const [autoVoucherError, setAutoVoucherError] = useState<string>("");
  const [createForm, setCreateForm] = useState<{
    title: string;
    amount: string;
    status: "Unpaid" | "Paid";
  }>({
    title: "",
    amount: "",
    status: "Unpaid",
  });
  const [createErrors, setCreateErrors] = useState<{
    title: string;
    amount: string;
  }>({
    title: "",
    amount: "",
  });
  const [formError, setFormError] = useState<string>("");

  // Khoá scroll trang này
  useEffect(() => {
    const main = document.querySelector(
      ".dashboard-layout-main",
    ) as HTMLElement;
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

      const params: {
        from?: string;
        to?: string;
      } = {};

      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

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

  const resetCreateForm = () => {
    setCreateForm({
      title: "",
      amount: "",
      status: "Unpaid",
    });
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
      if (!code) {
        throw new Error("Không thể tạo mã phiếu chi");
      }
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
      const firstError = errors.title || errors.amount;
      setFormError(firstError);
      return;
    }

    setFormError("");

    try {
      setCreating(true);
      const response = await cashFlowService.createManualPaymentTicket({
        title: createForm.title.trim(),
        amount: Number(createForm.amount),
        status: createForm.status,
      });

      if (response?.success && response?.data?._id) {
        setTickets((prev) => [response.data, ...prev]);
        setCurrentPage(1);
        closeCreateModal();
      }
    } catch (err) {
      console.error("Lỗi khi tạo phiếu chi:", err);
      setError("Không thể tạo phiếu chi");
    } finally {
      setCreating(false);
    }
  };

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
    )
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
    uiStatus: UiPaymentStatus,
  ) => {
    // optimistic update
    setTickets((prev) =>
      prev.map((t) =>
        t._id === ticketId ? { ...t, status: toApiStatus(uiStatus) } : t,
      ),
    );

    try {
      const res = await cashFlowService.updatePaymentTicketStatus(
        ticketId,
        toApiStatus(uiStatus),
      );

      if (res?.success && res?.data?._id) {
        setTickets((prev) =>
          prev.map((t) =>
            t._id === ticketId
              ? {
                  ...t,
                  status: res.data.status,
                  accountantPaidAt: res.data.accountantPaidAt,
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
              }
            : prev,
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
        <div className="payments-card-header">
          <div>
            <h1>Danh sách phiếu chi</h1>
          </div>
          <button
            type="button"
            className="payments-create-btn"
            onClick={openCreateModal}
          >
            + Tạo phiếu chi
          </button>
        </div>
        <div className="payments-toolbar">
          <div className="payments-filter-group">
            <label htmlFor="from-date">Từ ngày</label>
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
          <div className="payments-filter-group">
            <label htmlFor="to-date">Đến ngày</label>
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
          <div className="payments-filter-group">
            <label htmlFor="status-filter">Trạng thái</label>
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
                        className={`payments-status-badge ${
                          toUiStatus(t.status) === "paid" ? "paid" : "unpaid"
                        }`}
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

        {showCreateModal && (
          <div className="payments-modal-overlay" onClick={closeCreateModal}>
            <div
              className="payments-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="payments-modal-header">
                <h3>Tạo phiếu chi</h3>
                <button
                  type="button"
                  className="payments-modal-close"
                  onClick={closeCreateModal}
                >
                  ✕
                </button>
              </div>

              <div className="payments-modal-body">
                {formError && (
                  <div
                    className="payments-error"
                    style={{ marginTop: 0, marginBottom: 12 }}
                  >
                    {formError}
                  </div>
                )}
                <div className="payments-form-group">
                  <label>Mã phiếu</label>
                  <input
                    type="text"
                    value={
                      autoVoucherLoading
                        ? "Đang tạo mã phiếu..."
                        : autoVoucherCode || "Chưa tạo được mã phiếu"
                    }
                    disabled
                    className="payments-form-input"
                  />
                  {autoVoucherError && (
                    <span className="payments-form-error">
                      {autoVoucherError}
                    </span>
                  )}
                </div>

                <div className="payments-form-group">
                  <label>Tiêu đề *</label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) => {
                      setCreateForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }));
                      if (createErrors.title) {
                        setCreateErrors((prev) => ({ ...prev, title: "" }));
                      }
                    }}
                    className="payments-form-input"
                    placeholder="Nhập tiêu đề phiếu chi"
                  />
                  {createErrors.title && (
                    <span className="payments-form-error">
                      {createErrors.title}
                    </span>
                  )}
                </div>

                <div className="payments-form-group">
                  <label>Số tiền *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={createForm.amount}
                    onChange={(e) => {
                      setCreateForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }));
                      if (createErrors.amount) {
                        setCreateErrors((prev) => ({ ...prev, amount: "" }));
                      }
                    }}
                    className="payments-form-input"
                    placeholder="Nhập số tiền"
                  />
                  {createErrors.amount && (
                    <span className="payments-form-error">
                      {createErrors.amount}
                    </span>
                  )}
                </div>

                <div className="payments-form-group">
                  <label>Trạng thái *</label>
                  <select
                    className="payments-form-input"
                    value={createForm.status}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        status: e.target.value as "Unpaid" | "Paid",
                      }))
                    }
                  >
                    <option value="Unpaid">Chưa thanh toán</option>
                    <option value="Paid">Đã thanh toán</option>
                  </select>
                </div>

                <div className="payments-form-group">
                  <label>Ngày tạo</label>
                  <input
                    type="text"
                    value={formatDate(new Date().toISOString())}
                    disabled
                    className="payments-form-input"
                  />
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
                  onClick={closeCreateModal}
                  disabled={creating}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="payments-btn-primary"
                  onClick={handleCreateTicket}
                  disabled={
                    creating ||
                    autoVoucherLoading ||
                    !!autoVoucherError ||
                    !autoVoucherCode
                  }
                >
                  {creating ? "Đang tạo..." : "Tạo phiếu"}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedTicket && (
          <div
            className="paychi-modal-overlay"
            onClick={() => setSelectedTicket(null)}
          >
            <div className="paychi-modal" onClick={(e) => e.stopPropagation()}>
              <div className="paychi-modal-header">
                <h3>Chi tiết phiếu chi</h3>
                <button
                  type="button"
                  className="paychi-modal-close"
                  onClick={() => setSelectedTicket(null)}
                >
                  ✕
                </button>
              </div>

              <div className="paychi-modal-body">
                <div className="paychi-detail-row">
                  <span className="paychi-detail-label">Mã phiếu</span>
                  <span className="paychi-detail-value">
                    {selectedTicket.paymentVoucher || "-"}
                  </span>
                </div>
                <div className="paychi-detail-row">
                  <span className="paychi-detail-label">Tiêu đề</span>
                  <span className="paychi-detail-value">
                    {selectedTicket.title}
                  </span>
                </div>
                <div className="paychi-detail-row">
                  <span className="paychi-detail-label">Số tiền</span>
                  <span className="paychi-detail-value">
                    {formatCurrency(selectedTicket.amount)} VNĐ
                  </span>
                </div>
                <div className="paychi-detail-row">
                  <span className="paychi-detail-label">Ngày tạo</span>
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
                      Ngày kế toán thanh toán
                    </span>
                    <span className="paychi-detail-value">
                      {formatDate(selectedTicket.accountantPaidAt)}
                    </span>
                  </div>
                )}
                <div className="paychi-detail-row paychi-detail-row--column">
                  <span className="paychi-detail-label">Trạng thái</span>
                  <div className="paychi-detail-value paychi-detail-status">
                    <select
                      className="paychi-status-select"
                      value={toUiStatus(selectedTicket.status)}
                      onChange={(e) =>
                        handleChangeStatus(
                          selectedTicket._id,
                          e.target.value as UiPaymentStatus,
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

              <div className="paychi-modal-footer">
                {toUiStatus(selectedTicket.status) === "paid" && (
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
        )}
      </div>

      {/* Thanh phân trang đặt ngoài bảng, giống màn phiếu thu/hóa đơn */}
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

import { useCallback, useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { cashFlowService } from "../../../services/cashFlowService";
import "./receiptsList.css";

interface ReceiptTicket {
  _id: string;
  type: "Receipt" | string;
  amount: number;
  title: string;
  status: string;
  transactionDate: string;
  createdAt?: string;
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
      const res = await cashFlowService.getNextReceiptVoucher();
      const code = res?.data?.paymentVoucher;
      if (!code) {
        throw new Error("Không thể tạo mã phiếu thu");
      }
      setAutoVoucherCode(code);
    } catch (err) {
      console.error("Lỗi khi tạo mã phiếu thu:", err);
      setAutoVoucherError("Không thể tạo mã phiếu thu");
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
      const response = await cashFlowService.createManualReceiptTicket({
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
      console.error("Lỗi khi tạo phiếu thu:", err);
      setError("Không thể tạo phiếu thu");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="receipts-page">
      <div className="receipts-card">
        <div className="receipts-header">
          <div>
            <h1>Danh sách phiếu thu</h1>
          </div>
          <div className="receipts-header-actions">
            <button
              type="button"
              className="receipts-create-btn"
              onClick={openCreateModal}
            >
              Tạo phiếu thu
            </button>
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
                        {t.paymentVoucher || "—"}
                      </span>
                    </td>
                    <td>{t.title}</td>
                    <td>{formatCurrency(t.amount)}</td>
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
                      {formatCurrency(selectedTicket.amount)} VNĐ
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

        {showCreateModal && (
          <div className="receipts-modal-overlay" onClick={closeCreateModal}>
            <div
              className="receipts-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="receipts-modal-header receipts-modal-header--detail">
                <h3>Tạo phiếu thu</h3>
                <button
                  type="button"
                  className="receipts-modal-close receipts-modal-close--detail"
                  onClick={closeCreateModal}
                >
                  ✕
                </button>
              </div>

              <div className="receipts-modal-body">
                {formError && (
                  <div
                    className="receipts-error"
                    style={{ marginTop: 0, marginBottom: 12 }}
                  >
                    {formError}
                  </div>
                )}
                <div className="receipts-form-group">
                  <label>Mã phiếu</label>
                  <input
                    type="text"
                    value={
                      autoVoucherLoading
                        ? "Đang tạo mã phiếu..."
                        : autoVoucherCode || "Chưa tạo được mã phiếu"
                    }
                    disabled
                    className="receipts-form-input"
                  />
                  {autoVoucherError && (
                    <span className="receipts-form-error">
                      {autoVoucherError}
                    </span>
                  )}
                </div>

                <div className="receipts-form-group">
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
                    className="receipts-form-input"
                    placeholder="Nhập tiêu đề phiếu thu"
                  />
                  {createErrors.title && (
                    <span className="receipts-form-error">
                      {createErrors.title}
                    </span>
                  )}
                </div>

                <div className="receipts-form-group">
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
                    className="receipts-form-input"
                    placeholder="Nhập số tiền"
                  />
                  {createErrors.amount && (
                    <span className="receipts-form-error">
                      {createErrors.amount}
                    </span>
                  )}
                </div>

                <div className="receipts-form-group">
                  <label>Trạng thái *</label>
                  <select
                    className="receipts-form-input"
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

                <div className="receipts-form-group">
                  <label>Ngày tạo</label>
                  <input
                    type="text"
                    value={formatDate(new Date().toISOString())}
                    disabled
                    className="receipts-form-input"
                  />
                </div>
              </div>

              <div
                className="receipts-modal-footer"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  className="receipts-btn-secondary"
                  onClick={closeCreateModal}
                  disabled={creating}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="receipts-btn-primary"
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
                  {creating ? "Đang tạo..." : "Tạo phiếu"}
                </button>
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

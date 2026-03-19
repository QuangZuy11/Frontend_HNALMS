import api from "./api";

export const cashFlowService = {
  /**
   * Lấy mã phiếu chi kế tiếp theo format PAY-DDMMYYYY-XXXX
   * Backend: GET /financial-tickets/payments/next-voucher
   */
  async getNextPaymentVoucher() {
    const response = await api.get("/financial-tickets/payments/next-voucher");
    return response.data;
  },

  /**
   * Tạo phiếu chi thủ công
   * Backend: POST /financial-tickets/payments
   */
  async createManualPaymentTicket(payload: {
    title: string;
    amount: number;
  }) {
    const response = await api.post("/financial-tickets/payments", payload);
    return response.data;
  },

  /**
   * Lấy danh sách phiếu chi (Payment) được tạo từ hệ thống
   * Backend: GET /financial-tickets/payments
   */
  async getPaymentTickets(params?: {
    from?: string;
    to?: string;
    keyword?: string;
    roomSearch?: string;
  }) {
    const response = await api.get("/financial-tickets/payments", {
      params,
    });
    return response.data;
  },

  async getOwnerPaymentTickets(params?: {
    from?: string;
    to?: string;
    keyword?: string;
  }) {
    const response = await api.get("/financial-tickets/payments/owner", {
      params,
    });
    return response.data;
  },

  /**
   * Lấy danh sách phiếu thu (Receipt) từ hóa đơn phát sinh
   * Backend: GET /invoices/incurred
   */
  async getReceiptTickets(params?: {
    from?: string;
    to?: string;
    status?: "Paid" | "Unpaid";
    type?: "violation" | "repair";
  }) {
    const response = await api.get("/invoices/incurred", {
      params,
    });
    return response.data;
  },

  /**
   * Cập nhật trạng thái phiếu chi (Payment)
   * Backend: PATCH /financial-tickets/:id/status
   */
  async updatePaymentTicketStatus(
    id: string,
    status: "Pending" | "Approved" | "Paid" | "Rejected" | "Unpaid",
    paymentVoucher?: string,
    rejectionReason?: string,
  ) {
    const response = await api.patch(`/financial-tickets/${id}/status`, {
      status,
      paymentVoucher,
      rejectionReason,
    });
    return response.data;
  },
};

export { };

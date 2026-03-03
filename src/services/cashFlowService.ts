import api from "./api";

export const cashFlowService = {
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

  /**
   * Cập nhật trạng thái phiếu chi (Payment)
   * Backend: PATCH /financial-tickets/:id/status
   */
  async updatePaymentTicketStatus(id: string, status: "Paid" | "Unpaid") {
    const response = await api.patch(`/financial-tickets/${id}/status`, {
      status,
    });
    return response.data;
  },
};

export { };

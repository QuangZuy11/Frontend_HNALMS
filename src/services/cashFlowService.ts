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
};

export { };

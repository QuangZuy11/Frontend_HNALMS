import api from './api';

export const moveOutService = {
  // [MANAGER] Lấy danh sách yêu cầu trả phòng
  // GET /api/move-outs/list?status=Requested&page=1&limit=20
  getAllMoveOutRequests: async (filters: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const params: Record<string, string | number> = {};
    if (filters.status) params.status = filters.status;
    if (filters.search && filters.search.trim()) params.search = filters.search.trim();
    if (filters.page !== undefined) params.page = filters.page;
    if (filters.limit !== undefined) params.limit = filters.limit;
    const response = await api.get('/move-outs/list', { params });
    return response.data;
  },

  // [MANAGER] Lấy chi tiết yêu cầu trả phòng
  getMoveOutRequestById: async (requestId: string) => {
    const response = await api.get(`/move-outs/${requestId}`);
    return response.data;
  },

  // [MANAGER] Phát hành hóa đơn cuối – STEP 2
  // PUT /api/move-outs/:id/release-invoice
  // Body: { managerInvoiceNotes, electricIndex, waterIndex }
  releaseFinalInvoice: async (requestId: string, payload?: {
    managerInvoiceNotes?: string;
    electricIndex?: number;
    waterIndex?: number;
  }) => {
    const response = await api.put(`/move-outs/${requestId}/release-invoice`, payload ?? {});
    return response.data;
  },

  // [MANAGER] So sánh cọc vs hóa đơn cuối – STEP 3
  // GET /api/move-outs/:id/deposit-vs-invoice
  getDepositVsInvoice: async (requestId: string) => {
    const response = await api.get(`/move-outs/${requestId}/deposit-vs-invoice`);
    return response.data;
  },

  // [ACCOUNTANT/MANAGER] Xác nhận thanh toán offline – STEP 4b
  // PUT /api/move-outs/:id/confirm-payment-offline
  // Body: { accountantNotes }
  confirmPaymentOffline: async (requestId: string, accountantNotes?: string) => {
    const response = await api.put(`/move-outs/${requestId}/confirm-payment-offline`, { accountantNotes });
    return response.data;
  },

  // [MANAGER] Hoàn tất trả phòng – STEP 5
  // PUT /api/move-outs/:id/complete
  // Body: { managerCompletionNotes }
  completeMoveOutRequest: async (
    requestId: string,
    payload?: {
      managerCompletionNotes?: string;
    }
  ) => {
    const response = await api.put(`/move-outs/${requestId}/complete`, payload ?? {});
    return response.data;
  },

  // [MANAGER/TENANT] Hủy yêu cầu trả phòng
  // DELETE /api/move-outs/:id
  cancelMoveOutRequest: async (requestId: string, reason?: string) => {
    const response = await api.delete(`/move-outs/${requestId}`, { data: { reason } });
    return response.data;
  },
};

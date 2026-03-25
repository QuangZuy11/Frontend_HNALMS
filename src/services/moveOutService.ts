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

  // [MANAGER] Duyệt yêu cầu trả phòng
  // PUT /api/move-outs/:moveOutRequestId/approve
  // Body: { managerApprovalNotes }
  approveMoveOutRequest: async (requestId: string, managerApprovalNotes?: string) => {
    const response = await api.put(`/move-outs/${requestId}/approve`, { managerApprovalNotes });
    return response.data;
  },

  // [MANAGER/TENANT] Hủy yêu cầu trả phòng
  // DELETE /api/move-outs/:moveOutRequestId
  // Body: { reason }
  cancelMoveOutRequest: async (requestId: string, reason?: string) => {
    const response = await api.delete(`/move-outs/${requestId}`, { data: { reason } });
    return response.data;
  },

  // [MANAGER] Hoàn tất trả phòng
  // PUT /api/move-outs/:moveOutRequestId/complete
  // Body: { finalSettlementInvoiceId, managerCompletionNotes }
  completeMoveOutRequest: async (
    requestId: string,
    payload?: {
      finalSettlementInvoiceId?: string;
      managerCompletionNotes?: string;
    }
  ) => {
    const response = await api.put(`/move-outs/${requestId}/complete`, payload ?? {});
    return response.data;
  },
};

import api from './api';

export const moveOutService = {
  // [TENANT] Lấy thông tin hợp đồng khi muốn trả phòng
  // GET /api/move-outs/contract/:contractId/info
  getContractInfo: async (contractId: string) => {
    const response = await api.get(`/move-outs/contract/${contractId}/info`);
    return response.data;
  },

  // [TENANT] Tạo yêu cầu trả phòng
  // POST /api/move-outs
  // Body: { contractId, expectedMoveOutDate, reason }
  createMoveOutRequest: async (payload: {
    contractId: string;
    expectedMoveOutDate: string;
    reason?: string;
  }) => {
    const response = await api.post('/move-outs', payload);
    return response.data;
  },

  // [TENANT] Lấy yêu cầu trả phòng của mình
  // GET /api/move-outs/my/:contractId
  getMyMoveOutRequest: async (contractId: string) => {
    const response = await api.get(`/move-outs/my/${contractId}`);
    return response.data;
  },

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
  // GET /api/move-outs/:moveOutRequestId
  getMoveOutRequestById: async (requestId: string) => {
    const response = await api.get(`/move-outs/${requestId}`);
    return response.data;
  },

  // [MANAGER] Phát hành hóa đơn cuối – STEP 2
  // POST /api/move-outs/:moveOutRequestId/release-invoice
  // Body: { managerInvoiceNotes, electricIndex, waterIndex }
  // Note: electricIndex and waterIndex are optional
  releaseFinalInvoice: async (requestId: string, payload?: {
    managerInvoiceNotes?: string;
    electricIndex?: number;
    waterIndex?: number;
  }) => {
    const response = await api.post(`/move-outs/${requestId}/release-invoice`, payload ?? {});
    return response.data;
  },

  // [SHARED] Lấy danh sách dịch vụ để xác định utility điện/nước
  // GET /api/services
  getUtilityServices: async () => {
    const response = await api.get('/services');
    return response.data;
  },

  // [SHARED] Lấy chỉ số điện/nước gần nhất của phòng
  // GET /api/meter-readings/latest?roomId=...&utilityId=...
  getLatestMeterReading: async (roomId: string, utilityId: string) => {
    const response = await api.get('/meter-readings/latest', {
      params: { roomId, utilityId },
    });
    return response.data;
  },

  // [MANAGER] So sánh cọc vs hóa đơn cuối
  // GET /api/move-outs/:moveOutRequestId/deposit-vs-invoice
  getDepositVsInvoice: async (requestId: string) => {
    const response = await api.get(`/move-outs/${requestId}/deposit-vs-invoice`);
    return response.data;
  },

  // [MANAGER] Kiểm tra trạng thái thanh toán – STEP 4
  // GET /api/move-outs/:moveOutRequestId/check-payment-status
  checkPaymentStatus: async (requestId: string) => {
    const response = await api.get(`/move-outs/${requestId}/check-payment-status`);
    return response.data;
  },

  // [MANAGER] Hoàn tất trả phòng – STEP 5
  // PUT /api/move-outs/:moveOutRequestId/complete
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
};

import api from './api';

export const requestService = {
  // Lấy danh sách yêu cầu sửa chữa (chỉ dành cho Manager)
  getRepairRequests: async (
    roomSearch?: string,
    tenantSearch?: string,
    page?: number,
    limit?: number,
    type?: 'Sửa chữa' | 'Bảo trì'
  ) => {
    const params: {
      roomSearch?: string;
      tenantSearch?: string;
      page?: number;
      limit?: number;
      type?: 'Sửa chữa' | 'Bảo trì';
    } = {};
    if (roomSearch && roomSearch.trim()) {
      params.roomSearch = roomSearch.trim();
    }
    if (tenantSearch && tenantSearch.trim()) {
      params.tenantSearch = tenantSearch.trim();
    }
    if (page !== undefined && page !== null) {
      params.page = page;
    }
    if (limit !== undefined && limit !== null) {
      params.limit = limit;
    }
    if (type) {
      params.type = type;
    }
    const response = await api.get('/requests/repair', { params });
    return response.data;
  },

  // Lấy mã hóa đơn sửa chữa kế tiếp (Manager)
  getNextRepairInvoiceCode: async () => {
    const response = await api.get('/requests/repair/next-invoice-code');
    return response.data;
  },

  // Lấy mã phiếu chi sửa chữa miễn phí kế tiếp (Manager)
  getNextRepairPaymentVoucher: async () => {
    const response = await api.get('/requests/repair/next-payment-voucher');
    return response.data;
  },

  // Lấy mã phiếu chi bảo trì kế tiếp (Manager)
  getNextMaintenancePaymentVoucher: async () => {
    const response = await api.get('/requests/maintenance/next-payment-voucher');
    return response.data;
  },

  // Cập nhật trạng thái yêu cầu sửa chữa
  updateRepairStatus: async (
    requestId: string,
    status: 'Pending' | 'Processing' | 'Done' | 'Unpaid',
    cost?: number,
    notes?: string,
    invoice?: {
      invoiceCode: string;
      title: string;
      totalAmount: number;
      dueDate: string;
    },
    financial?: {
      financialTitle: string;
      financialAmount: number;
      financialType?: 'Payment' | 'Receipt' | string;
      paymentVoucher?: string;
    },
    paymentType?: 'REVENUE' | 'EXPENSE'
  ) => {
    const body: Record<string, unknown> = { status };
    if (status === 'Done') {
      if (cost !== undefined) body.cost = cost;
      if (notes !== undefined) body.notes = notes;
      if (invoice) {
        body.invoiceCode = invoice.invoiceCode;
        body.invoiceTitle = invoice.title;
        body.invoiceTotalAmount = invoice.totalAmount;
        body.invoiceDueDate = invoice.dueDate;
      }
      if (financial) {
        body.financialTitle = financial.financialTitle;
        body.financialAmount = financial.financialAmount;
        if (financial.financialType) {
          body.financialType = financial.financialType;
        }
        if (financial.paymentVoucher) {
          body.paymentVoucher = financial.paymentVoucher;
        }
      }
      if (paymentType !== undefined) {
        body.paymentType = paymentType;
      }
    }
    const response = await api.put(`/requests/repair/${requestId}/status`, body);
    return response.data;
  },
};

// Transfer request API services (Manager only)
export const transferRequestService = {
  
  // Payload khi hoàn tất chuyển phòng
  // transferDate được backend dùng để cập nhật endDate hợp đồng cũ
  // và làm mốc tạo hợp đồng mới.
  
  // ===== MANAGER ENDPOINTS =====

  // [MANAGER] Lấy danh sách tất cả yêu cầu chuyển phòng
  getAllTransferRequests: async (filters: {
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
    const response = await api.get('/requests/transfer', { params });
    return response.data;
  },

  // [MANAGER] Lấy chi tiết yêu cầu chuyển phòng
  getTransferRequestById: async (requestId: string) => {
    const response = await api.get(`/requests/transfer/${requestId}`);
    return response.data;
  },

  // [MANAGER] Duyệt yêu cầu chuyển phòng
  approveTransferRequest: async (requestId: string, managerNote?: string) => {
    const response = await api.patch(`/requests/transfer/${requestId}/approve`, { managerNote });
    return response.data;
  },

  // [MANAGER] Từ chối yêu cầu chuyển phòng
  rejectTransferRequest: async (requestId: string, rejectReason: string) => {
    const response = await api.patch(`/requests/transfer/${requestId}/reject`, { rejectReason });
    return response.data;
  },

  // [MANAGER] Hoàn tất chuyển phòng (Bàn giao phòng)
  completeTransferRequest: async (
    requestId: string,
    payload?: {
      transferDate?: string;
    }
  ) => {
    const response = await api.patch(`/requests/transfer/${requestId}/complete`, payload ?? {});
    return response.data;
  },
};

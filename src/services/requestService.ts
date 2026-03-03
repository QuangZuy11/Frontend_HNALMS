import api from './api';

export const requestService = {
  // Lấy danh sách yêu cầu sửa chữa (chỉ dành cho Manager)
  getRepairRequests: async (
    roomSearch?: string,
    tenantSearch?: string,
    page?: number,
    limit?: number
  ) => {
    const params: {
      roomSearch?: string;
      tenantSearch?: string;
      page?: number;
      limit?: number;
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
    const response = await api.get('/requests/repair', { params });
    return response.data;
  },

  // Lấy mã hóa đơn sửa chữa kế tiếp (Manager)
  getNextRepairInvoiceCode: async () => {
    const response = await api.get('/requests/repair/next-invoice-code');
    return response.data;
  },

  // Cập nhật trạng thái yêu cầu sửa chữa
  updateRepairStatus: async (
    requestId: string,
    status: 'Pending' | 'Processing' | 'Done' | 'Unpair',
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
    },
    paymentType?: 'REVENUE' | 'EXPENSE'
  ) => {
    const body: any = { status };
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
      }
      if (paymentType !== undefined) {
        body.paymentType = paymentType;
      }
    }
    const response = await api.put(`/requests/repair/${requestId}/status`, body);
    return response.data;
  },
};

// Request management API services
export { }

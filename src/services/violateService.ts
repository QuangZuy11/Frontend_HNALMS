import api from "./api";

// Violation interface
export interface Violation {
  _id: string;
  invoiceCode: string;
  type?: 'violation' | 'repair';
  contractId: {
    _id: string;
    contractCode: string;
    roomId: {
      _id: string;
      name: string;
    };
    tenantId: {
      _id: string;
      username: string;
      fullname?: string;
      email: string;
      phoneNumber?: string;
    };
  };
  repairRequestId?: {
    _id: string;
    description: string;
  } | null;
  receiptTicketId?: {
    _id: string;
    type: string;
  } | null;
  title: string;
  totalAmount: number;
  status: 'Paid' | 'Unpaid' | 'Draft';
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  images?: string[];
}

// Create violation payload
export interface CreateViolationPayload {
  contractId: string;
  title: string;
  totalAmount: number;
  dueDate: string;
  invoiceCode?: string;
  images?: string[];
  type?: 'violation' | 'repair';
  status?: 'Draft' | 'Unpaid';
}

export const violateService = {
  /**
   * Lấy danh sách vi phạm (hóa đơn phát sinh)
   * Backend: GET /api/invoices/incurred
   */
  async getViolations(params?: {
    status?: string;
    page?: number;
    limit?: number;
    type?: string;
  }) {
    const response = await api.get('/invoices/incurred', { params });
    return response.data;
  },

  /**
   * Lấy chi tiết vi phạm
   * Backend: GET /api/invoices/incurred/:id
   */
  async getViolationById(id: string) {
    const response = await api.get(`/invoices/incurred/${id}`);
    return response.data;
  },

  /**
   * Tạo vi phạm mới
   * Backend: POST /api/invoices/incurred
   */
  async createViolation(payload: CreateViolationPayload) {
    const response = await api.post('/invoices/incurred', payload);
    return response.data;
  },

  /**
   * Phát hành vi phạm (chuyển từ Draft sang Unpaid)
   * Backend: PUT /api/invoices/incurred/:id/release
   */
  async releaseViolation(id: string) {
    const response = await api.put(`/invoices/incurred/${id}/release`);
    return response.data;
  },

  /**
   * Xác nhận thanh toán vi phạm
   * Backend: PUT /api/invoices/incurred/:id/pay
   */
  async payViolation(id: string, receiptTicketId?: string) {
    const response = await api.put(`/invoices/incurred/${id}/pay`, { receiptTicketId });
    return response.data;
  },

  /**
   * Lấy mã hóa đơn vi phạm tiếp theo
   * Format: VP+DDMMYYYY+XXXX
   */
  async getNextViolationCode() {
    const response = await api.get('/invoices/incurred/next-code');
    return response.data;
  },

  /**
   * Lấy danh sách hợp đồng đang hoạt động (cho việc tạo vi phạm)
   * Backend: GET /api/contracts
   */
  async getActiveContracts() {
    const response = await api.get('/contracts', {
      params: { status: 'Active' }
    });
    return response.data;
  }
};

export default violateService;

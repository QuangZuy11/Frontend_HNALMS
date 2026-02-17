import api from './api';

export const requestService = {
  // Lấy danh sách yêu cầu sửa chữa (chỉ dành cho Manager)
  getRepairRequests: async () => {
    const response = await api.get('/requests/repair');
    return response.data;
  },

  // Cập nhật trạng thái yêu cầu sửa chữa
  updateRepairStatus: async (requestId: string, status: 'Pending' | 'Processing' | 'Done') => {
    const response = await api.put(`/requests/repair/${requestId}/status`, { status });
    return response.data;
  },
};

// Request management API services
export { }

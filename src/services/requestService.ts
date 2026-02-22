import api from './api';

export const requestService = {
  // Lấy danh sách yêu cầu sửa chữa (chỉ dành cho Manager)
  getRepairRequests: async () => {
    const response = await api.get('/requests/repair');
    return response.data;
  },

  // Cập nhật trạng thái yêu cầu sửa chữa
  updateRepairStatus: async (
    requestId: string,
    status: 'Pending' | 'Processing' | 'Done',
    cost?: number,
    notes?: string
  ) => {
    const body: any = { status };
    if (status === 'Done') {
      if (cost !== undefined) body.cost = cost;
      if (notes !== undefined) body.notes = notes;
    }
    const response = await api.put(`/requests/repair/${requestId}/status`, body);
    return response.data;
  },
};

// Request management API services
export { }

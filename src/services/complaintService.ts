import api from './api';

export interface ComplaintListFilters {
  status?: 'Pending' | 'Processing' | 'Done' | 'Rejected';
  category?:
    | 'Tiếng ồn'
    | 'Vệ sinh'
    | 'An ninh'
    | 'Cơ sở vật chất'
    | 'Thái độ phục vụ'
    | 'Khác';
  page?: number;
  limit?: number;
}

export const complaintService = {
  // Lấy danh sách khiếu nại (cho manager dashboard)
  getComplaints: async (filters: ComplaintListFilters = {}) => {
    const { page, limit, ...rest } = filters;
    const response = await api.get('/requests/complaints', {
      params: {
        ...rest,
        page: page ?? 1,
        limit: limit ?? 20,
      },
    });
    return response.data;
  },

  // Cập nhật trạng thái khiếu nại (Pending | Processing | Done | Rejected)
  updateComplaintStatus: async (
    id: string,
    status: 'Pending' | 'Processing' | 'Done' | 'Rejected',
    responseMessage?: string,
    managerNote?: string,
  ) => {
    const body: any = { status };
    if (responseMessage && responseMessage.trim() !== '') {
      body.response = responseMessage.trim();
    }
    if (managerNote && managerNote.trim() !== '') {
      body.managerNote = managerNote.trim();
    }
    const res = await api.put(`/requests/complaints/${id}/status`, body);
    return res.data;
  },
};


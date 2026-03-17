import api from './api';
import {
  NotificationListResponse,
  NotificationSingleResponse,
  NotificationUnreadCountResponse
} from '../types/notification.types';

export interface NotificationListFilters {
  page?: number;
  limit?: number;
  status?: 'draft' | 'sent' | 'archived';
  is_read?: 'true' | 'false';
  search?: string;
  fromDate?: string;
  toDate?: string;
  outbound?: 'true' | 'false';
}

export const notificationService = {
  // ==========================================
  // OWNER APIs
  // ==========================================

  // 1. Lấy danh sách thông báo nháp
  getMyDrafts: async (page = 1, limit = 20): Promise<NotificationListResponse> => {
    const response = await api.get('/notifications/my-drafts', {
      params: { page, limit },
    });
    return response.data;
  },

  // 2. Tạo thông báo nháp mới
  createDraft: async (title: string, content: string): Promise<NotificationSingleResponse> => {
    const response = await api.post('/notifications/draft', { title, content });
    return response.data;
  },

  // 3. Sửa thông báo nháp
  updateDraft: async (id: string, title: string, content: string): Promise<NotificationSingleResponse> => {
    const response = await api.put(`/notifications/draft/${id}`, { title, content });
    return response.data;
  },

  // 4. Xóa thông báo nháp
  deleteDraft: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/notifications/draft/${id}`);
    return response.data;
  },

  // 5. Phát hành thông báo nháp
  publishDraft: async (id: string): Promise<NotificationSingleResponse> => {
    const response = await api.post(`/notifications/draft/${id}/publish`);
    return response.data;
  },

  // ==========================================
  // COMMON APIs (Owner / Manager / Accountant)
  // ==========================================

  // 6. Lấy danh sách thông báo (theo role)
  getMyNotifications: async (filters: NotificationListFilters = {}): Promise<NotificationListResponse> => {
    const { page = 1, limit = 20, ...rest } = filters;
    const response = await api.get('/notifications/my-notifications', {
      params: {
        page,
        limit,
        ...rest,
      },
    });
    return response.data;
  },

  // 7. Lấy số thông báo chưa đọc (chỉ Manager/Accountant, Owner gọi API này sẽ trả về 0)
  getUnreadCount: async (): Promise<NotificationUnreadCountResponse> => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  // ==========================================
  // MANAGER / ACCOUNTANT APIs
  // ==========================================

  // 8. Đánh dấu 1 thông báo là đã đọc
  markAsRead: async (id: string): Promise<NotificationSingleResponse> => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  // 9. Đánh dấu tất cả thông báo là đã đọc
  markAllAsRead: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.patch('/notifications/mark-all-read');
    return response.data;
  },
};

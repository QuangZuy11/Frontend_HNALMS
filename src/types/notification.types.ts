// Notification Types

export interface NotificationRecipient {
  recipient_id: string;
  recipient_role: 'manager' | 'accountant' | 'tenant';
  is_read: boolean;
  read_at: Date | null;
}

export interface Notification {
  _id: string;
  title: string;
  content: string;
  type: 'staff' | 'system' | 'tenant';
  status: 'draft' | 'sent' | 'archived';
  created_by: string;
  recipients: NotificationRecipient[];
  createdAt: string;
  updatedAt: string;
  // For Manager/Accountant view
  is_read?: boolean;
  read_at?: string | null;
}

export interface NotificationPagination {
  current_page: number;
  total_pages: number;
  total_count: number;
  limit: number;
}

export interface NotificationSummary {
  draft_count: number;
  sent_count: number;
}

export interface NotificationListResponse {
  success: boolean;
  message: string;
  data: {
    notifications: Notification[];
    summary?: NotificationSummary;
    pagination: NotificationPagination;
  };
}

export interface NotificationUnreadCountResponse {
  success: boolean;
  message: string;
  data: {
    unread_count: number;
  };
}

export interface NotificationSingleResponse {
  success: boolean;
  message: string;
  data: Notification;
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  owner: 'Chủ nhà',
  manager: 'Quản lý',
  Tenant: 'Người thuê',
  accountant: 'Kế toán',
};

export const STATUS_LABELS: Record<string, string> = {
  active: 'Hoạt động',
  inactive: 'Không hoạt động',
  suspended: 'Tạm khóa',
};

export interface AccountItem {
  _id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  role: string;
  status: string;
  createdAt?: string;
  fullname?: string | null;
  roomName?: string | null;
}

export interface AccountDetail extends AccountItem {
  cccd?: string | null;
  address?: string | null;
  dob?: string | null;
  gender?: string | null;
}

export function formatAccountDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

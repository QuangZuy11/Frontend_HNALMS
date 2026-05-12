export type UserRole = 'admin' | 'manager' | 'owner' | 'tenant' | 'accountant';

export interface User {
  _id?: string; // Primary ID from MongoDB
  user_id?: string; // Legacy support
  id?: string; // For backward compatibility
  email: string;
  username?: string;
  fullname?: string | null;
  role: UserRole;
  status?: string; // e.g., "active"
  avatarURL?: string;
  isactive?: boolean;
  createdAt?: string;
  create_at?: string;
  // UserInfo fields - updated to match backend field names
  cccd?: string | null;
  address?: string | null;
  dob?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  phoneNumber?: string | null;
  phone?: string | null;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  data: User;
}

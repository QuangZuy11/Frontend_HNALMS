export type UserRole = 'admin' | 'manager' | 'owner' | 'tenant' | 'accountant';

export interface User {
  user_id?: string;
  id?: string; // For backward compatibility
  email: string;
  fullname?: string | null;
  role: UserRole;
  username?: string;
  avatarURL?: string;
  isactive?: boolean;
  create_at?: string;
  // UserInfo fields
  citizen_id?: string | null;
  permanent_address?: string | null;
  dob?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  phone?: string | null;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface ProfileResponse {
  success: boolean;
  data: User;
}

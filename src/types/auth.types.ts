export type UserRole = 'admin' | 'manager' | 'owner' | 'tenant' | 'accountant';

export interface User {
  id: string;
  email: string;
  fullname: string;
  role: UserRole;
  username?: string;
  avatarURL?: string;
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

export type UserRole = 'admin' | 'investigator' | 'officer';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

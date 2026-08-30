import { apiClient } from '@/lib/api';
import type { LoginFormData, SignupFormData } from '../schemas';
import type { UserSession } from '@/context/auth-context';

export interface AuthResponse {
  success: boolean;
  accessToken?: string;
  user: UserSession;
}

export const authApi = {
  async login(credentials: LoginFormData): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return data;
  },

  async signup(credentials: SignupFormData): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/signup', {
      name: credentials.name,
      email: credentials.email,
      password: credentials.password,
    });
    return data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
};

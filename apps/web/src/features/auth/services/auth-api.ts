import { apiClient } from '@/lib/api';
import type { LoginFormValues, SignupFormValues } from '../schemas';
import type { UserSession } from '@/context/auth-context';

export interface AuthResponse {
  success: boolean;
  accessToken?: string;
  user: UserSession;
}

export const authApi = {
  async login(credentials: LoginFormValues): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return data;
  },

  async signup(credentials: SignupFormValues): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/signup', {
      storeName: credentials.storeName,
      email: credentials.email,
      password: credentials.password,
      name: credentials.storeName,
    });
    return data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
};

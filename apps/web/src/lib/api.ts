import axios, { AxiosError } from 'axios';

/** Session tokens and refresh stay on the server behind HttpOnly cookies. */
export const apiClient = axios.create({ baseURL: '/api/backend', withCredentials: true, timeout: 30_000 });
apiClient.interceptors.response.use((response) => response, (error: AxiosError) => {
  if (error.response?.status === 401 && typeof window !== 'undefined' && !error.config?.url?.match(/^\/auth\/(login|signup|me)$/)) {
    window.dispatchEvent(new Event('dispenco:session-expired'));
  }
  return Promise.reject(error);
});

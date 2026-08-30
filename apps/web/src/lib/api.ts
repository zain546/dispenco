import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Flag and subscribers queue for concurrent requests when token is refreshing
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Bearer token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('dispenco_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Auto-refresh access token on 401 until 30-day refresh token expires
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || '';

    // If the request that failed with 401 is login/signup/refresh itself, do NOT retry -> force logout
    if (
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/signup') ||
      requestUrl.includes('/auth/refresh')
    ) {
      Cookies.remove('dispenco_access_token');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Prevent infinite retry loop for single request
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // If refresh is already in progress, queue this request until refresh finishes
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          },
          reject: (err) => {
            reject(err);
          },
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Attempt silent token refresh via backend /auth/refresh endpoint
      const refreshResponse = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      const newAccessToken = refreshResponse.data?.accessToken;

      if (newAccessToken) {
        // Save new 1-day access token
        Cookies.set('dispenco_access_token', newAccessToken, { expires: 1 });
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } else {
        throw new Error('Refresh response missing access token');
      }
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      Cookies.remove('dispenco_access_token');

      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }

      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);

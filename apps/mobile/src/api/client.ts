import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../auth/tokenStorage';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

/** Refresh token da geçersizse (kalıcı auth hatası) AuthProvider'ın haberdar olması için. */
let onAuthFailure: (() => void) | null = null;
export function setOnAuthFailure(callback: () => void) {
  onAuthFailure = callback;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${process.env.EXPO_PUBLIC_API_URL}/auth/refresh`,
      { refreshToken }
    );
    await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.accessToken;
  } catch {
    await clearTokens();
    onAuthFailure?.();
    return null;
  }
}

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;

      if (newAccessToken) {
        originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';

interface TokenStorage {
  getAccessToken(): string | null;
  setAccessToken(token: string): void;
  getRefreshToken(): string | null;
  setRefreshToken(token: string): void;
  clearTokens(): void;
}

interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}

const tokenStorage: TokenStorage = {
  getAccessToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('uplora_access_token');
  },
  setAccessToken: (token: string) => {
    localStorage.setItem('uplora_access_token', token);
  },
  getRefreshToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('uplora_refresh_token');
  },
  setRefreshToken: (token: string) => {
    localStorage.setItem('uplora_refresh_token', token);
  },
  clearTokens: () => {
    localStorage.removeItem('uplora_access_token');
    localStorage.removeItem('uplora_refresh_token');
    localStorage.removeItem('uplora_workspace_id');
  },
};

function createAPIClient(): AxiosInstance {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });

  let isRefreshing = false;
  let failedQueue: QueueItem[] = [];

  const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token!);
      }
    });
    failedQueue = [];
  };

  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = tokenStorage.getAccessToken();
      const workspaceId =
        typeof window !== 'undefined'
          ? localStorage.getItem('uplora_workspace_id')
          : null;

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (workspaceId && config.headers) {
        config.headers['X-Workspace-Id'] = workspaceId;
      }

      return config;
    },
    (error) => Promise.reject(error),
  );

  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError<{ success: false; error: { code: string; message: string } }>) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return client(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;
        const refreshToken = tokenStorage.getRefreshToken();

        if (!refreshToken) {
          tokenStorage.clearTokens();
          if (typeof window !== 'undefined') window.location.href = '/login';
          return Promise.reject(error);
        }

        try {
          const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;

          tokenStorage.setAccessToken(accessToken);
          if (newRefreshToken) tokenStorage.setRefreshToken(newRefreshToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }

          processQueue(null, accessToken);
          return client(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError as Error, null);
          tokenStorage.clearTokens();
          if (typeof window !== 'undefined') window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    },
  );

  return client;
}

export const apiClient = createAPIClient();

export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    apiClient.get<{ success: boolean; data: T }>(url, { params }).then((r) => r.data.data),
  post: <T>(url: string, data?: unknown) =>
    apiClient.post<{ success: boolean; data: T }>(url, data).then((r) => r.data.data),
  put: <T>(url: string, data?: unknown) =>
    apiClient.put<{ success: boolean; data: T }>(url, data).then((r) => r.data.data),
  patch: <T>(url: string, data?: unknown) =>
    apiClient.patch<{ success: boolean; data: T }>(url, data).then((r) => r.data.data),
  delete: <T>(url: string) =>
    apiClient.delete<{ success: boolean; data: T }>(url).then((r) => r.data.data),
};

export const authStorage = {
  ...tokenStorage,
  setWorkspaceId: (id: string) => {
    if (typeof window !== 'undefined') localStorage.setItem('uplora_workspace_id', id);
  },
  getWorkspaceId: () => (typeof window !== 'undefined' ? localStorage.getItem('uplora_workspace_id') : null),
};

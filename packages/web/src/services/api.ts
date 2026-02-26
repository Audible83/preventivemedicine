const BASE_URL = '/api';

const TOKEN_KEY = 'pm-valet-token';
const REFRESH_KEY = 'pm-valet-refresh';

function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function hasTokens(): boolean {
  return !!getAccessToken();
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const body = await res.json();
      setTokens(body.accessToken, body.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  // On 401, try refreshing the token and retry once
  if (res.status === 401 && token) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newToken = getAccessToken();
      const retryHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
      };
      res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: { ...retryHeaders, ...options?.headers },
      });
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearTokens();
      window.dispatchEvent(new Event('pm-valet-logout'));
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json();
}

async function requestRaw(path: string, options?: RequestInit): Promise<Response> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  if (res.status === 401 && token) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newToken = getAccessToken();
      const retryHeaders: Record<string, string> = {
        ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
      };
      res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: { ...retryHeaders, ...options?.headers },
      });
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearTokens();
      window.dispatchEvent(new Event('pm-valet-logout'));
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res;
}

// ----- Type Definitions -----

export interface User {
  id: string;
  email: string;
  displayName: string;
  dateOfBirth?: string;
  sex?: string;
  heightCm?: number;
  weightKg?: number;
  consentNotifications?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Observation {
  id: string;
  code: string;
  displayName: string;
  category: string;
  value: number | string;
  unit: string;
  effectiveDate: string;
  source?: string;
}

export interface TimelinePoint {
  date: string;
  [key: string]: string | number | undefined;
}

export interface TimelineResponse {
  data: TimelinePoint[];
  categories: string[];
  series: Array<{ key: string; label: string; category: string }>;
}

export interface Recommendation {
  id: string;
  text: string;
  category: string;
  source: string;
  priority: 'low' | 'medium' | 'high';
  citation?: string;
  dismissed?: boolean;
  riskSignal?: string;
  createdAt?: string;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  completed: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  connected: boolean;
  lastSync?: string;
}

// ----- API Client -----

export const api = {
  // Auth
  register: (data: { email: string; password: string; displayName: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  logout: () =>
    request<void>('/auth/logout', { method: 'POST' }),

  refreshToken: (refreshToken: string) =>
    request<AuthResponse>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),

  getMe: () => request<User>('/auth/me'),

  // Profile
  updateProfile: (data: Partial<User>) =>
    request<User>('/users/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Observations
  getObservations: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: Observation[]; total: number }>(`/observations${qs}`);
  },

  createObservation: (data: {
    code: string;
    displayName: string;
    category: string;
    value: number | string;
    unit: string;
    effectiveDate: string;
  }) =>
    request<Observation>('/observations', { method: 'POST', body: JSON.stringify(data) }),

  // Timeline
  getTimeline: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<TimelineResponse>(`/timeline${qs}`);
  },

  getTimelineCompare: (params: Record<string, string>) => {
    const qs = '?' + new URLSearchParams(params).toString();
    return request<any>(`/timeline/compare${qs}`);
  },

  // Recommendations
  getRecommendations: () => request<{ data: Recommendation[] }>('/recommendations'),

  evaluateGuidelines: () =>
    request<{ data: Recommendation[] }>('/recommendations/evaluate', { method: 'POST' }),

  dismissRecommendation: (id: string) =>
    request<void>(`/recommendations/${id}/dismiss`, { method: 'PATCH' }),

  // Upload
  uploadFile: async (file: File): Promise<{ message: string; observations?: number }> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await requestRaw('/upload', {
      method: 'POST',
      body: formData,
    });

    return res.json();
  },

  // Integrations
  getIntegrations: () => request<{ data: Integration[] }>('/integrations'),

  importIntegration: (id: string) =>
    request<{ message: string; observations?: number }>(`/integrations/${id}/import`, {
      method: 'POST',
      body: JSON.stringify({ consent: true }),
    }),

  // Guidelines
  getGuidelines: () => request<any[]>('/guidelines'),

  // Reminders
  getReminders: () => request<{ data: Reminder[] }>('/reminders'),

  checkReminders: () =>
    request<{ data: Reminder[] }>('/reminders/check', { method: 'POST' }),

  completeReminder: (id: string) =>
    request<void>(`/reminders/${id}/complete`, { method: 'PATCH' }),

  // Notifications
  getNotifications: () => request<{ data: Notification[] }>('/notifications'),

  markNotificationRead: (id: string) =>
    request<void>(`/notifications/${id}/read`, { method: 'PATCH' }),

  // Data management
  exportData: async () => {
    const res = await requestRaw('/users/export', { method: 'GET' });
    return res.json();
  },

  deleteData: () => request<void>('/users/data', { method: 'DELETE' }),

  // Health check
  healthCheck: () => request<{ status: string }>('/health'),
};

const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('pm-valet-token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  register: (data: { email: string; password: string; displayName: string }) =>
    request<{ token: string; user: any }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  getMe: () => request<any>('/auth/me'),

  // Profile
  getProfile: () => request<any>('/users/profile'),
  updateProfile: (data: any) => request<any>('/users/profile', { method: 'PATCH', body: JSON.stringify(data) }),

  // Observations
  getObservations: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ data: any[]; total: number }>(`/observations${qs}`);
  },
  createObservation: (data: any) =>
    request<any>('/observations', { method: 'POST', body: JSON.stringify(data) }),

  // Timeline
  getTimeline: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/timeline${qs}`);
  },

  // Recommendations
  getRecommendations: () => request<any>('/recommendations'),
  evaluateGuidelines: () => request<any>('/recommendations/evaluate', { method: 'POST' }),
  dismissRecommendation: (id: string) => request<any>(`/recommendations/${id}/dismiss`, { method: 'PATCH' }),

  // Upload
  uploadFile: async (file: File) => {
    const token = localStorage.getItem('pm-valet-token');
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Upload failed: ${res.status}`);
    }
    return res.json();
  },

  // Data management
  exportData: () => request<any>('/users/export'),
  deleteData: () => request<any>('/users/data', { method: 'DELETE' }),

  // Guidelines
  getGuidelines: () => request<any[]>('/guidelines'),
};

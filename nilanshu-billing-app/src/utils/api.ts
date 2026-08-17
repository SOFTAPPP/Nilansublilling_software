const API_URL = import.meta.env.VITE_API_URL || 'http://72.61.231.155:5004/api';

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const apiClient = {
  get: async (endpoint: string) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (res.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('admin');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.details || errBody.error || `API Error: ${res.statusText}`);
    }
    return res.json();
  },
  post: async (endpoint: string, body: any) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('admin');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.details || errBody.error || `API Error: ${res.statusText}`);
    }
    return res.json();
  },
  put: async (endpoint: string, body: any) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('admin');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.details || errBody.error || `API Error: ${res.statusText}`);
    }
    return res.json();
  },
  delete: async (endpoint: string) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('admin');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.details || errBody.error || `API Error: ${res.statusText}`);
    }
    return res.json();
  },
};

// Helper to check authentication
export const isAuthenticated = () => {
  return sessionStorage.getItem('token') !== null;
};

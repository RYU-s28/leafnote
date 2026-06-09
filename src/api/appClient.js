const AUTH_USER_KEY = 'leafnote_auth_user';
const AUTH_TOKEN_KEY = 'leafnote_auth_token';

const isBrowser = typeof window !== 'undefined';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const parseJsonSafe = async (response) => {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const getToken = () => {
  if (!isBrowser) return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

const setToken = (token) => {
  if (!isBrowser) return;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

const setUser = (user) => {
  if (!isBrowser) return;
  if (user) {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(AUTH_USER_KEY);
  }
};

const toError = (message, status) => {
  const error = new Error(message || 'Request failed');
  error.status = status;
  return error;
};

const apiRequest = async (path, options = {}) => {
  const { method = 'GET', body, auth = true } = options;
  const headers = { Accept: 'application/json' };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw toError('Cannot reach backend API. Start the server or set VITE_API_BASE_URL.');
  }

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw toError(data?.message || response.statusText || 'Request failed', response.status);
  }
  return data;
};

const auth = {
  me: async () => {
    const user = await apiRequest('/auth/me');
    setUser(user);
    return user;
  },

  loginViaEmailPassword: async (email, password) => {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    if (result?.access_token) setToken(result.access_token);
    if (result?.user) setUser(result.user);
    return result?.user;
  },

  loginWithProvider: async (provider, redirectPath = '/') => {
    const result = await apiRequest('/auth/provider', {
      method: 'POST',
      auth: false,
      body: { provider },
    });
    if (result?.access_token) setToken(result.access_token);
    if (result?.user) setUser(result.user);
    if (isBrowser) {
      window.location.href = redirectPath;
    }
  },

  register: async ({ email, password }) => apiRequest('/auth/register', {
    method: 'POST',
    auth: false,
    body: { email, password },
  }),

  verifyOtp: async ({ email, otpCode }) => apiRequest('/auth/verify-otp', {
    method: 'POST',
    auth: false,
    body: { email, otpCode },
  }),

  setToken: (token) => {
    setToken(token);
  },

  resendOtp: async (email) => apiRequest('/auth/resend-otp', {
    method: 'POST',
    auth: false,
    body: { email },
  }),

  resetPasswordRequest: async (email) => apiRequest('/auth/reset-password-request', {
    method: 'POST',
    auth: false,
    body: { email },
  }),

  resetPassword: async ({ resetToken, newPassword }) => apiRequest('/auth/reset-password', {
    method: 'POST',
    auth: false,
    body: { resetToken, newPassword },
  }),

  logout: async (redirectUrl) => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout network errors and clear local session anyway.
    }
    setToken(null);
    setUser(null);
    if (isBrowser && redirectUrl) {
      window.location.href = redirectUrl;
    }
  },

  redirectToLogin: (redirectUrl) => {
    if (!isBrowser) return;
    const next = redirectUrl ? `?from=${encodeURIComponent(redirectUrl)}` : '';
    window.location.href = `/login${next}`;
  },
};

const entities = {
  Notebook: {
    list: async () => apiRequest('/notebooks'),

    filter: async (filter) => {
      if (filter?.id) {
        return apiRequest(`/notebooks/${encodeURIComponent(filter.id)}`);
      }
      return apiRequest('/notebooks');
    },

    create: async (data) => apiRequest('/notebooks', {
      method: 'POST',
      body: data,
    }),

    update: async (id, data) => apiRequest(`/notebooks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: data,
    }),

    delete: async (id) => apiRequest(`/notebooks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  },

  Page: {
    filter: async (filter) => {
      const notebookId = filter?.notebook_id;
      if (!notebookId) return [];
      return apiRequest(`/pages?notebook_id=${encodeURIComponent(notebookId)}`);
    },

    create: async (data) => apiRequest('/pages', {
      method: 'POST',
      body: data,
    }),

    update: async (id, data) => apiRequest(`/pages/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: data,
    }),

    delete: async (id) => apiRequest(`/pages/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  },
};

export const appClient = { auth, entities };
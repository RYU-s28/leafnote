import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { firebaseAuth, firebaseConfigured, googleProvider } from '@/lib/firebase';

const AUTH_USER_KEY = 'leafnote_auth_user';
const GOOGLE_ACCESS_TOKEN_KEY = 'leafnote_google_access_token';

const isBrowser = typeof window !== 'undefined';
const runtimeDefaultApiBase = isBrowser && window.location.hostname.endsWith('github.io')
  ? 'https://leafnote-ht0v.onrender.com/api'
  : '/api';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || runtimeDefaultApiBase).replace(/\/$/, '');

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

const setUser = (user) => {
  if (!isBrowser) return;
  if (user) {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(AUTH_USER_KEY);
  }
};

const getGoogleAccessToken = () => {
  if (!isBrowser) return null;
  return window.localStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);
};

const setGoogleAccessToken = (token) => {
  if (!isBrowser) return;
  if (token) {
    window.localStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
  }
};

const toError = (message, status) => {
  const error = new Error(message || 'Request failed');
  error.status = status;
  return error;
};

const requireFirebase = () => {
  if (!firebaseConfigured || !firebaseAuth) {
    throw toError('Firebase web config is missing. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, and VITE_FIREBASE_PROJECT_ID.');
  }
};

const waitForAuthReady = async () => {
  requireFirebase();
  if (typeof firebaseAuth.authStateReady === 'function') {
    await firebaseAuth.authStateReady();
    return;
  }

  await new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, () => {
      unsubscribe();
      resolve();
    });
  });
};

const getFirebaseIdToken = async () => {
  requireFirebase();
  await waitForAuthReady();
  if (!firebaseAuth.currentUser) return null;
  return firebaseAuth.currentUser.getIdToken();
};

const apiRequest = async (path, options = {}) => {
  const { method = 'GET', body, auth = true, headers: extraHeaders = {} } = options;
  const headers = { Accept: 'application/json', ...extraHeaders };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const idToken = await getFirebaseIdToken();
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }
    const googleAccessToken = getGoogleAccessToken();
    if (googleAccessToken) {
      headers['X-Google-Access-Token'] = googleAccessToken;
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

const syncSession = async (provider = 'firebase') => {
  const result = await apiRequest('/auth/session', {
    method: 'POST',
    body: { provider, appVersion: 'drive-v1' },
  });
  const user = result?.user || result;
  if (user) setUser(user);
  return user;
};

const authApi = {
  me: async () => {
    await waitForAuthReady();
    if (!firebaseAuth.currentUser) {
      throw toError('Not authenticated', 401);
    }
    const user = await apiRequest('/auth/me');
    setUser(user);
    return user;
  },

  loginViaEmailPassword: async () => {
    throw toError('LeafNote now stores notebooks in your Google Drive. Sign in with Google to continue.', 400);
  },

  loginWithProvider: async (provider, redirectPath = '/') => {
    requireFirebase();
    if (provider !== 'google' || !googleProvider) {
      throw toError('Only Google sign-in is supported in the Drive-backed architecture.', 400);
    }

    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    setGoogleAccessToken(credential?.accessToken || null);
    await syncSession('google.com');

    if (isBrowser) {
      window.location.href = redirectPath;
    }
  },

  register: async ({ email, password, displayName }) => {
    requireFirebase();
    const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    return syncSession('password');
  },

  verifyOtp: async () => {
    throw toError('Email OTP verification has been removed. Use Firebase Auth instead.', 410);
  },

  setToken: () => {
    throw toError('Manual token injection is no longer supported.', 410);
  },

  resendOtp: async () => {
    throw toError('Email OTP verification has been removed. Use Firebase Auth instead.', 410);
  },

  resetPasswordRequest: async (email) => {
    requireFirebase();
    await sendPasswordResetEmail(firebaseAuth, email);
    return { ok: true };
  },

  resetPassword: async () => {
    throw toError('Password resets are handled by Firebase email links. Open the reset link from your email to finish the flow.', 410);
  },

  logout: async (redirectUrl) => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout network errors and clear local session anyway.
    }
    if (firebaseAuth) {
      await signOut(firebaseAuth).catch(() => null);
    }
    setGoogleAccessToken(null);
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
        const notebook = await apiRequest(`/notebooks/${encodeURIComponent(filter.id)}`);
        return Array.isArray(notebook) ? notebook : notebook ? [notebook] : [];
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

export const appClient = { auth: authApi, entities };
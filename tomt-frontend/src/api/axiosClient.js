import axios from 'axios';

function resolveApiUrl() {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').trim();
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
}

const API_URL = resolveApiUrl();

// Access tokens live in memory only (never localStorage/sessionStorage - see
// AuthContext.jsx for why). This module keeps a plain reference to the
// current token and a setter the AuthContext calls whenever it changes, so
// every axios request can attach it without every call site needing to know
// about React state.
let currentAccessToken = null;

export function setAccessToken(token) {
  currentAccessToken = token;
}

export function getAccessToken() {
  return currentAccessToken;
}

const apiClient = axios.create({
  baseURL: API_URL,
  // Required so the httpOnly refresh-token cookie is sent to /api/auth/*
  // and can be set/rotated by the backend (see Phase 2, Section 4).
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (currentAccessToken) {
    config.headers.Authorization = `Bearer ${currentAccessToken}`;
  }
  return config;
});

// Single-flight refresh handling: if several requests 401 at the same time
// (e.g. a page that fires multiple calls on mount with an expired token),
// only the FIRST triggers a refresh call; the rest wait on the same promise
// instead of each independently hammering /api/auth/refresh.
let refreshPromise = null;

function performRefresh() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const token = res.data && res.data.accessToken;
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Callback the AuthContext registers so that when a refresh definitively
// fails (refresh token itself expired/invalid), the app can clear state and
// redirect to /login instead of looping forever.
let onRefreshFailure = null;
export function setOnRefreshFailure(callback) {
  onRefreshFailure = callback;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response ? error.response.status : null;

    const isAuthEndpoint =
      originalRequest &&
      typeof originalRequest.url === 'string' &&
      /(?:^|\/)auth\//.test(originalRequest.url);

    // Only attempt a refresh-and-retry once per request, and never for the
    // auth endpoints themselves (login/setup/refresh/reset/status/logout) -
    // a 401 from THOSE means "you are genuinely not authenticated," not
    // "your token expired," so retrying would just loop.
    if (status === 401 && !isAuthEndpoint && originalRequest && !originalRequest._retried) {
      originalRequest._retried = true;
      try {
        const newToken = await performRefresh();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        setAccessToken(null);
        if (onRefreshFailure) onRefreshFailure();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

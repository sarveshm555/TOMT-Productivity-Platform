import apiClient from './axiosClient.js';

/**
 * Thin service layer over src/routes/authRoutes.js on the backend.
 * Every function returns the parsed response body (res.data) or throws the
 * axios error - callers (AuthContext, pages) decide how to present failures.
 */

export function getStatus() {
  return apiClient.get('/auth/status').then((res) => res.data);
}

export function register(username, password) {
  return apiClient.post('/auth/register', { username, password }).then((res) => res.data);
}

export function setupAccount(username, password) {
  return register(username, password);
}

export function login(username, password) {
  return apiClient.post('/auth/login', { username, password }).then((res) => res.data);
}

export function refreshSession() {
  return apiClient.post('/auth/refresh').then((res) => res.data);
}

export function logout() {
  return apiClient.post('/auth/logout').then((res) => res.data);
}

export function resetPassword(username, newPassword, confirmPassword) {
  return apiClient
    .post('/auth/reset-password', { username, newPassword, confirmPassword })
    .then((res) => res.data);
}

export function getMe() {
  return apiClient.get('/auth/me').then((res) => res.data);
}


import apiClient from './axiosClient.js';

export function listNotifications() {
  return apiClient.get('/notifications').then((res) => res.data);
}
export function clearAllNotifications() {
  return apiClient.delete('/notifications').then((res) => res.data);
}

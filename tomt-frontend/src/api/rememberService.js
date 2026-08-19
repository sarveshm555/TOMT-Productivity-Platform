import apiClient from './axiosClient.js';

export function listRememberTasks() {
  return apiClient.get('/remember').then((res) => res.data); // { active, history }
}

export function createRememberTask(payload) {
  return apiClient.post('/remember', payload).then((res) => res.data.task);
}

export function completeRememberTask(id) {
  return apiClient.patch(`/remember/${id}/complete`).then((res) => res.data.task);
}

export function deleteRememberTask(id) {
  return apiClient.delete(`/remember/${id}`).then((res) => res.data);
}

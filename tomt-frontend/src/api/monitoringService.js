import apiClient from './axiosClient.js';

export function listApplyTasks() {
  return apiClient.get('/monitoring/apply').then((res) => res.data.apps);
}
export function createApplyTask(payload) {
  return apiClient.post('/monitoring/apply', payload).then((res) => res.data.app);
}
export function updateApplyTask(id, payload) {
  return apiClient.put(`/monitoring/apply/${id}`, payload).then((res) => res.data.app);
}
export function markApplied(id) {
  return apiClient.patch(`/monitoring/apply/${id}/mark-applied`).then((res) => res.data.app);
}
export function deleteApplyTask(id) {
  return apiClient.delete(`/monitoring/apply/${id}`).then((res) => res.data);
}

export function listOngoingTasks() {
  return apiClient.get('/monitoring/ongoing').then((res) => res.data.tasks);
}
export function createOngoingTask(payload) {
  return apiClient.post('/monitoring/ongoing', payload).then((res) => res.data.task);
}
export function updateOngoingTask(id, payload) {
  return apiClient.put(`/monitoring/ongoing/${id}`, payload).then((res) => res.data.task);
}
export function markDone(id) {
  return apiClient.patch(`/monitoring/ongoing/${id}/mark-done`).then((res) => res.data.task);
}
export function deleteOngoingTask(id) {
  return apiClient.delete(`/monitoring/ongoing/${id}`).then((res) => res.data);
}

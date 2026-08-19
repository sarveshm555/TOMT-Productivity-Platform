import apiClient from './axiosClient.js';

export function listPendingTasks() {
  return apiClient.get('/pending-tasks').then((res) => res.data.tasks);
}
export function createPendingTask(payload) {
  return apiClient.post('/pending-tasks', payload).then((res) => res.data.task);
}
export function completePendingTask(id) {
  return apiClient.patch(`/pending-tasks/${id}/complete`).then((res) => res.data);
}
export function deletePendingTask(id) {
  return apiClient.delete(`/pending-tasks/${id}`).then((res) => res.data);
}
export function moveAllToSchedule() {
  return apiClient.post('/pending-tasks/move-all-to-schedule').then((res) => res.data);
}
export function listPendingTaskHistory() {
  return apiClient.get('/pending-tasks/history').then((res) => res.data.history);
}

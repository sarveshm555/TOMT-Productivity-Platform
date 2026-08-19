import apiClient from './axiosClient.js';

export function listTasks() {
  return apiClient.get('/schedule/tasks').then((res) => res.data.tasks);
}
export function createTask(payload) {
  return apiClient.post('/schedule/tasks', payload).then((res) => res.data.tasks);
}
export function completeTask(id) {
  return apiClient.patch(`/schedule/tasks/${id}/complete`).then((res) => res.data);
}
export function rememberTask(id) {
  return apiClient.patch(`/schedule/tasks/${id}/remember`).then((res) => res.data);
}
export function deleteTask(id) {
  return apiClient.delete(`/schedule/tasks/${id}`).then((res) => res.data);
}
export function clearAllTasks() {
  return apiClient.delete('/schedule/tasks').then((res) => res.data);
}

// Past-pending-tasks section and Schedule History section deliberately
// reuse pendingTaskService.js's endpoints - see scheduleController.js
// comments: both original pages (schedule.html, pending-tasks.html) read
// and wrote the exact same underlying data.
export { listPendingTasks, deletePendingTask } from './pendingTaskService.js';
export { listPendingTaskHistory as listScheduleHistory } from './pendingTaskService.js';

// The "Remember" button's active-state check needs the current active
// Remember Block list - reuses rememberService.js rather than duplicating
// a fetch.
export { listRememberTasks } from './rememberService.js';

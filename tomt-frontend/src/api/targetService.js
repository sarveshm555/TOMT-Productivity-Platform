import apiClient from './axiosClient.js';

export function listTargets() {
  return apiClient.get('/targets').then((res) => res.data.targets);
}

export function createTarget(payload) {
  return apiClient.post('/targets', payload).then((res) => res.data.target);
}

export function updateTarget(id, payload) {
  return apiClient.put(`/targets/${id}`, payload).then((res) => res.data.target);
}

export function deleteTarget(id) {
  return apiClient.delete(`/targets/${id}`).then((res) => res.data);
}

import apiClient from './axiosClient.js';

export function getConfig(type) {
  return apiClient.get(`/routines/${type}/config`).then((res) => res.data.queries);
}
export function addConfigQuery(type, payload) {
  return apiClient.post(`/routines/${type}/config`, payload).then((res) => res.data.queries);
}
export function deleteConfigQuery(type, queryId) {
  return apiClient.delete(`/routines/${type}/config/${queryId}`).then((res) => res.data.queries);
}

export function listHistory(type) {
  return apiClient.get(`/routines/${type}/history`).then((res) => res.data.history);
}
export function createHistoryEntry(type, data) {
  return apiClient.post(`/routines/${type}/history`, { data }).then((res) => res.data.entry);
}
export function deleteHistoryEntry(type, id) {
  return apiClient.delete(`/routines/${type}/history/${id}`).then((res) => res.data);
}

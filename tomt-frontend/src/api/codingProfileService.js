import apiClient from './axiosClient.js';

function toFormData({ name, link, password, totalProblems, logoFile }) {
  const fd = new FormData();
  fd.append('name', name);
  fd.append('link', link);
  fd.append('password', password || '');
  fd.append('totalProblems', totalProblems ?? 0);
  if (logoFile) fd.append('logo', logoFile);
  return fd;
}

export function listCodingProfiles() {
  return apiClient.get('/placement/coding-profiles').then((res) => res.data.profiles);
}
export function getCodingProfile(id) {
  return apiClient.get(`/placement/coding-profiles/${id}`).then((res) => res.data.profile);
}
export function createCodingProfile(payload) {
  return apiClient
    .post('/placement/coding-profiles', toFormData(payload), { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((res) => res.data.profile);
}
export function updateCodingProfile(id, payload) {
  return apiClient
    .put(`/placement/coding-profiles/${id}`, toFormData(payload), { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((res) => res.data.profile);
}
export function deleteCodingProfile(id) {
  return apiClient.delete(`/placement/coding-profiles/${id}`).then((res) => res.data);
}

export function listLogs(profileId) {
  return apiClient.get(`/placement/coding-profiles/${profileId}/logs`).then((res) => res.data.logs);
}
export function createLog(profileId, payload) {
  return apiClient.post(`/placement/coding-profiles/${profileId}/logs`, payload).then((res) => res.data.log);
}
export function updateLog(profileId, logId, payload) {
  return apiClient.put(`/placement/coding-profiles/${profileId}/logs/${logId}`, payload).then((res) => res.data.log);
}
export function deleteLog(profileId, logId) {
  return apiClient.delete(`/placement/coding-profiles/${profileId}/logs/${logId}`).then((res) => res.data);
}

import apiClient from './axiosClient.js';

export function listProfileLinks() {
  return apiClient.get('/placement/links').then((res) => res.data.links);
}
export function createProfileLink(payload) {
  return apiClient.post('/placement/links', payload).then((res) => res.data.link);
}
export function deleteProfileLink(id) {
  return apiClient.delete(`/placement/links/${id}`).then((res) => res.data);
}

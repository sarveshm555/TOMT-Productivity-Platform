import apiClient from './axiosClient.js';

export function listInternships() {
  return apiClient.get('/placement/internships').then((res) => res.data.internships);
}
export function createInternship(payload) {
  return apiClient.post('/placement/internships', payload).then((res) => res.data.internship);
}
export function updateInternship(id, payload) {
  return apiClient.put(`/placement/internships/${id}`, payload).then((res) => res.data.internship);
}
export function updateInternshipStatus(id, status, mistakeMessage) {
  return apiClient.patch(`/placement/internships/${id}/status`, { status, mistakeMessage }).then((res) => res.data.internship);
}
export function deleteInternship(id) {
  return apiClient.delete(`/placement/internships/${id}`).then((res) => res.data);
}

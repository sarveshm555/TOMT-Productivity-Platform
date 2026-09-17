import apiClient from './axiosClient.js';

export function listInternships() {
  return apiClient.get('/placement/internships').then((res) => res.data.internships);
}

export function getInternship(id) {
  return apiClient.get(`/placement/internships/${id}`).then((res) => res.data.internship);
}

export function createInternship(payload) {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
  const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
  return apiClient.post('/placement/internships', payload, config).then((res) => res.data.internship);
}

export function updateInternship(id, payload) {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
  const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
  return apiClient.put(`/placement/internships/${id}`, payload, config).then((res) => res.data.internship);
}

export function updateInternshipStatus(id, status, mistakeMessage) {
  return apiClient.patch(`/placement/internships/${id}/status`, { status, mistakeMessage }).then((res) => res.data.internship);
}

export function deleteInternship(id) {
  return apiClient.delete(`/placement/internships/${id}`).then((res) => res.data);
}

export function addMessage(id, text) {
  return apiClient.post(`/placement/internships/${id}/messages`, { text }).then((res) => res.data.internship);
}

export function updateMessage(id, messageId, text) {
  return apiClient.put(`/placement/internships/${id}/messages/${messageId}`, { text }).then((res) => res.data.internship);
}

export function deleteMessage(id, messageId) {
  return apiClient.delete(`/placement/internships/${id}/messages/${messageId}`).then((res) => res.data.internship);
}

export function uploadImages(id, files) {
  const fd = new FormData();
  for (const file of files) {
    fd.append('images', file);
  }
  return apiClient.post(`/placement/internships/${id}/images`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data.internship);
}

export function deleteImage(id, imageId) {
  return apiClient.delete(`/placement/internships/${id}/images/${imageId}`).then((res) => res.data.internship);
}

export function getImageUrl(id, imageId) {
  return `/placement/internships/${id}/images/${imageId}`;
}

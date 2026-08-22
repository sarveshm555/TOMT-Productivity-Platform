import apiClient from './axiosClient.js';

function toFormData({ name, link, message, imageFile }) {
  const fd = new FormData();
  fd.append('name', name);
  fd.append('link', link || '');
  fd.append('message', message);
  if (imageFile) fd.append('image', imageFile);
  return fd;
}

export function listSpaceNotes() {
  return apiClient.get('/space-for-you/notes').then((res) => res.data.notes);
}

export function createSpaceNote(payload) {
  return apiClient.post('/space-for-you/notes', toFormData(payload), { headers: { 'Content-Type': 'multipart/form-data' } }).then((res) => res.data.note);
}

export function updateSpaceNote(id, payload) {
  return apiClient.put(`/space-for-you/notes/${id}`, toFormData(payload), { headers: { 'Content-Type': 'multipart/form-data' } }).then((res) => res.data.note);
}

export function deleteSpaceNote(id) {
  return apiClient.delete(`/space-for-you/notes/${id}`).then((res) => res.data);
}

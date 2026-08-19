import apiClient from './axiosClient.js';

function toFormData({ name, link, message, imageFile }) {
  const fd = new FormData();
  fd.append('name', name);
  fd.append('link', link || '');
  fd.append('message', message);
  if (imageFile) fd.append('image', imageFile);
  return fd;
}

export function listNotes() {
  return apiClient.get('/placement/notes').then((res) => res.data.notes);
}
export function createNote(payload) {
  return apiClient.post('/placement/notes', toFormData(payload), { headers: { 'Content-Type': 'multipart/form-data' } }).then((res) => res.data.note);
}
export function updateNote(id, payload) {
  return apiClient.put(`/placement/notes/${id}`, toFormData(payload), { headers: { 'Content-Type': 'multipart/form-data' } }).then((res) => res.data.note);
}
export function deleteNote(id) {
  return apiClient.delete(`/placement/notes/${id}`).then((res) => res.data);
}

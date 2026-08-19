import apiClient from './axiosClient.js';

export function getSettings() {
  return apiClient.get('/diary/settings').then((res) => res.data.settings);
}

/**
 * `updates` may include: textColor, fontFamily, penStyle (strings),
 * bgImage/frontCover/backCover (File objects, optional), and
 * clearBgImage/resetFrontCover/resetBackCover ("true", optional) - see
 * diaryController.js's updateSettings() for the exact semantics.
 */
export function updateSettings(updates) {
  const fd = new FormData();
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && value !== null) fd.append(key, value);
  });
  return apiClient.put('/diary/settings', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((res) => res.data.settings);
}

export function listEntries() {
  return apiClient.get('/diary/entries').then((res) => res.data.entries);
}
export function getEntry(id) {
  return apiClient.get(`/diary/entries/${id}`).then((res) => res.data.entry);
}
export function createEntry(content) {
  return apiClient.post('/diary/entries', { content }).then((res) => res.data.entry);
}
export function updateEntry(id, payload) {
  return apiClient.put(`/diary/entries/${id}`, payload).then((res) => res.data.entry);
}
export function deleteEntry(id) {
  return apiClient.delete(`/diary/entries/${id}`).then((res) => res.data);
}

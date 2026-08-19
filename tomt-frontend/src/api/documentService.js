import apiClient from './axiosClient.js';

export function listDocuments() {
  return apiClient.get('/placement/documents').then((res) => res.data.documents);
}

export function uploadDocument(name, file) {
  const fd = new FormData();
  fd.append('name', name);
  fd.append('file', file);
  return apiClient.post('/placement/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((res) => res.data.document);
}

export function deleteDocument(id) {
  return apiClient.delete(`/placement/documents/${id}`).then((res) => res.data);
}

/**
 * GridFS-backed files are served from a JWT-protected endpoint - neither a
 * plain `<a href>` click nor an `<img src>` can attach the Authorization
 * header, so both "view" and "download" fetch the bytes through the
 * authenticated axios client and build a blob URL client-side. This is
 * the same technique AuthenticatedImage.jsx already established for
 * Coding Profile logos, reused here (not reinvented) for arbitrary file
 * types via a direct apiClient call rather than that image-only component.
 */
export function fetchDocumentBlob(id, { download = false } = {}) {
  return apiClient
    .get(`/placement/documents/${id}/file`, { params: download ? { download: 'true' } : undefined, responseType: 'blob' })
    .then((res) => res.data);
}

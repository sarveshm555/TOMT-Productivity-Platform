import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import * as documentService from '../api/documentService.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import './DocumentsPage.css';

/**
 * Ports documents.html exactly - same markup, classes, copy, search-filter,
 * and the mobile-vs-desktop PDF viewing behavior (mobile opens the PDF in
 * a new tab instead of the modal, exactly like the original's
 * `/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)` check).
 *
 * The original converted the uploaded file to a Base64 data URL via
 * FileReader and stored it inline in localStorage; here the file is
 * uploaded as real multipart form data and stored in GridFS (see
 * documentController.js) - view/download fetch the bytes through the
 * authenticated axios client and build a blob URL, since GridFS is behind
 * JWT auth and a plain `<a>`/`<img>` can't attach that header.
 */
export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [docName, setDocName] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('Preview');
  const [modalContent, setModalContent] = useState(null); // { kind: 'image'|'pdf', url: string }

  const [deletingDocId, setDeletingDocId] = useState(null);

  useEffect(() => {
    document.title = 'Life Manager - Document Manager';
  }, []);

  useEffect(() => {
    refresh();
    // Revoke any outstanding blob URL on unmount to avoid leaking memory.
    return () => {
      if (modalContent && modalContent.url) URL.revokeObjectURL(modalContent.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      setDocuments(await documentService.listDocuments());
    } catch (err) {
      setError('Could not load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return documents.filter((d) => d.name.toLowerCase().includes(term));
  }, [documents, searchTerm]);

  function toggleAddForm() {
    setFormVisible((v) => !v);
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) setDocFile(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!docFile) return;

    setUploading(true);
    try {
      const created = await documentService.uploadDocument(docName, docFile);
      setDocuments((prev) => [created, ...prev]);
      setDocName('');
      setDocFile(null);
      e.target.reset();
      setFormVisible(false);
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not upload document.';
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  async function viewDoc(doc) {
    try {
      const blob = await documentService.fetchDocumentBlob(doc.id);
      const url = URL.createObjectURL(blob);

      if (doc.type === 'PDF') {
        // Ported 1:1 from the original's mobile check - some mobile
        // browsers handle in-page PDF viewing poorly, so open a new tab
        // instead of showing the modal.
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
          window.open(url, '_blank');
          return;
        }
        setModalTitle(doc.name);
        setModalContent({ kind: 'pdf', url });
      } else {
        setModalTitle(doc.name);
        setModalContent({ kind: 'image', url });
      }
      setModalOpen(true);
    } catch (err) {
      setError('Could not open document. Please try again.');
    }
  }

  function closeViewer() {
    setModalOpen(false);
    if (modalContent && modalContent.url) URL.revokeObjectURL(modalContent.url);
    setModalContent(null);
  }

  async function downloadDoc(doc) {
    try {
      const blob = await documentService.fetchDocumentBlob(doc.id, { download: true });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Could not download document. Please try again.');
    }
  }

  async function deleteDoc(id) {
    try {
      await documentService.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError('Could not delete document. Please try again.');
    }
  }

  const activeDeletingDoc = documents.find((d) => d.id === deletingDocId);

  return (
    <div className="documents-page-root">
      <div className="app-container">
        <div className="header-actions">
          <Link to="/placement" className="back-button">
            🏠 Dashboard
          </Link>
          <button type="button" className="btn-toggle-add" id="toggle-btn" onClick={toggleAddForm}>
            {formVisible ? '❌ Close' : '➕ Add New'}
          </button>
        </div>

        <h2>📑 Document Manager</h2>

        <div className="search-container">
          <input
            type="text"
            id="search-input"
            placeholder="🔍 Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {error && <div className="documents-error">{error}</div>}

        {formVisible && (
          <div id="document-form-container" style={{ display: 'block' }}>
            <form id="document-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Document Name</label>
                <input type="text" id="doc-name" placeholder="e.g. My Resume" required value={docName} onChange={(e) => setDocName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>File (PDF or Image)</label>
                <input type="file" id="doc-file" accept=".pdf, image/*" required onChange={handleFileChange} />
              </div>
              <button type="submit" style={{ width: '100%' }} className="btn-toggle-add" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </form>
          </div>
        )}

        <ul id="documents-list">
          {loading ? (
            <li style={{ textAlign: 'center', color: '#888', padding: '15px' }}>Loading...</li>
          ) : (
            filtered.map((doc) => (
              <li className="doc-item" key={doc.id}>
                <div>
                  <div className="doc-name">{doc.name}</div>
                  <div className="doc-meta">
                    {doc.type} | {(doc.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <div className="doc-actions">
                  <button type="button" className="action-btn btn-view" onClick={() => viewDoc(doc)}>
                    View
                  </button>
                  <button type="button" className="action-btn btn-download" onClick={() => downloadDoc(doc)}>
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingDocId(doc.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', fontSize: '1.2em' }}
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <div id="doc-viewer-modal" className="modal-backdrop" style={{ display: modalOpen ? 'flex' : 'none' }}>
        <div className="modal-header">
          <span id="modal-title">{modalTitle}</span>
          <button
            type="button"
            onClick={closeViewer}
            style={{ background: 'var(--danger-color)', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '5px' }}
          >
            Close
          </button>
        </div>
        <div id="modal-viewer-content" className="modal-viewer">
          {modalContent && modalContent.kind === 'pdf' && <iframe src={modalContent.url} title="Document preview" />}
          {modalContent && modalContent.kind === 'image' && <img src={modalContent.url} alt={modalTitle} />}
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={deletingDocId !== null}
        title="Delete Document?"
        message="Are you sure you want to permanently delete this document? This action cannot be undone."
        itemPreview={activeDeletingDoc ? `"${activeDeletingDoc.name}"` : null}
        confirmWord="DELETE"
        onClose={() => setDeletingDocId(null)}
        onConfirm={async () => {
          const id = deletingDocId;
          setDeletingDocId(null);
          await deleteDoc(id);
        }}
      />
    </div>
  );
}

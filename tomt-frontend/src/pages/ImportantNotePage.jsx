import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

import * as noteService from '../api/noteService.js';
import apiClient from '../api/axiosClient.js';
import AuthenticatedImage from '../components/AuthenticatedImage.jsx';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import './ImportantNotePage.css';

/**
 * Ports importantnote.html exactly - same markup, classes, copy, 2-line
 * message-snippet truncation, and view/edit/delete behavior. The
 * original's Base64 `currentImageData` is replaced by a real uploaded
 * file (see noteService.js); the edit form's image preview and the view
 * modal's image both fetch the GridFS-backed image through the
 * authenticated axios client (same technique as Coding Profile logos -
 * AuthenticatedImage.jsx is reused directly for the modal, and the same
 * blob-fetch approach is used inline for the form's background-image
 * preview box since that one isn't a plain `<img>`).
 */
export default function ImportantNotePage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [formVisible, setFormVisible] = useState(false);

  const [editId, setEditId] = useState('');
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null); // object URL for the upload-box preview
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalNote, setModalNote] = useState(null);

  const [deletingNoteId, setDeletingNoteId] = useState(null);

  useEffect(() => {
    document.title = 'Life Manager App - Important Note Log';
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  // Lock body scroll when the modal is open
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalOpen]);

  // Revoke any locally-created preview object URL on unmount/replace.
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      setNotes(await noteService.listNotes());
    } catch (err) {
      setError('Could not load notes. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return notes.filter((n) => n.name.toLowerCase().includes(term) || n.message.toLowerCase().includes(term));
  }, [notes, searchTerm]);

  function resetForm() {
    setEditId('');
    setName('');
    setLink('');
    setMessage('');
    setImageFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  function toggleNoteForm() {
    setFormVisible((v) => {
      const next = !v;
      if (!next) resetForm();
      return next;
    });
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: name.trim(), link: link.trim(), message: message.trim(), imageFile };
      if (editId) {
        const updated = await noteService.updateNote(editId, payload);
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      } else {
        const created = await noteService.createNote(payload);
        setNotes((prev) => [created, ...prev]);
      }
      resetForm();
      setFormVisible(false);
    } catch (err) {
      const message2 = (err.response && err.response.data && err.response.data.message) || 'Could not save note.';
      setError(message2);
    } finally {
      setSaving(false);
    }
  }

  function viewNote(note) {
    setModalNote(note);
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setModalNote(null);
  }

  async function editNote(note) {
    setEditId(note.id);
    setName(note.name);
    setLink(note.link || '');
    setMessage(note.message);
    setImageFile(null);

    if (note.imageUrl) {
      try {
        const res = await apiClient.get(note.imageUrl, { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        setPreviewUrl(url);
      } catch (err) {
        setPreviewUrl(null);
      }
    } else {
      setPreviewUrl(null);
    }

    setFormVisible(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteNote(id) {
    try {
      await noteService.deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError('Could not delete note. Please try again.');
    }
  }

  const activeDeletingNote = notes.find((n) => n.id === deletingNoteId);

  return (
    <div className="important-note-page-root">
      <div className="app-container">
        <div className="header-controls">
          <Link to="/placement" className="back-button">
            <span>🏠</span> Dashboard
          </Link>
          <button type="button" className="btn-toggle-form" id="toggle-btn" onClick={toggleNoteForm}>
            {formVisible ? '❌ Close Form' : '➕ Add New Note'}
          </button>
        </div>

        <h2>✨ Inspiration &amp; Important Note Log</h2>

        <div className="search-box">
          <input
            type="text"
            id="search-input"
            placeholder="🔍 Search notes by name or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {error && <div className="important-note-error">{error}</div>}

        {formVisible && (
          <div id="note-form-container" style={{ display: 'block' }}>
            <form id="note-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name / Title</label>
                <input type="text" id="note-name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                  <label>Link (Optional)</label>
                  <input type="url" id="note-link" value={link} onChange={(e) => setLink(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                  <label>Image (Optional)</label>
                  <input type="file" id="note-image-file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                  <div
                    id="image-preview-container"
                    onClick={() => document.getElementById('note-image-file').click()}
                    style={previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined}
                  >
                    {!previewUrl && 'Click to upload image'}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Inspiration / Message</label>
                <textarea id="note-message" rows="4" required value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              <button type="submit" className="btn-submit" id="submit-btn" disabled={saving}>
                {editId ? '💾 Save Changes' : '💾 Save Note'}
              </button>
            </form>
          </div>
        )}

        <ul id="notes-list">
          {loading ? (
            <li style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>Loading...</li>
          ) : filtered.length === 0 ? (
            <li style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>No notes found</li>
          ) : (
            filtered.map((note) => (
              <li className="note-item" key={note.id}>
                <div className="note-details">
                  <div className="note-name">{note.name}</div>
                  <div className="note-message-snippet">{note.message}</div>
                </div>
                <div className="note-actions">
                  <button type="button" className="action-btn btn-view" onClick={() => viewNote(note)}>
                    View
                  </button>
                  <button type="button" className="action-btn btn-view" style={{ background: '#3f404e' }} onClick={() => editNote(note)}>
                    ✏️
                  </button>
                  <button type="button" className="btn-delete" onClick={() => setDeletingNoteId(note.id)}>
                    🗑️
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {modalOpen &&
        modalNote &&
        createPortal(
          <div id="note-modal" className="important-note-modal-backdrop" onClick={closeModal}>
            <div className="important-note-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="important-note-modal-header">
                <h3 className="important-note-modal-title">{modalNote.name}</h3>
                <button type="button" className="important-note-modal-close-btn" onClick={closeModal} title="Close modal">
                  ✕
                </button>
              </div>

              <div className="important-note-modal-body">
                {modalNote.imageUrl && (
                  <div className="important-note-modal-image-wrapper">
                    <AuthenticatedImage src={modalNote.imageUrl} className="modal-image" alt={modalNote.name} />
                  </div>
                )}

                <div className="important-note-modal-field">
                  <label className="important-note-modal-label">💡 Inspiration / Message</label>
                  <div className="important-note-modal-text">{modalNote.message}</div>
                </div>

                {modalNote.link && (
                  <div className="important-note-modal-field">
                    <label className="important-note-modal-label">🔗 Link</label>
                    <a href={modalNote.link} target="_blank" rel="noreferrer" className="important-note-modal-link">
                      {modalNote.link}
                    </a>
                  </div>
                )}

                {modalNote.date && <div className="important-note-modal-date">Saved on: {modalNote.date}</div>}
              </div>

              <div className="important-note-modal-footer">
                <button type="button" className="important-note-modal-footer-close" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <ConfirmDeleteModal
        isOpen={deletingNoteId !== null}
        title="Delete Note?"
        message="Are you sure you want to permanently delete this note? This action cannot be undone."
        itemPreview={activeDeletingNote ? `"${activeDeletingNote.name}"` : null}
        confirmWord="DELETE"
        onClose={() => setDeletingNoteId(null)}
        onConfirm={async () => {
          const id = deletingNoteId;
          setDeletingNoteId(null);
          await deleteNote(id);
        }}
      />
    </div>
  );
}

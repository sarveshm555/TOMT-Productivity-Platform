import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

import * as spaceForYouService from '../api/spaceForYouService.js';
import apiClient from '../api/axiosClient.js';
import AuthenticatedImage from '../components/AuthenticatedImage.jsx';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import './SpaceForYouPage.css';

/**
 * "Space for You" Personal Knowledge & Learning Module
 * - Scoped to authenticated user in MongoDB
 * - Supports Add, View, Edit, Delete, Search, Links, and Image Attachments via GridFS
 * - Portal-rendered full note viewer & universal ConfirmDeleteModal
 */
export default function SpaceForYouPage() {
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
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalNote, setModalNote] = useState(null);

  const [deletingNoteId, setDeletingNoteId] = useState(null);

  useEffect(() => {
    document.title = 'Space for You - Life Manager';
  }, []);

  useEffect(() => {
    refresh();
  }, []);

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

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      setNotes(await spaceForYouService.listSpaceNotes());
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
    setError('');
    try {
      const payload = { name: name.trim(), link: link.trim(), message: message.trim(), imageFile };
      if (editId) {
        const updated = await spaceForYouService.updateSpaceNote(editId, payload);
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      } else {
        const created = await spaceForYouService.createSpaceNote(payload);
        setNotes((prev) => [created, ...prev]);
      }
      resetForm();
      setFormVisible(false);
    } catch (err) {
      const msg = (err.response && err.response.data && err.response.data.message) || 'Could not save note.';
      setError(msg);
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
      await spaceForYouService.deleteSpaceNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError('Could not delete note. Please try again.');
    }
  }

  const activeDeletingNote = notes.find((n) => n.id === deletingNoteId);

  return (
    <div className="space-for-you-page-root">
      <div className="app-container">
        <div className="header-controls">
          <Link to="/hub" className="back-button">
            <span>🏠</span> Back to Dashboard
          </Link>
          <button type="button" className="btn-toggle-form" onClick={toggleNoteForm}>
            {formVisible ? '❌ Close Form' : '➕ Add New Knowledge Note'}
          </button>
        </div>

        <div className="page-header">
          <h2>🌌 Space for You</h2>
          <p className="page-subtitle">Your personal space for learning, thoughts, useful links, and key takeaways.</p>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search your personal notes by title or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {error && <div className="space-for-you-error">{error}</div>}

        {formVisible && (
          <div id="note-form-container">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title / Topic</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. System Architecture Notes, Learning React Hooks, Favorite Articles"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                  <label>Useful Link / URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: '220px' }}>
                  <label>Attachment / Screenshot (Optional)</label>
                  <input
                    type="file"
                    id="space-note-file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                  />
                  <div
                    id="image-preview-container"
                    onClick={() => document.getElementById('space-note-file').click()}
                    style={previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined}
                  >
                    {!previewUrl && '📷 Click to upload image/screenshot'}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Note Details / Things Learned</label>
                <textarea
                  rows="5"
                  required
                  placeholder="Write down key takeaways, code snippets, reflections, or notes..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-submit" disabled={saving}>
                {saving ? '💾 Saving...' : editId ? '💾 Save Changes' : '💾 Save to Space for You'}
              </button>
            </form>
          </div>
        )}

        <ul id="notes-list">
          {loading ? (
            <li style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>Loading your space notes...</li>
          ) : filtered.length === 0 ? (
            <li style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
              {searchTerm ? 'No matching notes found.' : 'Your personal space is empty. Click "+ Add New Knowledge Note" to save your first note!'}
            </li>
          ) : (
            filtered.map((note) => (
              <li className="note-item" key={note.id}>
                <div className="note-details">
                  <div className="note-header-line">
                    <span className="note-name">{note.name}</span>
                    {note.date && <span className="note-date-badge">{note.date}</span>}
                  </div>
                  <div className="note-message-snippet">{note.message}</div>
                  {(note.link || note.imageUrl) && (
                    <div className="note-pills-row">
                      {note.link && <span className="pill-tag">🔗 Link Attached</span>}
                      {note.imageUrl && <span className="pill-tag">📷 Image Attached</span>}
                    </div>
                  )}
                </div>
                <div className="note-actions">
                  <button type="button" className="action-btn btn-view" onClick={() => viewNote(note)}>
                    View
                  </button>
                  <button type="button" className="action-btn btn-edit" onClick={() => editNote(note)}>
                    ✏️ Edit
                  </button>
                  <button type="button" className="btn-delete" title="Delete note" onClick={() => setDeletingNoteId(note.id)}>
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
          <div className="space-for-you-modal-backdrop" onClick={closeModal}>
            <div className="space-for-you-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="space-for-you-modal-header">
                <h3 className="space-for-you-modal-title">{modalNote.name}</h3>
                <button type="button" className="space-for-you-modal-close-btn" onClick={closeModal} title="Close">
                  ✕
                </button>
              </div>

              <div className="space-for-you-modal-body">
                {modalNote.imageUrl && (
                  <div className="space-for-you-modal-image-wrapper">
                    <AuthenticatedImage src={modalNote.imageUrl} alt={modalNote.name} />
                  </div>
                )}

                <div className="space-for-you-modal-field">
                  <label className="space-for-you-modal-label">💡 Note Content / Takeaways</label>
                  <div className="space-for-you-modal-text">{modalNote.message}</div>
                </div>

                {modalNote.link && (
                  <div className="space-for-you-modal-field">
                    <label className="space-for-you-modal-label">🔗 Useful Link</label>
                    <a href={modalNote.link} target="_blank" rel="noreferrer" className="space-for-you-modal-link">
                      {modalNote.link}
                    </a>
                  </div>
                )}

                {modalNote.date && <div className="space-for-you-modal-date">📅 Saved on: {modalNote.date}</div>}
              </div>

              <div className="space-for-you-modal-footer">
                <button type="button" className="space-for-you-modal-footer-close" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <ConfirmDeleteModal
        isOpen={deletingNoteId !== null}
        title="Delete Note from Space for You?"
        message="Are you sure you want to permanently delete this note from your Space for You? This action cannot be undone."
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

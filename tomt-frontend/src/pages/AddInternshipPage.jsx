import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import * as internshipService from '../api/internshipService.js';
import AuthenticatedImage from '../components/AuthenticatedImage.jsx';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import { formatLocalDateTime } from '../utils/dateTimeUtils.js';
import './AddInternshipPage.css';

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function AddInternshipPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [dateApplied, setDateApplied] = useState('');
  const [status, setStatus] = useState('NeedToApply');

  // Track Links State
  const [trackLinks, setTrackLinks] = useState([{ label: '', url: '' }]);

  // Messages State: array of { id?: string, text: string, createdAt?: string, updatedAt?: string }
  const [messages, setMessages] = useState([]);

  // Existing Images (from backend): array of { id, fileName, mimeType, size, url, createdAt }
  const [existingImages, setExistingImages] = useState([]);

  // Staged Images (newly selected files): array of { file: File, previewUrl: string, name: string, size: number }
  const [stagedImages, setStagedImages] = useState([]);

  const [loadingExisting, setLoadingExisting] = useState(Boolean(editId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Delete confirmations
  const [deletingTrackIndex, setDeletingTrackIndex] = useState(null);
  const [deletingMessageIndex, setDeletingMessageIndex] = useState(null);
  const [deletingImageIndex, setDeletingImageIndex] = useState(null); // index in existingImages

  // Lightbox Preview: { url: string, title: string } | null
  const [lightboxDoc, setLightboxDoc] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    document.title = editId ? 'Edit Internship - Life Manager' : 'Add Internship - Life Manager';
  }, [editId]);

  // Clean up staged image object URLs on unmount
  useEffect(() => {
    return () => {
      stagedImages.forEach((img) => {
        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      });
    };
  }, [stagedImages]);

  useEffect(() => {
    if (!editId) {
      setDateApplied(getTodayDateString());
      return;
    }

    let cancelled = false;
    internshipService
      .getInternship(editId)
      .then((app) => {
        if (cancelled) return;
        if (app) {
          setCompany(app.company || '');
          setRole(app.role || '');
          setDateApplied(app.dateApplied || getTodayDateString());
          setStatus(app.status || 'NeedToApply');

          if (Array.isArray(app.trackLinks) && app.trackLinks.length > 0) {
            setTrackLinks(app.trackLinks.map((l) => ({ label: l.label || '', url: l.url || '' })));
          } else {
            setTrackLinks([{ label: '', url: '' }]);
          }

          if (Array.isArray(app.messages) && app.messages.length > 0) {
            setMessages(app.messages.map((m) => ({
              id: m.id,
              text: m.text || '',
              createdAt: m.createdAt,
              updatedAt: m.updatedAt,
            })));
          } else {
            setMessages([]);
          }

          if (Array.isArray(app.images)) {
            setExistingImages(app.images);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the application to edit.');
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [editId]);

  // -------------------------------------------------------------
  // Track Links Handlers
  // -------------------------------------------------------------
  function addTrackLinkRow() {
    setTrackLinks((prev) => [...prev, { label: '', url: '' }]);
  }

  function updateTrackLink(index, field, value) {
    setTrackLinks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function handleRemoveLinkClick(index) {
    const item = trackLinks[index];
    const isBlank = !item.label.trim() && !item.url.trim();
    if (isBlank) {
      setTrackLinks((prev) => prev.filter((_, i) => i !== index));
    } else {
      setDeletingTrackIndex(index);
    }
  }

  function confirmRemoveTrackLink() {
    if (deletingTrackIndex !== null) {
      setTrackLinks((prev) => prev.filter((_, i) => i !== deletingTrackIndex));
      setDeletingTrackIndex(null);
    }
  }

  // -------------------------------------------------------------
  // Messages Handlers
  // -------------------------------------------------------------
  function addMessageRow() {
    setMessages((prev) => [...prev, { text: '', isNew: true }]);
  }

  function updateMessageText(index, text) {
    setMessages((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], text };
      return copy;
    });
  }

  function handleRemoveMessageClick(index) {
    const item = messages[index];
    if (!item || !item.text.trim()) {
      setMessages((prev) => prev.filter((_, i) => i !== index));
    } else {
      setDeletingMessageIndex(index);
    }
  }

  function confirmRemoveMessage() {
    if (deletingMessageIndex !== null) {
      setMessages((prev) => prev.filter((_, i) => i !== deletingMessageIndex));
      setDeletingMessageIndex(null);
    }
  }

  // -------------------------------------------------------------
  // Images Handlers
  // -------------------------------------------------------------
  function handleImageFilesSelect(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newStaged = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    }));

    setStagedImages((prev) => [...prev, ...newStaged]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeStagedImage(index) {
    setStagedImages((prev) => {
      const copy = [...prev];
      const removed = copy.splice(index, 1)[0];
      if (removed && removed.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return copy;
    });
  }

  function confirmRemoveExistingImage() {
    if (deletingImageIndex !== null) {
      setExistingImages((prev) => prev.filter((_, i) => i !== deletingImageIndex));
      setDeletingImageIndex(null);
    }
  }

  // -------------------------------------------------------------
  // Form Submit
  // -------------------------------------------------------------
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const sanitizedLinks = [];
    for (let i = 0; i < trackLinks.length; i++) {
      const item = trackLinks[i];
      const trimmedLabel = item.label ? item.label.trim() : '';
      let trimmedUrl = item.url ? item.url.trim() : '';

      if (!trimmedLabel && !trimmedUrl) {
        continue;
      }

      if (!trimmedUrl) {
        setError(`Track Link #${i + 1} requires a URL.`);
        return;
      }

      if (!/^https?:\/\//i.test(trimmedUrl)) {
        trimmedUrl = 'https://' + trimmedUrl;
      }

      try {
        const parsed = new URL(trimmedUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          setError(`Track Link #${i + 1} must be a valid HTTP or HTTPS URL.`);
          return;
        }
        sanitizedLinks.push({ label: trimmedLabel, url: parsed.href });
      } catch (err) {
        setError(`Track Link #${i + 1} has an invalid URL format.`);
        return;
      }
    }

    const sanitizedMsgs = messages
      .filter((m) => m && typeof m.text === 'string' && m.text.trim().length > 0)
      .map((m) => ({
        id: m.id,
        text: m.text.trim(),
        createdAt: m.createdAt,
      }));

    const formData = new FormData();
    formData.append('company', company.trim());
    formData.append('role', role.trim());
    formData.append('dateApplied', dateApplied);
    formData.append('status', status);
    formData.append('trackLinks', JSON.stringify(sanitizedLinks));
    formData.append('messages', JSON.stringify(sanitizedMsgs));

    if (editId) {
      const keptIds = existingImages.map((img) => img.id).filter(Boolean);
      formData.append('keptImageIds', JSON.stringify(keptIds));
    }

    for (const staged of stagedImages) {
      formData.append('images', staged.file);
    }

    setSubmitting(true);
    try {
      if (editId) {
        await internshipService.updateInternship(editId, formData);
      } else {
        await internshipService.createInternship(formData);
      }
      navigate('/placement/internships');
    } catch (err) {
      const msg = (err.response && err.response.data && err.response.data.message) || 'Could not save application.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingExisting) {
    return (
      <div className="add-internship-page-root">
        <div className="app-container" style={{ textAlign: 'center', padding: '40px' }}>
          <span style={{ color: '#888' }}>Loading application details...</span>
        </div>
      </div>
    );
  }

  const deletingTrackItem = deletingTrackIndex !== null ? trackLinks[deletingTrackIndex] : null;
  const deletingTrackItemName = deletingTrackItem ? `"${deletingTrackItem.label || deletingTrackItem.url}"` : null;

  const deletingMsgItem = deletingMessageIndex !== null ? messages[deletingMessageIndex] : null;
  const deletingMsgPreview = deletingMsgItem ? `"${deletingMsgItem.text.slice(0, 50)}${deletingMsgItem.text.length > 50 ? '...' : ''}"` : null;

  const deletingImgItem = deletingImageIndex !== null ? existingImages[deletingImageIndex] : null;
  const deletingImgPreview = deletingImgItem ? `"${deletingImgItem.fileName}"` : null;

  return (
    <div className="add-internship-page-root">
      <div className="app-container">
        <h2 id="form-title">{editId ? '✏️ Edit Application' : '➕ Add Application'}</h2>
        <form id="add-form" onSubmit={handleSubmit}>
          {/* Main info row */}
          <div className="form-row">
            <div className="form-group">
              <label>Company Name *</label>
              <input type="text" id="company-name" required value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Role Applied For *</label>
              <input type="text" id="role-name" required value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Date Logged *</label>
              <input type="date" id="date-applied" required value={dateApplied} onChange={(e) => setDateApplied(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select id="application-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="NeedToApply">Need To Apply</option>
                <option value="Applied">Applied</option>
                <option value="Interview">Interview</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Track Links Section */}
          <div className="track-links-section">
            <div className="track-links-header">
              <label className="track-links-title">🔗 Track Links (Useful Links for this Application)</label>
              <span className="track-links-subtitle">
                Save ChatGPT chats, company careers pages, job descriptions, assessment links, etc.
              </span>
            </div>

            {trackLinks.map((linkItem, idx) => (
              <div key={idx} className="track-link-row">
                <div className="form-group track-link-label-group">
                  <label>Label (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. ChatGPT, Careers Page, OA Link"
                    value={linkItem.label}
                    onChange={(e) => updateTrackLink(idx, 'label', e.target.value)}
                  />
                </div>
                <div className="form-group track-link-url-group">
                  <label>URL (Required)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={linkItem.url}
                    onChange={(e) => updateTrackLink(idx, 'url', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn-remove-link"
                  title="Remove Link"
                  onClick={() => handleRemoveLinkClick(idx)}
                >
                  🗑️ Remove
                </button>
              </div>
            ))}

            <button type="button" className="btn-add-link-row" onClick={addTrackLinkRow}>
              ➕ Add Another Link
            </button>
          </div>

          {/* Messages Section */}
          <div className="messages-section">
            <div className="messages-header">
              <label className="messages-title">💬 Messages &amp; Updates</label>
              <span className="messages-subtitle">
                Log timeline updates, HR email excerpts, recruiter notes, and interview notes.
              </span>
            </div>

            {messages.length === 0 ? (
              <div style={{ color: '#777', fontSize: '0.88em', padding: '8px 0' }}>
                No messages added yet. Click &quot;+ Add Message&quot; to log notes or updates.
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={msg.id || idx} className="message-card-item">
                  <div className="message-card-top">
                    <span className="message-num-badge">Message #{idx + 1}</span>
                    {msg.createdAt && (
                      <span className="message-date-badge">
                        🕒 {formatLocalDateTime(msg.createdAt)}
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn-remove-link"
                      style={{ padding: '6px 12px', height: 'auto' }}
                      onClick={() => handleRemoveMessageClick(idx)}
                      title="Remove Message"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                  <textarea
                    className="message-textarea"
                    placeholder="Type message or status update (e.g. Received assessment instructions from HR)..."
                    value={msg.text}
                    onChange={(e) => updateMessageText(idx, e.target.value)}
                  />
                </div>
              ))
            )}

            <button type="button" className="btn-add-message" onClick={addMessageRow}>
              ➕ Add Message
            </button>
          </div>

          {/* Images Section */}
          <div className="images-section">
            <div className="images-header">
              <label className="images-title">📷 Images &amp; Screenshots</label>
              <span className="images-subtitle">
                Upload interview confirmations, test scores, job descriptions, or portal screenshots.
              </span>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleImageFilesSelect}
            />

            {existingImages.length === 0 && stagedImages.length === 0 ? (
              <div style={{ color: '#777', fontSize: '0.88em', padding: '8px 0' }}>
                No images attached yet. Click &quot;+ Add Images&quot; to upload screenshots.
              </div>
            ) : (
              <div className="images-grid">
                {/* Existing Images from GridFS */}
                {existingImages.map((img, idx) => (
                  <div key={img.id || idx} className="image-card">
                    <div
                      className="image-thumb-box"
                      title="Click to view full image"
                      onClick={() => setLightboxDoc({ url: img.url, title: img.fileName, isAuth: true })}
                    >
                      <AuthenticatedImage src={img.url} alt={img.fileName} />
                    </div>
                    <div className="image-card-info">
                      <span className="image-card-name" title={img.fileName}>
                        {img.fileName}
                      </span>
                      <span className="image-card-size">{formatBytes(img.size)}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-remove-image"
                      onClick={() => setDeletingImageIndex(idx)}
                      title="Delete Image"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                ))}

                {/* Newly Staged Images */}
                {stagedImages.map((staged, idx) => (
                  <div key={`staged-${idx}`} className="image-card" style={{ borderColor: 'rgba(52, 211, 153, 0.4)' }}>
                    <div
                      className="image-thumb-box"
                      title="Click to preview"
                      onClick={() => setLightboxDoc({ url: staged.previewUrl, title: staged.name, isAuth: false })}
                    >
                      <img src={staged.previewUrl} alt={staged.name} />
                    </div>
                    <div className="image-card-info">
                      <span className="image-card-name" title={staged.name}>
                        {staged.name} (New)
                      </span>
                      <span className="image-card-size">{formatBytes(staged.size)}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-remove-image"
                      onClick={() => removeStagedImage(idx)}
                      title="Remove Staged Image"
                    >
                      ✕ Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="btn-add-images"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              ➕ Add Images
            </button>
          </div>

          {error && <div className="add-internship-error">{error}</div>}

          <div className="btn-row">
            <button type="submit" className="btn btn-add" id="submit-btn" disabled={submitting}>
              {submitting ? '💾 Saving...' : editId ? '💾 Save Changes' : '➕ Add Application'}
            </button>
            <Link to="/placement/internships" className="btn btn-back">
              Cancel
            </Link>
          </div>
        </form>
      </div>

      {/* Lightbox Modal */}
      {lightboxDoc &&
        createPortal(
          <div className="internship-lightbox-backdrop" onClick={() => setLightboxDoc(null)}>
            <div className="internship-lightbox-card" onClick={(e) => e.stopPropagation()}>
              <div className="internship-lightbox-header">
                <span className="internship-lightbox-title">{lightboxDoc.title}</span>
                <button
                  type="button"
                  className="internship-lightbox-close"
                  onClick={() => setLightboxDoc(null)}
                  title="Close preview"
                >
                  ✕
                </button>
              </div>
              <div className="internship-lightbox-body">
                {lightboxDoc.isAuth ? (
                  <AuthenticatedImage src={lightboxDoc.url} alt={lightboxDoc.title} />
                ) : (
                  <img src={lightboxDoc.url} alt={lightboxDoc.title} />
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Track Link Delete Confirm */}
      <ConfirmDeleteModal
        isOpen={deletingTrackIndex !== null}
        title="Delete Track Link?"
        message="Are you sure you want to remove this Track Link? This action cannot be undone."
        itemPreview={deletingTrackItemName}
        confirmWord="DELETE"
        onClose={() => setDeletingTrackIndex(null)}
        onConfirm={confirmRemoveTrackLink}
      />

      {/* Message Delete Confirm */}
      <ConfirmDeleteModal
        isOpen={deletingMessageIndex !== null}
        title="Delete Message?"
        message="Are you sure you want to remove this message? This action cannot be undone."
        itemPreview={deletingMsgPreview}
        confirmWord="DELETE"
        onClose={() => setDeletingMessageIndex(null)}
        onConfirm={confirmRemoveMessage}
      />

      {/* Existing Image Delete Confirm */}
      <ConfirmDeleteModal
        isOpen={deletingImageIndex !== null}
        title="Delete Image Attachment?"
        message="Are you sure you want to remove this image from the application? It will be deleted upon saving."
        itemPreview={deletingImgPreview}
        confirmWord="DELETE"
        onClose={() => setDeletingImageIndex(null)}
        onConfirm={confirmRemoveExistingImage}
      />
    </div>
  );
}



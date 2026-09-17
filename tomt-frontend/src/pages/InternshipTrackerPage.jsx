import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';

import * as internshipService from '../api/internshipService.js';
import AuthenticatedImage from '../components/AuthenticatedImage.jsx';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import { formatLocalDateTime } from '../utils/dateTimeUtils.js';
import './InternshipTrackerPage.css';

const FILTERS = ['All', 'NeedToApply', 'Applied', 'Interview', 'Offer', 'Rejected'];
const FILTER_LABELS = {
  All: 'All',
  NeedToApply: 'Need To Apply',
  Applied: 'Applied',
  Interview: 'Interview',
  Offer: 'Offer',
  Rejected: 'Rejected',
};

function getStatusColor(status) {
  switch (status) {
    case 'Offer':
      return 'var(--success-color)';
    case 'Rejected':
      return 'var(--danger-color)';
    case 'Applied':
      return 'var(--applied-color)';
    default:
      return '#ff9800';
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Ports internship-tracker.html - same markup, classes, copy,
 * filter/search behavior, and reject-analysis modal.
 * Sorted strictly by newest entry/creation date to oldest.
 */
export default function InternshipTrackerPage() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [currentFilter, setCurrentFilter] = useState('All');

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [activeRejectId, setActiveRejectId] = useState(null);
  const [mistakeInput, setMistakeInput] = useState('');

  const [deletingAppId, setDeletingAppId] = useState(null);
  const [activeTrackApp, setActiveTrackApp] = useState(null);
  const [deletingTrackLinkIndex, setDeletingTrackLinkIndex] = useState(null);

  // Messages modal & inline actions state
  const [activeMessagesApp, setActiveMessagesApp] = useState(null);
  const [newInlineMsg, setNewInlineMsg] = useState('');
  const [isSubmittingMsg, setIsSubmittingMsg] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingMsgText, setEditingMsgText] = useState('');
  const [isSavingMsgEdit, setIsSavingMsgEdit] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState(null);

  // Images modal & lightbox state
  const [activeImagesApp, setActiveImagesApp] = useState(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState(null);
  const [lightboxDoc, setLightboxDoc] = useState(null);
  const imageUploadInputRef = useRef(null);

  useEffect(() => {
    document.title = 'Internship Tracker - Mobile Responsive';
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      setApps(await internshipService.listInternships());
    } catch (err) {
      setError('Could not load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const sortedApps = useMemo(() => {
    return [...apps].sort((a, b) => {
      // 1. Sort by dateApplied (entry date) descending (newest first)
      const dateA = a.dateApplied ? new Date(a.dateApplied).getTime() : 0;
      const dateB = b.dateApplied ? new Date(b.dateApplied).getTime() : 0;
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      // 2. Sort by record createdAt timestamp descending
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (createdB !== createdA) {
        return createdB - createdA;
      }
      // 3. Fallback to ID descending
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [apps]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return sortedApps.filter((app) => {
      const matchesFilter = currentFilter === 'All' || app.status === currentFilter;
      const matchesSearch =
        (app.company && app.company.toLowerCase().includes(term)) ||
        (app.role && app.role.toLowerCase().includes(term));
      return matchesFilter && matchesSearch;
    });
  }, [sortedApps, search, currentFilter]);

  async function updateStatus(id, status, msg = '') {
    try {
      const updated = await internshipService.updateInternshipStatus(id, status, msg);
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
    } catch (err) {
      setError('Could not update application status. Please try again.');
    }
  }

  function editApp(id) {
    navigate(`/placement/internships/new?edit=${id}`);
  }

  async function deleteApp(id) {
    try {
      await internshipService.deleteInternship(id);
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError('Could not delete application. Please try again.');
    }
  }

  function openTrackModal(app) {
    setActiveTrackApp(app);
    setDeletingTrackLinkIndex(null);
  }

  async function confirmDeleteTrackLink() {
    if (!activeTrackApp || deletingTrackLinkIndex === null) return;
    const indexToRemove = deletingTrackLinkIndex;
    const updatedLinks = (activeTrackApp.trackLinks || []).filter((_, i) => i !== indexToRemove);

    const payload = {
      company: activeTrackApp.company,
      role: activeTrackApp.role,
      dateApplied: activeTrackApp.dateApplied,
      status: activeTrackApp.status,
      trackLinks: updatedLinks,
    };

    try {
      const updatedApp = await internshipService.updateInternship(activeTrackApp.id, payload);
      setApps((prev) => prev.map((a) => (a.id === activeTrackApp.id ? { ...a, ...updatedApp } : a)));
      setActiveTrackApp((prev) => (prev ? { ...prev, ...updatedApp } : null));
    } catch (err) {
      setError('Could not delete track link. Please try again.');
    } finally {
      setDeletingTrackLinkIndex(null);
    }
  }

  function openRejectModal(id) {
    setActiveRejectId(id);
    const targetApp = apps.find((a) => a.id === id);
    setMistakeInput(targetApp && targetApp.mistakeMessage ? targetApp.mistakeMessage : '');
    setRejectModalOpen(true);
  }
  function closeModal() {
    setRejectModalOpen(false);
  }
  function confirmReject() {
    const msg = mistakeInput.trim();
    if (!msg) {
      // eslint-disable-next-line no-alert
      window.alert('Please enter the mistake analysis');
      return;
    }
    updateStatus(activeRejectId, 'Rejected', msg);
    setMistakeInput('');
    closeModal();
  }

  // -------------------------------------------------------------
  // Messages Modal Handlers
  // -------------------------------------------------------------
  async function handleAddModalMessage() {
    if (!activeMessagesApp || !newInlineMsg.trim() || isSubmittingMsg) return;
    setIsSubmittingMsg(true);
    try {
      const updatedApp = await internshipService.addMessage(activeMessagesApp.id, newInlineMsg.trim());
      setApps((prev) => prev.map((a) => (a.id === activeMessagesApp.id ? { ...a, ...updatedApp } : a)));
      setActiveMessagesApp((prev) => (prev ? { ...prev, ...updatedApp } : null));
      setNewInlineMsg('');
    } catch (err) {
      setError('Could not add message. Please try again.');
    } finally {
      setIsSubmittingMsg(false);
    }
  }

  function startEditModalMessage(msg) {
    setEditingMsgId(msg.id || msg._id);
    setEditingMsgText(msg.text || '');
  }

  function cancelEditModalMessage() {
    setEditingMsgId(null);
    setEditingMsgText('');
  }

  async function saveEditModalMessage() {
    if (!activeMessagesApp || !editingMsgId || !editingMsgText.trim() || isSavingMsgEdit) return;
    setIsSavingMsgEdit(true);
    try {
      const updatedApp = await internshipService.updateMessage(activeMessagesApp.id, editingMsgId, editingMsgText.trim());
      setApps((prev) => prev.map((a) => (a.id === activeMessagesApp.id ? { ...a, ...updatedApp } : a)));
      setActiveMessagesApp((prev) => (prev ? { ...prev, ...updatedApp } : null));
      setEditingMsgId(null);
      setEditingMsgText('');
    } catch (err) {
      setError('Could not update message. Please try again.');
    } finally {
      setIsSavingMsgEdit(false);
    }
  }

  async function confirmDeleteModalMessage() {
    if (!activeMessagesApp || !deletingMessageId) return;
    const msgId = deletingMessageId;
    try {
      const updatedApp = await internshipService.deleteMessage(activeMessagesApp.id, msgId);
      setApps((prev) => prev.map((a) => (a.id === activeMessagesApp.id ? { ...a, ...updatedApp } : a)));
      setActiveMessagesApp((prev) => (prev ? { ...prev, ...updatedApp } : null));
    } catch (err) {
      setError('Could not delete message. Please try again.');
    } finally {
      setDeletingMessageId(null);
    }
  }

  // -------------------------------------------------------------
  // Images Modal Handlers
  // -------------------------------------------------------------
  async function handleModalImagesSelect(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !activeImagesApp || isUploadingImages) return;
    setIsUploadingImages(true);
    try {
      const updatedApp = await internshipService.uploadImages(activeImagesApp.id, files);
      setApps((prev) => prev.map((a) => (a.id === activeImagesApp.id ? { ...a, ...updatedApp } : a)));
      setActiveImagesApp((prev) => (prev ? { ...prev, ...updatedApp } : null));
    } catch (err) {
      setError('Could not upload images. Please try again.');
    } finally {
      setIsUploadingImages(false);
      if (imageUploadInputRef.current) {
        imageUploadInputRef.current.value = '';
      }
    }
  }

  async function confirmDeleteModalImage() {
    if (!activeImagesApp || !deletingImageId) return;
    const imgId = deletingImageId;
    try {
      const updatedApp = await internshipService.deleteImage(activeImagesApp.id, imgId);
      setApps((prev) => prev.map((a) => (a.id === activeImagesApp.id ? { ...a, ...updatedApp } : a)));
      setActiveImagesApp((prev) => (prev ? { ...prev, ...updatedApp } : null));
    } catch (err) {
      setError('Could not delete image. Please try again.');
    } finally {
      setDeletingImageId(null);
    }
  }

  const activeDeletingApp = apps.find((a) => a.id === deletingAppId);
  const deletingTrackItem =
    activeTrackApp && deletingTrackLinkIndex !== null && activeTrackApp.trackLinks
      ? activeTrackApp.trackLinks[deletingTrackLinkIndex]
      : null;
  const deletingMessageItem =
    activeMessagesApp && deletingMessageId && activeMessagesApp.messages
      ? activeMessagesApp.messages.find((m) => (m.id || m._id) === deletingMessageId)
      : null;
  const deletingImageItem =
    activeImagesApp && deletingImageId && activeImagesApp.images
      ? activeImagesApp.images.find((img) => (img.id || img._id) === deletingImageId)
      : null;

  return (
    <div className="internship-page-root">
      <div className="app-container">
        <Link to="/placement" className="back-button">
          <span>🏠</span> Back to Dashboard
        </Link>

        <div className="header-section">
          <h2 style={{ color: 'var(--primary-color)', margin: 0 }}>🚀 Application Tracker</h2>
          <Link to="/placement/internships/new" className="btn-nav-add">
            ➕ Add New
          </Link>
        </div>

        <div className="search-box">
          <input
            type="text"
            id="search-input"
            placeholder="Search company or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div id="filter-buttons">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`filter-btn${currentFilter === f ? ' active' : ''}`}
              onClick={() => setCurrentFilter(f)}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {error && <div className="internship-error">{error}</div>}

        <div id="applications-list">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No applications found.</div>
          ) : (
            filtered.map((app) => {
              const linkCount = Array.isArray(app.trackLinks) ? app.trackLinks.length : 0;
              const msgCount = Array.isArray(app.messages) ? app.messages.length : 0;
              const imgCount = Array.isArray(app.images) ? app.images.length : 0;
              return (
                <div className="app-item" key={app.id}>
                  <div>
                    <strong>{app.company}</strong>
                    <br />
                    <small style={{ color: '#888' }}>{app.role}</small>
                  </div>
                  <div style={{ fontSize: '0.85em' }}>📅 {app.dateApplied}</div>
                  <div>
                    <span style={{ fontWeight: 'bold', color: getStatusColor(app.status) }}>{app.status}</span>
                  </div>
                  <div className="item-actions">
                    <div className="action-group">
                      {(app.status === 'Applied' || app.status === 'Interview') && (
                        <div className="action-row action-row-status">
                          <button
                            type="button"
                            className="btn-sm btn-action-success"
                            onClick={() => updateStatus(app.id, 'Offer')}
                            title="Mark as Offer"
                          >
                            Success
                          </button>
                          <button
                            type="button"
                            className="btn-sm btn-action-failed"
                            onClick={() => openRejectModal(app.id)}
                            title="Mark as Failed"
                          >
                            Failed
                          </button>
                        </div>
                      )}
                      <div className="action-row action-row-details">
                        <button
                          type="button"
                          className="btn-sm btn-track"
                          onClick={() => openTrackModal(app)}
                          title="View Track Links"
                        >
                          Track{linkCount > 0 ? ` (${linkCount})` : ''}
                        </button>
                        <button
                          type="button"
                          className="btn-sm btn-messages"
                          onClick={() => {
                            setActiveMessagesApp(app);
                            setEditingMsgId(null);
                            setNewInlineMsg('');
                          }}
                          title="View & Add Messages"
                        >
                          Messages{msgCount > 0 ? ` (${msgCount})` : ''}
                        </button>
                      </div>
                      <div className="action-row action-row-media">
                        <button
                          type="button"
                          className="btn-sm btn-images"
                          onClick={() => setActiveImagesApp(app)}
                          title="View & Upload Images"
                        >
                          Images{imgCount > 0 ? ` (${imgCount})` : ''}
                        </button>
                      </div>
                      <div className="action-row action-row-manage">
                        <button
                          type="button"
                          className="btn-sm btn-edit"
                          onClick={() => editApp(app.id)}
                          title="Edit Application"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="btn-sm btn-delete"
                          onClick={() => setDeletingAppId(app.id)}
                          title="Delete Application"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                  {app.mistakeMessage && (
                    <div className="mistake-tag">
                      <strong>🚨 Mistake Analysis:</strong> {app.mistakeMessage}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div id="reject-modal" className="modal" style={{ display: rejectModalOpen ? 'flex' : 'none' }}>
        <div className="modal-content">
          <h3 style={{ color: 'var(--danger-color)', marginTop: 0 }}>🚨 Failure Analysis</h3>
          <p>Describe what went wrong/learning point:</p>
          <textarea
            id="mistake-input"
            rows="4"
            placeholder="Don't change your destination. Just change your path."
            style={{ width: '100%', background: '#000', color: 'white', borderRadius: '5px', padding: '10px', border: '1px solid #333' }}
            value={mistakeInput}
            onChange={(e) => setMistakeInput(e.target.value)}
          />
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button type="button" className="btn-sm" style={{ background: 'var(--danger-color)', flex: 1, padding: '10px' }} onClick={confirmReject}>
              Save Analysis
            </button>
            <button type="button" className="btn-sm" style={{ background: '#444', flex: 1 }} onClick={closeModal}>
              Cancel
            </button>
          </div>
        </div>
      </div>

      {activeTrackApp && (
        <div className="modal track-links-modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-content track-modal-card">
            <div className="track-modal-header">
              <h3 style={{ color: '#ff9800', margin: 0 }}>
                🔗 Track Links - {activeTrackApp.company}
              </h3>
              <div style={{ color: '#aaa', fontSize: '0.88em', marginTop: '2px' }}>{activeTrackApp.role}</div>
            </div>

            <div className="track-modal-body">
              {!activeTrackApp.trackLinks || activeTrackApp.trackLinks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#888' }}>
                  No track links saved for this application yet.
                </div>
              ) : (
                <div className="track-links-list">
                  {activeTrackApp.trackLinks.map((link, idx) => (
                    <div key={idx} className="track-link-item">
                      <div className="track-link-info">
                        <span className="track-link-icon">🔗</span>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="track-link-anchor"
                          title={link.url}
                        >
                          {link.label ? link.label : link.url}
                        </a>
                      </div>
                      <button
                        type="button"
                        className="btn-sm btn-delete-track-link"
                        onClick={() => setDeletingTrackLinkIndex(idx)}
                        title="Delete Track Link"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="track-modal-footer">
              <button
                type="button"
                className="btn-sm"
                style={{ background: '#ff9800', color: '#fff' }}
                onClick={() => {
                  const id = activeTrackApp.id;
                  setActiveTrackApp(null);
                  editApp(id);
                }}
              >
                ✏️ Manage / Add Links
              </button>
              <button
                type="button"
                className="btn-sm"
                style={{ background: '#444' }}
                onClick={() => setActiveTrackApp(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Modal */}
      {activeMessagesApp && (
        <div className="modal detail-modal-overlay" style={{ display: 'flex' }} onClick={() => setActiveMessagesApp(null)}>
          <div className="modal-content detail-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="detail-modal-header">
              <div>
                <h3 className="detail-modal-title" style={{ color: '#38bdf8' }}>
                  💬 Messages & Notes - {activeMessagesApp.company}
                </h3>
                <div className="detail-modal-subtitle">{activeMessagesApp.role}</div>
              </div>
              <button
                type="button"
                className="detail-modal-close-icon"
                onClick={() => setActiveMessagesApp(null)}
                title="Close"
              >
                ✖
              </button>
            </div>

            <div className="detail-modal-body">
              {!activeMessagesApp.messages || activeMessagesApp.messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#888' }}>
                  No messages or notes added for this application yet.
                </div>
              ) : (
                activeMessagesApp.messages.map((msg, idx) => {
                  const mId = msg.id || msg._id || idx;
                  const isEditing = editingMsgId === mId;
                  return (
                    <div key={mId} className="tracker-message-item">
                      <div className="tracker-message-top">
                        <span className="tracker-message-date">
                          📅 {msg.createdAt ? formatLocalDateTime(msg.createdAt) : 'Just now'}
                          {msg.updatedAt && msg.updatedAt !== msg.createdAt && (
                            <span style={{ fontStyle: 'italic', opacity: 0.7 }}> (edited)</span>
                          )}
                        </span>
                        {!isEditing && (
                          <div className="tracker-message-actions">
                            <button
                              type="button"
                              className="btn-sm"
                              style={{ background: '#1e293b', color: '#38bdf8', padding: '3px 7px' }}
                              onClick={() => startEditModalMessage(msg)}
                              title="Edit Message"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn-sm"
                              style={{ background: '#1e293b', color: '#ef4444', padding: '3px 7px' }}
                              onClick={() => setDeletingMessageId(mId)}
                              title="Delete Message"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="tracker-inline-edit-box">
                          <textarea
                            className="tracker-inline-textarea"
                            rows="3"
                            value={editingMsgText}
                            onChange={(e) => setEditingMsgText(e.target.value)}
                            disabled={isSavingMsgEdit}
                          />
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn-sm"
                              style={{ background: '#0284c7' }}
                              onClick={saveEditModalMessage}
                              disabled={isSavingMsgEdit || !editingMsgText.trim()}
                            >
                              {isSavingMsgEdit ? 'Saving...' : '💾 Save'}
                            </button>
                            <button
                              type="button"
                              className="btn-sm"
                              style={{ background: '#444' }}
                              onClick={cancelEditModalMessage}
                              disabled={isSavingMsgEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="tracker-message-text">{msg.text}</div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Quick Add Message */}
              <div className="tracker-add-message-box">
                <span style={{ fontSize: '0.85em', fontWeight: 600, color: '#94a3b8' }}>➕ Quick Add Message:</span>
                <textarea
                  className="tracker-add-message-input"
                  rows="2"
                  placeholder="Type an update, follow-up, recruiter note..."
                  value={newInlineMsg}
                  onChange={(e) => setNewInlineMsg(e.target.value)}
                  disabled={isSubmittingMsg}
                />
                <button
                  type="button"
                  className="btn-sm"
                  style={{ background: '#0284c7', alignSelf: 'flex-end', padding: '7px 14px' }}
                  onClick={handleAddModalMessage}
                  disabled={isSubmittingMsg || !newInlineMsg.trim()}
                >
                  {isSubmittingMsg ? 'Adding...' : '➕ Add Message'}
                </button>
              </div>
            </div>

            <div className="detail-modal-footer">
              <button
                type="button"
                className="btn-sm"
                style={{ background: '#0284c7', color: '#fff' }}
                onClick={() => {
                  const id = activeMessagesApp.id;
                  setActiveMessagesApp(null);
                  editApp(id);
                }}
              >
                ✏️ Full Application Edit
              </button>
              <button
                type="button"
                className="btn-sm"
                style={{ background: '#444' }}
                onClick={() => setActiveMessagesApp(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Images Modal */}
      {activeImagesApp && (
        <div className="modal detail-modal-overlay" style={{ display: 'flex' }} onClick={() => setActiveImagesApp(null)}>
          <div className="modal-content detail-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="detail-modal-header">
              <div>
                <h3 className="detail-modal-title" style={{ color: '#34d399' }}>
                  📷 Images & Screenshots - {activeImagesApp.company}
                </h3>
                <div className="detail-modal-subtitle">{activeImagesApp.role}</div>
              </div>
              <button
                type="button"
                className="detail-modal-close-icon"
                onClick={() => setActiveImagesApp(null)}
                title="Close"
              >
                ✖
              </button>
            </div>

            {/* Hidden file input for quick upload */}
            <input
              type="file"
              ref={imageUploadInputRef}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleModalImagesSelect}
            />

            <div className="detail-modal-body">
              {!activeImagesApp.images || activeImagesApp.images.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#888' }}>
                  No images uploaded for this application yet.
                </div>
              ) : (
                <div className="tracker-images-grid">
                  {activeImagesApp.images.map((img, idx) => {
                    const imgId = String(img.id || img._id || '');
                    const imgUrl = imgId
                      ? `/placement/internships/${activeImagesApp.id}/images/${imgId}`
                      : (img.url || '');
                    return (
                      <div key={imgId || idx} className="tracker-image-card">
                        <div
                          className="tracker-image-thumb"
                          title="Click to view full image"
                          onClick={() => setLightboxDoc({ url: imgUrl, title: img.fileName || 'Application Image' })}
                        >
                          <AuthenticatedImage src={imgUrl} alt={img.fileName || 'Application Screenshot'} />
                        </div>
                        <div className="tracker-image-meta">
                          <span className="tracker-image-name" title={img.fileName}>
                            {img.fileName || `Image ${idx + 1}`}
                          </span>
                          <span className="tracker-image-size">{formatBytes(img.size)}</span>
                        </div>
                        <button
                          type="button"
                          className="btn-tracker-delete-img"
                          onClick={() => setDeletingImageId(imgId)}
                          title="Delete Image"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="detail-modal-footer">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-sm"
                  style={{ background: '#059669', color: '#fff' }}
                  onClick={() => imageUploadInputRef.current && imageUploadInputRef.current.click()}
                  disabled={isUploadingImages}
                >
                  {isUploadingImages ? '⏳ Uploading...' : '📷 Upload Images'}
                </button>
                <button
                  type="button"
                  className="btn-sm"
                  style={{ background: '#1e293b', color: '#94a3b8' }}
                  onClick={() => {
                    const id = activeImagesApp.id;
                    setActiveImagesApp(null);
                    editApp(id);
                  }}
                >
                  ✏️ Full Application Edit
                </button>
              </div>
              <button
                type="button"
                className="btn-sm"
                style={{ background: '#444' }}
                onClick={() => setActiveImagesApp(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
                <AuthenticatedImage src={lightboxDoc.url} alt={lightboxDoc.title} />
              </div>
            </div>
          </div>,
          document.body
        )}

      <ConfirmDeleteModal
        isOpen={deletingAppId !== null}
        title="Delete Application?"
        message="Are you sure you want to permanently delete this application? This action cannot be undone."
        itemPreview={activeDeletingApp ? `"${activeDeletingApp.company} - ${activeDeletingApp.role}"` : null}
        confirmWord="DELETE"
        onClose={() => setDeletingAppId(null)}
        onConfirm={async () => {
          const id = deletingAppId;
          setDeletingAppId(null);
          await deleteApp(id);
        }}
      />

      <ConfirmDeleteModal
        isOpen={deletingTrackLinkIndex !== null}
        title="Delete Track Link?"
        message="Are you sure you want to permanently delete this track link? This action cannot be undone."
        itemPreview={deletingTrackItem ? `"${deletingTrackItem.label || deletingTrackItem.url}"` : null}
        confirmWord="DELETE"
        onClose={() => setDeletingTrackLinkIndex(null)}
        onConfirm={confirmDeleteTrackLink}
      />

      <ConfirmDeleteModal
        isOpen={deletingMessageId !== null}
        title="Delete Message?"
        message="Are you sure you want to permanently delete this message? This action cannot be undone."
        itemPreview={deletingMessageItem ? `"${deletingMessageItem.text}"` : null}
        confirmWord="DELETE"
        onClose={() => setDeletingMessageId(null)}
        onConfirm={confirmDeleteModalMessage}
      />

      <ConfirmDeleteModal
        isOpen={deletingImageId !== null}
        title="Delete Image?"
        message="Are you sure you want to permanently delete this image from storage? This action cannot be undone."
        itemPreview={deletingImageItem ? `"${deletingImageItem.fileName}"` : null}
        confirmWord="DELETE"
        onClose={() => setDeletingImageId(null)}
        onConfirm={confirmDeleteModalImage}
      />
    </div>
  );
}


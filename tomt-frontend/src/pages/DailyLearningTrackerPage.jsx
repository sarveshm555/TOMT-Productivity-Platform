import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';

import * as educationService from '../api/educationService.js';
import AuthenticatedImage from '../components/AuthenticatedImage.jsx';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import './DailyLearningTrackerPage.css';

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  }
  return dateStr;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function isValidHttpUrl(string) {
  if (!string) return true;
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

export default function DailyLearningTrackerPage() {
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [formVisible, setFormVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState('');
  const [learningLink, setLearningLink] = useState('');
  const [topicLearned, setTopicLearned] = useState('');
  const [logDate, setLogDate] = useState(getTodayDateString());
  const [learningsMessage, setLearningsMessage] = useState('');

  // Attachments State for Form
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState([]);
  const [stagedPhotos, setStagedPhotos] = useState([]);
  const [stagedPdfs, setStagedPdfs] = useState([]);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [activeModal, setActiveModal] = useState(null); // { type: 'link'|'files'|'takeaways'|'view_all', log: object }
  const [previewDoc, setPreviewDoc] = useState(null); // { kind: 'image'|'pdf', url: string, title: string }
  const [deletingLogId, setDeletingLogId] = useState(null);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    document.title = course ? `${course.name} - Learning Log` : 'Life Manager App - Daily Learning Tracker';
  }, [course]);

  useEffect(() => {
    return () => {
      if (previewDoc && previewDoc.url) URL.revokeObjectURL(previewDoc.url);
    };
  }, [previewDoc]);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [c, l] = await Promise.all([educationService.getCourse(courseId), educationService.listCourseLogs(courseId)]);
      setCourse(c);
      setLogs(l);
    } catch (err) {
      setError('Could not load this course. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return logs.filter((log) => `${log.topic} ${log.date} ${log.learnings || ''} ${log.link || ''}`.toLowerCase().includes(term));
  }, [logs, searchTerm]);

  function resetForm() {
    setEditId('');
    setLearningLink('');
    setTopicLearned('');
    setLogDate(getTodayDateString());
    setLearningsMessage('');
    setExistingAttachments([]);
    setDeletedAttachmentIds([]);
    setStagedPhotos([]);
    setStagedPdfs([]);
    setError('');
  }

  function toggleForm() {
    setFormVisible((v) => {
      const next = !v;
      if (!next) resetForm();
      return next;
    });
  }

  function handlePhotoSelect(e) {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setStagedPhotos((prev) => [...prev, ...files]);
    }
    e.target.value = '';
  }

  function handlePdfSelect(e) {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setStagedPdfs((prev) => [...prev, ...files]);
    }
    e.target.value = '';
  }

  function removeStagedPhoto(index) {
    setStagedPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function removeStagedPdf(index) {
    setStagedPdfs((prev) => prev.filter((_, i) => i !== index));
  }

  function removeExistingAttachment(attId) {
    setDeletedAttachmentIds((prev) => [...prev, attId]);
  }

  function undoRemoveExistingAttachment(attId) {
    setDeletedAttachmentIds((prev) => prev.filter((id) => id !== attId));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedTopic = topicLearned.trim();
    const trimmedLink = learningLink.trim();

    if (!trimmedTopic) {
      setError('Topic Covered is required.');
      return;
    }
    if (!logDate) {
      setError('Date Studied is required.');
      return;
    }
    if (trimmedLink && !isValidHttpUrl(trimmedLink)) {
      setError('Topic Link must be a valid HTTP or HTTPS URL.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('topic', trimmedTopic);
      formData.append('date', logDate);
      formData.append('link', trimmedLink);
      formData.append('learnings', learningsMessage);

      if (editId) {
        const keptIds = existingAttachments
          .filter((att) => !deletedAttachmentIds.includes(att.id))
          .map((att) => att.id);
        formData.append('keptAttachmentIds', JSON.stringify(keptIds));
      }

      // Append all staged photos and PDFs
      stagedPhotos.forEach((file) => formData.append('files', file));
      stagedPdfs.forEach((file) => formData.append('files', file));

      if (editId) {
        const updated = await educationService.updateCourseLog(courseId, editId, formData);
        setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const created = await educationService.createCourseLog(courseId, formData);
        setLogs((prev) => [created, ...prev]);
      }

      resetForm();
      setFormVisible(false);
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not save progress.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function editEntry(log) {
    setEditId(log.id);
    setLearningLink(log.link || '');
    setTopicLearned(log.topic);
    setLogDate(log.date);
    setLearningsMessage(log.learnings || '');
    setExistingAttachments(log.attachments || []);
    setDeletedAttachmentIds([]);
    setStagedPhotos([]);
    setStagedPdfs([]);
    setError('');
    setFormVisible(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteEntry(id) {
    try {
      await educationService.deleteCourseLog(courseId, id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      if (activeModal && activeModal.log.id === id) {
        setActiveModal(null);
      }
    } catch (err) {
      setError('Could not delete entry. Please try again.');
    }
  }

  async function viewAttachment(log, attachment) {
    try {
      const blob = await educationService.fetchAttachmentBlob(courseId, log.id, attachment.id);
      const url = URL.createObjectURL(blob);

      if (attachment.fileType === 'pdf') {
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
          window.open(url, '_blank');
          return;
        }
        setPreviewDoc({ kind: 'pdf', url, title: attachment.fileName });
      } else {
        setPreviewDoc({ kind: 'image', url, title: attachment.fileName });
      }
    } catch (err) {
      setError('Could not load attachment file.');
    }
  }

  async function downloadAttachment(log, attachment) {
    try {
      const blob = await educationService.fetchAttachmentBlob(courseId, log.id, attachment.id, { download: true });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Could not download attachment.');
    }
  }

  function closePreviewDoc() {
    if (previewDoc && previewDoc.url) URL.revokeObjectURL(previewDoc.url);
    setPreviewDoc(null);
  }

  const activeDeletingLog = logs.find((l) => l.id === deletingLogId);

  return (
    <div className="daily-learning-tracker-page-root">
      <div className="app-container">
        {/* Header */}
        <div className="header-box">
          <Link to="/placement/education" className="btn-back">
            ← Back
          </Link>
          <h2 id="log-header-title">{loading ? 'Loading...' : course ? course.name : '...'}</h2>
          <button type="button" className="btn-toggle-form" id="toggle-form-btn" onClick={toggleForm}>
            {formVisible ? '❌ Close' : '➕ Log Progress'}
          </button>
        </div>

        {/* Stats */}
        <div id="stats-container">
          <div className="stat-box">
            Days Logged: <strong id="total-days-display">{logs.length}</strong>
          </div>
          <div className="stat-box">
            Course: <strong id="current-course-display">{course ? course.name : '...'}</strong>
          </div>
        </div>

        {/* Search */}
        <div className="search-container">
          <input
            type="text"
            id="search-input"
            placeholder="🔍 Search topics, takeaways, or links..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {error && <div className="daily-learning-tracker-error">{error}</div>}

        {/* Form Container */}
        {formVisible && (
          <div id="log-form-container" style={{ display: 'block' }}>
            <div className="form-title-badge">
              {editId ? '✏️ Edit Learning Progress' : '➕ Log New Progress'}
            </div>
            <form id="daily-log-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group flex-2">
                  <label htmlFor="topic-learned">
                    Topic Covered <span className="req-star">*</span>
                  </label>
                  <input
                    type="text"
                    id="topic-learned"
                    placeholder="e.g., React useEffect hook & cleanup"
                    required
                    value={topicLearned}
                    onChange={(e) => setTopicLearned(e.target.value)}
                  />
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="log-date">
                    Date Studied <span className="req-star">*</span>
                  </label>
                  <input
                    type="date"
                    id="log-date"
                    required
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="learning-link">
                  Topic Link / Video URL <span className="opt-label">(Optional)</span>
                </label>
                <input
                  type="url"
                  id="learning-link"
                  placeholder="https://example.com/tutorial (optional)"
                  value={learningLink}
                  onChange={(e) => setLearningLink(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="learnings-message">
                  Key Takeaways <span className="opt-label">(Optional)</span>
                </label>
                <textarea
                  id="learnings-message"
                  rows="4"
                  placeholder="Summarize key concepts, code patterns, tips..."
                  value={learningsMessage}
                  onChange={(e) => setLearningsMessage(e.target.value)}
                />
              </div>

              {/* Attachments Upload Section */}
              <div className="attachments-section">
                <label className="section-label">📎 Attachments (Photos & PDFs)</label>
                
                <div className="attachment-upload-buttons">
                  <label className="btn-upload-trigger photo-trigger">
                    📷 Add Photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoSelect}
                      style={{ display: 'none' }}
                    />
                  </label>

                  <label className="btn-upload-trigger pdf-trigger">
                    📄 Add PDFs
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      multiple
                      onChange={handlePdfSelect}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {/* Staged New Attachments */}
                {(stagedPhotos.length > 0 || stagedPdfs.length > 0) && (
                  <div className="staged-attachments-list">
                    <div className="staged-group-title">New Files to Upload:</div>
                    {stagedPhotos.map((file, idx) => (
                      <div className="staged-file-item" key={`photo-${idx}`}>
                        <span className="file-icon">📷</span>
                        <span className="file-name" title={file.name}>{file.name}</span>
                        <span className="file-size">({formatBytes(file.size)})</span>
                        <button
                          type="button"
                          className="btn-remove-staged"
                          onClick={() => removeStagedPhoto(idx)}
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {stagedPdfs.map((file, idx) => (
                      <div className="staged-file-item" key={`pdf-${idx}`}>
                        <span className="file-icon">📄</span>
                        <span className="file-name" title={file.name}>{file.name}</span>
                        <span className="file-size">({formatBytes(file.size)})</span>
                        <button
                          type="button"
                          className="btn-remove-staged"
                          onClick={() => removeStagedPdf(idx)}
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Existing Attachments during Edit */}
                {existingAttachments.length > 0 && (
                  <div className="existing-attachments-manage">
                    <div className="staged-group-title">Existing Attachments:</div>
                    {existingAttachments.map((att) => {
                      const isMarkedDeleted = deletedAttachmentIds.includes(att.id);
                      return (
                        <div
                          className={`staged-file-item existing ${isMarkedDeleted ? 'marked-deleted' : ''}`}
                          key={att.id}
                        >
                          <span className="file-icon">{att.fileType === 'pdf' ? '📄' : '📷'}</span>
                          <span className="file-name" title={att.fileName}>
                            {att.fileName} {isMarkedDeleted ? '(Will be removed)' : ''}
                          </span>
                          <span className="file-size">({formatBytes(att.size)})</span>
                          {isMarkedDeleted ? (
                            <button
                              type="button"
                              className="btn-undo-remove"
                              onClick={() => undoRemoveExistingAttachment(att.id)}
                            >
                              Undo ↩
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-remove-staged"
                              onClick={() => removeExistingAttachment(att.id)}
                              title="Remove existing attachment"
                            >
                              🗑️ Remove
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-log"
                id="submit-log-button"
                disabled={submitting}
              >
                {submitting ? '⏳ Saving...' : editId ? '💾 Update Progress' : '💾 Save Progress'}
              </button>
            </form>
          </div>
        )}

        {/* Progress History List (Compact View) */}
        <h3>Progress History</h3>
        <ul id="daily-progress-list">
          {loading ? (
            <li className="empty-history-item">Loading progress logs...</li>
          ) : filteredLogs.length === 0 ? (
            <li className="empty-history-item">
              {logs.length === 0
                ? 'No learning progress logged yet. Click "Log Progress" above to start!'
                : 'No matching progress entries found.'}
            </li>
          ) : (
            filteredLogs.map((log) => {
              const photoCount = (log.attachments || []).filter((a) => a.fileType === 'image').length;
              const pdfCount = (log.attachments || []).filter((a) => a.fileType === 'pdf').length;
              const totalAttachments = (log.attachments || []).length;

              return (
                <li className="progress-history-card" key={log.id}>
                  {/* Compact Header: Topic Name and Date Studied */}
                  <div className="card-primary-info">
                    <div className="card-topic-title">
                      <span className="topic-icon">📚</span>
                      <span className="topic-text">{log.topic}</span>
                    </div>
                    <div className="card-date-badge">
                      📅 {formatDisplayDate(log.date)}
                    </div>
                  </div>

                  {/* Compact Action Chips */}
                  <div className="card-action-bar">
                    <button
                      type="button"
                      className={`btn-action-chip ${log.link ? 'has-content' : 'chip-dim'}`}
                      onClick={() => setActiveModal({ type: 'link', log })}
                    >
                      🔗 Link
                    </button>

                    <button
                      type="button"
                      className={`btn-action-chip ${totalAttachments > 0 ? 'has-content' : 'chip-dim'}`}
                      onClick={() => setActiveModal({ type: 'files', log })}
                    >
                      🖼️/📄 Files {totalAttachments > 0 ? `(${totalAttachments})` : ''}
                    </button>

                    <button
                      type="button"
                      className={`btn-action-chip ${log.learnings?.trim() ? 'has-content' : 'chip-dim'}`}
                      onClick={() => setActiveModal({ type: 'takeaways', log })}
                    >
                      💡 Takeaways
                    </button>

                    <button
                      type="button"
                      className="btn-action-chip btn-view-all"
                      onClick={() => setActiveModal({ type: 'view_all', log })}
                    >
                      👁️ View All
                    </button>

                    <button
                      type="button"
                      className="btn-action-chip btn-edit-chip"
                      onClick={() => editEntry(log)}
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      className="btn-action-chip btn-delete-chip"
                      onClick={() => setDeletingLogId(log.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>

      {/* ========================================================================= */}
      {/* ACTION MODALS                                                             */}
      {/* ========================================================================= */}

      {/* 1. LINK MODAL */}
      {activeModal && activeModal.type === 'link' &&
        createPortal(
          <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
            <div className="modal-dialog-box" onClick={(e) => e.stopPropagation()}>
              <div className="modal-dialog-header">
                <span className="modal-dialog-title">🔗 Topic Link</span>
                <button type="button" className="modal-dialog-close" onClick={() => setActiveModal(null)}>
                  ✕
                </button>
              </div>
              <div className="modal-dialog-body">
                <div className="modal-topic-heading">📚 {activeModal.log.topic}</div>
                {activeModal.log.link ? (
                  <div className="modal-link-box">
                    <p className="link-label">Saved Resource / URL:</p>
                    <div className="link-url-display">
                      <a
                        href={activeModal.log.link}
                        target="_blank"
                        rel="noreferrer"
                        className="modal-link-anchor"
                      >
                        {activeModal.log.link}
                      </a>
                    </div>
                    <div className="modal-dialog-footer-actions">
                      <a
                        href={activeModal.log.link}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-primary-action"
                      >
                        Open Link ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="modal-empty-state">
                    <span className="empty-icon">🔗</span>
                    <p>No link was added for this topic.</p>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 2. FILES MODAL */}
      {activeModal && activeModal.type === 'files' &&
        createPortal(
          <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
            <div className="modal-dialog-box modal-wide" onClick={(e) => e.stopPropagation()}>
              <div className="modal-dialog-header">
                <span className="modal-dialog-title">🖼️ / 📄 Photos & PDFs</span>
                <button type="button" className="modal-dialog-close" onClick={() => setActiveModal(null)}>
                  ✕
                </button>
              </div>
              <div className="modal-dialog-body">
                <div className="modal-topic-heading">📚 {activeModal.log.topic}</div>

                {(!activeModal.log.attachments || activeModal.log.attachments.length === 0) ? (
                  <div className="modal-empty-state">
                    <span className="empty-icon">📁</span>
                    <p>No photos or PDFs attached.</p>
                  </div>
                ) : (
                  <div className="modal-attachments-container">
                    {/* Photos Section */}
                    {activeModal.log.attachments.some((a) => a.fileType === 'image') && (
                      <div className="attachment-category">
                        <h4>📷 Photos</h4>
                        <div className="photos-gallery-grid">
                          {activeModal.log.attachments
                            .filter((a) => a.fileType === 'image')
                            .map((att) => (
                              <div className="photo-card" key={att.id}>
                                <div
                                  className="photo-thumbnail-wrap"
                                  onClick={() => viewAttachment(activeModal.log, att)}
                                >
                                  <AuthenticatedImage
                                    src={`/placement/education/${courseId}/logs/${activeModal.log.id}/attachments/${att.id}`}
                                    alt={att.fileName}
                                    className="photo-thumb-img"
                                  />
                                </div>
                                <div className="photo-info-bar">
                                  <span className="photo-name" title={att.fileName}>{att.fileName}</span>
                                  <span className="photo-size">{formatBytes(att.size)}</span>
                                </div>
                                <div className="attachment-actions-row">
                                  <button
                                    type="button"
                                    className="btn-att-action btn-view"
                                    onClick={() => viewAttachment(activeModal.log, att)}
                                  >
                                    👁️ View
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-att-action btn-download"
                                    onClick={() => downloadAttachment(activeModal.log, att)}
                                  >
                                    ⬇️ Download
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* PDFs Section */}
                    {activeModal.log.attachments.some((a) => a.fileType === 'pdf') && (
                      <div className="attachment-category">
                        <h4>📄 PDFs</h4>
                        <div className="pdfs-list">
                          {activeModal.log.attachments
                            .filter((a) => a.fileType === 'pdf')
                            .map((att) => (
                              <div className="pdf-card" key={att.id}>
                                <div className="pdf-main-info">
                                  <span className="pdf-icon">📄</span>
                                  <div className="pdf-text-meta">
                                    <div className="pdf-title" title={att.fileName}>{att.fileName}</div>
                                    <div className="pdf-size-badge">{formatBytes(att.size)}</div>
                                  </div>
                                </div>
                                <div className="attachment-actions-row">
                                  <button
                                    type="button"
                                    className="btn-att-action btn-view"
                                    onClick={() => viewAttachment(activeModal.log, att)}
                                  >
                                    👁️ View PDF
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-att-action btn-download"
                                    onClick={() => downloadAttachment(activeModal.log, att)}
                                  >
                                    ⬇️ Download
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 3. KEY TAKEAWAYS MODAL */}
      {activeModal && activeModal.type === 'takeaways' &&
        createPortal(
          <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
            <div className="modal-dialog-box" onClick={(e) => e.stopPropagation()}>
              <div className="modal-dialog-header">
                <span className="modal-dialog-title">💡 Key Takeaways</span>
                <button type="button" className="modal-dialog-close" onClick={() => setActiveModal(null)}>
                  ✕
                </button>
              </div>
              <div className="modal-dialog-body">
                <div className="modal-topic-heading">📚 {activeModal.log.topic}</div>
                <div className="modal-date-heading">📅 {formatDisplayDate(activeModal.log.date)}</div>

                {activeModal.log.learnings?.trim() ? (
                  <div className="modal-takeaways-content">
                    {activeModal.log.learnings}
                  </div>
                ) : (
                  <div className="modal-empty-state">
                    <span className="empty-icon">💡</span>
                    <p>No key takeaways added for this topic.</p>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 4. VIEW ALL MODAL */}
      {activeModal && activeModal.type === 'view_all' &&
        createPortal(
          <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
            <div className="modal-dialog-box modal-extra-wide" onClick={(e) => e.stopPropagation()}>
              <div className="modal-dialog-header">
                <span className="modal-dialog-title">👁️ Complete Progress Details</span>
                <button type="button" className="modal-dialog-close" onClick={() => setActiveModal(null)}>
                  ✕
                </button>
              </div>
              <div className="modal-dialog-body view-all-body">
                {/* Topic & Date */}
                <div className="view-all-header-section">
                  <div className="view-all-title">📚 {activeModal.log.topic}</div>
                  <div className="view-all-date">📅 Studied: {formatDisplayDate(activeModal.log.date)}</div>
                </div>

                {/* Topic Link if present */}
                {activeModal.log.link && (
                  <div className="view-all-block">
                    <div className="view-all-block-title">🔗 Topic Link</div>
                    <div className="view-all-link-box">
                      <a
                        href={activeModal.log.link}
                        target="_blank"
                        rel="noreferrer"
                        className="modal-link-anchor"
                      >
                        {activeModal.log.link}
                      </a>
                      <a
                        href={activeModal.log.link}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-link-pill"
                      >
                        Open ↗
                      </a>
                    </div>
                  </div>
                )}

                {/* Topic Covered */}
                <div className="view-all-block">
                  <div className="view-all-block-title">📖 Topic Covered</div>
                  <div className="view-all-text-box">
                    {activeModal.log.topic}
                  </div>
                </div>

                {/* Key Takeaways if present */}
                {activeModal.log.learnings?.trim() && (
                  <div className="view-all-block">
                    <div className="view-all-block-title">💡 Key Takeaways</div>
                    <div className="view-all-text-box takeaways-box">
                      {activeModal.log.learnings}
                    </div>
                  </div>
                )}

                {/* Photos if present */}
                {activeModal.log.attachments?.some((a) => a.fileType === 'image') && (
                  <div className="view-all-block">
                    <div className="view-all-block-title">📷 Photos</div>
                    <div className="photos-gallery-grid">
                      {activeModal.log.attachments
                        .filter((a) => a.fileType === 'image')
                        .map((att) => (
                          <div className="photo-card" key={att.id}>
                            <div
                              className="photo-thumbnail-wrap"
                              onClick={() => viewAttachment(activeModal.log, att)}
                            >
                              <AuthenticatedImage
                                src={`/placement/education/${courseId}/logs/${activeModal.log.id}/attachments/${att.id}`}
                                alt={att.fileName}
                                className="photo-thumb-img"
                              />
                            </div>
                            <div className="photo-info-bar">
                              <span className="photo-name" title={att.fileName}>{att.fileName}</span>
                              <span className="photo-size">{formatBytes(att.size)}</span>
                            </div>
                            <div className="attachment-actions-row">
                              <button
                                type="button"
                                className="btn-att-action btn-view"
                                onClick={() => viewAttachment(activeModal.log, att)}
                              >
                                👁️ View
                              </button>
                              <button
                                type="button"
                                className="btn-att-action btn-download"
                                onClick={() => downloadAttachment(activeModal.log, att)}
                              >
                                ⬇️ Download
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* PDFs if present */}
                {activeModal.log.attachments?.some((a) => a.fileType === 'pdf') && (
                  <div className="view-all-block">
                    <div className="view-all-block-title">📄 PDFs</div>
                    <div className="pdfs-list">
                      {activeModal.log.attachments
                        .filter((a) => a.fileType === 'pdf')
                        .map((att) => (
                          <div className="pdf-card" key={att.id}>
                            <div className="pdf-main-info">
                              <span className="pdf-icon">📄</span>
                              <div className="pdf-text-meta">
                                <div className="pdf-title" title={att.fileName}>{att.fileName}</div>
                                <div className="pdf-size-badge">{formatBytes(att.size)}</div>
                              </div>
                            </div>
                            <div className="attachment-actions-row">
                              <button
                                type="button"
                                className="btn-att-action btn-view"
                                onClick={() => viewAttachment(activeModal.log, att)}
                              >
                                👁️ View PDF
                              </button>
                              <button
                                type="button"
                                className="btn-att-action btn-download"
                                onClick={() => downloadAttachment(activeModal.log, att)}
                              >
                                ⬇️ Download
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* FULL PREVIEW MODAL (for images / desktop PDFs) */}
      {previewDoc &&
        createPortal(
          <div className="modal-backdrop preview-lightbox-backdrop" onClick={closePreviewDoc}>
            <div className="preview-lightbox-container" onClick={(e) => e.stopPropagation()}>
              <div className="preview-lightbox-header">
                <span className="lightbox-title" title={previewDoc.title}>{previewDoc.title}</span>
                <button type="button" onClick={closePreviewDoc} className="modal-dialog-close">
                  ✕
                </button>
              </div>
              <div className="preview-lightbox-body">
                {previewDoc.kind === 'pdf' && (
                  <iframe src={previewDoc.url} title={previewDoc.title} className="lightbox-iframe" />
                )}
                {previewDoc.kind === 'image' && (
                  <img src={previewDoc.url} alt={previewDoc.title} className="lightbox-img" />
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={deletingLogId !== null}
        title="Delete Progress Entry?"
        message="Are you sure you want to permanently delete this learning log entry? This action cannot be undone."
        itemPreview={activeDeletingLog ? `"${activeDeletingLog.topic}"` : null}
        confirmWord="DELETE"
        onClose={() => setDeletingLogId(null)}
        onConfirm={async () => {
          const id = deletingLogId;
          setDeletingLogId(null);
          await deleteEntry(id);
        }}
      />
    </div>
  );
}

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

  // In-Card Expandable Detail View: { logId: string, view: 'link' | 'files' | 'takeaways' | 'view_all' } | null
  const [expandedCard, setExpandedCard] = useState(null);

  // Lightbox Preview for Photos and PDFs: { kind: 'image'|'pdf', url: string, title: string } | null
  const [previewDoc, setPreviewDoc] = useState(null);

  // Delete Confirmation
  const [deletingLogId, setDeletingLogId] = useState(null);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    document.title = course
      ? `${course.name} - Learning Log`
      : 'Life Manager App - Daily Learning Tracker';
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
      const [c, l] = await Promise.all([
        educationService.getCourse(courseId),
        educationService.listCourseLogs(courseId),
      ]);
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
    return logs.filter((log) =>
      `${log.topic} ${log.date} ${log.learnings || ''} ${log.link || ''}`
        .toLowerCase()
        .includes(term)
    );
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
      setStagedPhotos((prev) => [...prev, ...Array.from(e.target.files)]);
    }
    e.target.value = '';
  }

  function handlePdfSelect(e) {
    if (e.target.files) {
      setStagedPdfs((prev) => [...prev, ...Array.from(e.target.files)]);
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

    if (!trimmedTopic) { setError('Topic Covered is required.'); return; }
    if (!logDate) { setError('Date Studied is required.'); return; }
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
      const message =
        (err.response && err.response.data && err.response.data.message) ||
        'Could not save progress.';
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
      if (expandedCard && String(expandedCard.logId) === String(id)) {
        setExpandedCard(null);
      }
    } catch (err) {
      setError('Could not delete entry. Please try again.');
    }
  }

  // Toggle in-card detail panel: Link, Files, Takeaways, View All
  function toggleCardDetail(log, view) {
    console.log(`ACTION CLICKED: ${view.toUpperCase()}`);
    console.log('LOG ID:', log.id);
    console.log('LOG DATA:', log);
    if (view === 'link') console.log('LINK VALUE:', log.link);
    if (view === 'takeaways') console.log('TAKEAWAYS VALUE:', log.learnings);
    if (view === 'files') console.log('ATTACHMENTS COUNT:', (log.attachments || []).length);

    setExpandedCard((current) => {
      console.log('EXPANDED DETAIL BEFORE:', current);
      const next =
        current && String(current.logId) === String(log.id) && current.view === view
          ? null
          : { logId: String(log.id), view };
      console.log('EXPANDED DETAIL AFTER:', next);
      return next;
    });
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
      const blob = await educationService.fetchAttachmentBlob(
        courseId,
        log.id,
        attachment.id,
        { download: true }
      );
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

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="header-box">
          <Link to="/placement/education" className="btn-back">← Back</Link>
          <h2 id="log-header-title">
            {loading ? 'Loading...' : course ? course.name : '...'}
          </h2>
          <button type="button" className="btn-toggle-form" id="toggle-form-btn" onClick={toggleForm}>
            {formVisible ? 'Close' : 'Log Progress'}
          </button>
        </div>

        {/* ── Stats ──────────────────────────────────────────────── */}
        <div id="stats-container">
          <div className="stat-box">
            Days Logged: <strong id="total-days-display">{logs.length}</strong>
          </div>
          <div className="stat-box">
            Course: <strong id="current-course-display">{course ? course.name : '...'}</strong>
          </div>
        </div>

        {/* ── Search ─────────────────────────────────────────────── */}
        <div className="search-container">
          <input
            type="text"
            id="search-input"
            placeholder="Search topics, takeaways, or links..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {error && <div className="daily-learning-tracker-error">{error}</div>}

        {/* ── Log Progress Form ───────────────────────────────────── */}
        {formVisible && (
          <div id="log-form-container" style={{ display: 'block' }}>
            <div className="form-title-badge">
              {editId ? 'Edit Learning Progress' : 'Log New Progress'}
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
                <label className="section-label">Attachments (Photos & PDFs)</label>

                <div className="attachment-upload-buttons">
                  <label className="btn-upload-trigger photo-trigger">
                    Add Photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoSelect}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <label className="btn-upload-trigger pdf-trigger">
                    Add PDFs
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      multiple
                      onChange={handlePdfSelect}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {/* Staged new files preview */}
                {(stagedPhotos.length > 0 || stagedPdfs.length > 0) && (
                  <div className="staged-attachments-list">
                    <div className="staged-group-title">New Files to Upload:</div>
                    {stagedPhotos.map((file, idx) => (
                      <div className="staged-file-item" key={`photo-${idx}`}>
                        <span className="file-name" title={file.name}>{file.name}</span>
                        <span className="file-size">({formatBytes(file.size)})</span>
                        <button type="button" className="btn-remove-staged" onClick={() => removeStagedPhoto(idx)} title="Remove">✕</button>
                      </div>
                    ))}
                    {stagedPdfs.map((file, idx) => (
                      <div className="staged-file-item" key={`pdf-${idx}`}>
                        <span className="file-name" title={file.name}>{file.name}</span>
                        <span className="file-size">({formatBytes(file.size)})</span>
                        <button type="button" className="btn-remove-staged" onClick={() => removeStagedPdf(idx)} title="Remove">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Existing attachments management during edit */}
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
                          <span className="file-name" title={att.fileName}>
                            [{att.fileType.toUpperCase()}] {att.fileName}{isMarkedDeleted ? ' (Will be removed)' : ''}
                          </span>
                          <span className="file-size">({formatBytes(att.size)})</span>
                          {isMarkedDeleted ? (
                            <button type="button" className="btn-undo-remove" onClick={() => undoRemoveExistingAttachment(att.id)}>Undo</button>
                          ) : (
                            <button type="button" className="btn-remove-staged" onClick={() => removeExistingAttachment(att.id)} title="Remove">Remove</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button type="submit" className="btn-log" id="submit-log-button" disabled={submitting}>
                {submitting ? 'Saving...' : editId ? 'Update Progress' : 'Save Progress'}
              </button>
            </form>
          </div>
        )}

        {/* ── Progress History List ──────────────────────────────── */}
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
              const totalAttachments = (log.attachments || []).length;
              const isExpanded = expandedCard && String(expandedCard.logId) === String(log.id);
              const activeView = isExpanded ? expandedCard.view : null;

              return (
                <li className="progress-history-card" key={log.id}>
                  <div className="card-primary-info">
                    <div className="card-topic-title">
                      <span className="topic-text">{log.topic}</span>
                    </div>
                    <div className="card-date-badge">{formatDisplayDate(log.date)}</div>
                  </div>

                  {/* Clean text action buttons (no emojis) */}
                  <div className="card-action-bar">
                    <button
                      type="button"
                      className={`btn-action-chip ${log.link ? 'has-content' : 'chip-dim'} ${activeView === 'link' ? 'chip-active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleCardDetail(log, 'link'); }}
                    >
                      Link
                    </button>

                    <button
                      type="button"
                      className={`btn-action-chip ${totalAttachments > 0 ? 'has-content' : 'chip-dim'} ${activeView === 'files' ? 'chip-active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleCardDetail(log, 'files'); }}
                    >
                      Files
                    </button>

                    <button
                      type="button"
                      className={`btn-action-chip ${log.learnings?.trim() ? 'has-content' : 'chip-dim'} ${activeView === 'takeaways' ? 'chip-active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleCardDetail(log, 'takeaways'); }}
                    >
                      Takeaways
                    </button>

                    <button
                      type="button"
                      className={`btn-action-chip btn-view-all ${activeView === 'view_all' ? 'chip-active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleCardDetail(log, 'view_all'); }}
                    >
                      View All
                    </button>

                    <button
                      type="button"
                      className="btn-action-chip btn-edit-chip"
                      onClick={(e) => { e.stopPropagation(); editEntry(log); }}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="btn-action-chip btn-delete-chip"
                      onClick={(e) => { e.stopPropagation(); setDeletingLogId(log.id); }}
                    >
                      Delete
                    </button>
                  </div>

                  {/* ── Direct In-Card Expanded Detail Panel ───────── */}
                  {isExpanded && (
                    <div className="card-detail-panel" id={`card-detail-${log.id}`}>
                      <div className="card-detail-header">
                        <span className="card-detail-title">
                          {activeView === 'link' && 'Topic Link'}
                          {activeView === 'files' && 'Attachments (Photos & PDFs)'}
                          {activeView === 'takeaways' && 'Key Takeaways'}
                          {activeView === 'view_all' && 'Complete Progress Details'}
                        </span>
                        <button
                          type="button"
                          className="btn-detail-close"
                          onClick={() => setExpandedCard(null)}
                          title="Close section"
                        >
                          Close ✕
                        </button>
                      </div>

                      {/* 1. LINK VIEW */}
                      {activeView === 'link' && (
                        <div className="detail-view-body">
                          {log.link ? (
                            <div className="detail-link-box">
                              <div className="detail-link-label">Saved Resource URL:</div>
                              <div className="detail-url-text">
                                <a
                                  href={log.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="detail-anchor-link"
                                >
                                  {log.link}
                                </a>
                              </div>
                              <div className="detail-link-btn-row">
                                <a
                                  href={log.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn-open-link"
                                >
                                  Open Link ↗
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="detail-empty-message">
                              No link was added for this topic.
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. FILES VIEW */}
                      {activeView === 'files' && (
                        <div className="detail-view-body">
                          {(!log.attachments || log.attachments.length === 0) ? (
                            <div className="detail-empty-message">
                              No photos or PDFs attached.
                            </div>
                          ) : (
                            <div className="detail-attachments-wrapper">
                              {/* Photos Section */}
                              {log.attachments.some((a) => a.fileType === 'image') && (
                                <div className="detail-att-group">
                                  <div className="detail-group-heading">Photos</div>
                                  <div className="detail-photos-grid">
                                    {log.attachments
                                      .filter((a) => a.fileType === 'image')
                                      .map((att) => (
                                        <div className="detail-photo-card" key={att.id}>
                                          <div
                                            className="detail-photo-preview"
                                            onClick={() => viewAttachment(log, att)}
                                            title="Click to view full image"
                                          >
                                            <AuthenticatedImage
                                              src={`/placement/education/${courseId}/logs/${log.id}/attachments/${att.id}`}
                                              alt={att.fileName}
                                              className="detail-photo-img"
                                            />
                                          </div>
                                          <div className="detail-photo-meta">
                                            <span className="detail-file-name" title={att.fileName}>
                                              {att.fileName}
                                            </span>
                                            <span className="detail-file-size">{formatBytes(att.size)}</span>
                                          </div>
                                          <div className="detail-file-actions">
                                            <button
                                              type="button"
                                              className="btn-file-action"
                                              onClick={() => viewAttachment(log, att)}
                                            >
                                              View
                                            </button>
                                            <button
                                              type="button"
                                              className="btn-file-action"
                                              onClick={() => downloadAttachment(log, att)}
                                            >
                                              Download
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}

                              {/* PDFs Section */}
                              {log.attachments.some((a) => a.fileType === 'pdf') && (
                                <div className="detail-att-group">
                                  <div className="detail-group-heading">PDFs</div>
                                  <div className="detail-pdfs-list">
                                    {log.attachments
                                      .filter((a) => a.fileType === 'pdf')
                                      .map((att) => (
                                        <div className="detail-pdf-item" key={att.id}>
                                          <div className="detail-pdf-info">
                                            <span className="pdf-tag">PDF</span>
                                            <div className="detail-pdf-text">
                                              <span className="detail-file-name" title={att.fileName}>
                                                {att.fileName}
                                              </span>
                                              <span className="detail-file-size">{formatBytes(att.size)}</span>
                                            </div>
                                          </div>
                                          <div className="detail-file-actions">
                                            <button
                                              type="button"
                                              className="btn-file-action"
                                              onClick={() => viewAttachment(log, att)}
                                            >
                                              View PDF
                                            </button>
                                            <button
                                              type="button"
                                              className="btn-file-action"
                                              onClick={() => downloadAttachment(log, att)}
                                            >
                                              Download
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
                      )}

                      {/* 3. TAKEAWAYS VIEW */}
                      {activeView === 'takeaways' && (
                        <div className="detail-view-body">
                          {log.learnings?.trim() ? (
                            <div className="detail-takeaways-box">
                              {log.learnings}
                            </div>
                          ) : (
                            <div className="detail-empty-message">
                              No key takeaways added for this topic.
                            </div>
                          )}
                        </div>
                      )}

                      {/* 4. VIEW ALL */}
                      {activeView === 'view_all' && (
                        <div className="detail-view-body view-all-body">
                          <div className="view-all-row">
                            <div className="view-all-label">Topic</div>
                            <div className="view-all-value bold-topic">{log.topic}</div>
                          </div>

                          <div className="view-all-row">
                            <div className="view-all-label">Date Studied</div>
                            <div className="view-all-value">{formatDisplayDate(log.date)}</div>
                          </div>

                          <div className="view-all-row">
                            <div className="view-all-label">Topic Link</div>
                            <div className="view-all-value">
                              {log.link ? (
                                <div className="view-all-link-wrapper">
                                  <a
                                    href={log.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="detail-anchor-link"
                                  >
                                    {log.link}
                                  </a>
                                  <a
                                    href={log.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn-open-link-pill"
                                  >
                                    Open ↗
                                  </a>
                                </div>
                              ) : (
                                <span className="text-muted">None</span>
                              )}
                            </div>
                          </div>

                          <div className="view-all-row">
                            <div className="view-all-label">Topic Covered</div>
                            <div className="view-all-value">{log.topic}</div>
                          </div>

                          <div className="view-all-row">
                            <div className="view-all-label">Key Takeaways</div>
                            <div className="view-all-value">
                              {log.learnings?.trim() ? (
                                <div className="detail-takeaways-box in-view-all">
                                  {log.learnings}
                                </div>
                              ) : (
                                <span className="text-muted">None</span>
                              )}
                            </div>
                          </div>

                          {/* Photos in View All */}
                          {log.attachments?.some((a) => a.fileType === 'image') && (
                            <div className="view-all-row">
                              <div className="view-all-label">Photos</div>
                              <div className="detail-photos-grid in-view-all">
                                {log.attachments
                                  .filter((a) => a.fileType === 'image')
                                  .map((att) => (
                                    <div className="detail-photo-card" key={att.id}>
                                      <div
                                        className="detail-photo-preview"
                                        onClick={() => viewAttachment(log, att)}
                                        title="Click to view full image"
                                      >
                                        <AuthenticatedImage
                                          src={`/placement/education/${courseId}/logs/${log.id}/attachments/${att.id}`}
                                          alt={att.fileName}
                                          className="detail-photo-img"
                                        />
                                      </div>
                                      <div className="detail-photo-meta">
                                        <span className="detail-file-name" title={att.fileName}>
                                          {att.fileName}
                                        </span>
                                        <span className="detail-file-size">{formatBytes(att.size)}</span>
                                      </div>
                                      <div className="detail-file-actions">
                                        <button
                                          type="button"
                                          className="btn-file-action"
                                          onClick={() => viewAttachment(log, att)}
                                        >
                                          View
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-file-action"
                                          onClick={() => downloadAttachment(log, att)}
                                        >
                                          Download
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* PDFs in View All */}
                          {log.attachments?.some((a) => a.fileType === 'pdf') && (
                            <div className="view-all-row">
                              <div className="view-all-label">PDFs</div>
                              <div className="detail-pdfs-list in-view-all">
                                {log.attachments
                                  .filter((a) => a.fileType === 'pdf')
                                  .map((att) => (
                                    <div className="detail-pdf-item" key={att.id}>
                                      <div className="detail-pdf-info">
                                        <span className="pdf-tag">PDF</span>
                                        <div className="detail-pdf-text">
                                          <span className="detail-file-name" title={att.fileName}>
                                            {att.fileName}
                                          </span>
                                          <span className="detail-file-size">{formatBytes(att.size)}</span>
                                        </div>
                                      </div>
                                      <div className="detail-file-actions">
                                        <button
                                          type="button"
                                          className="btn-file-action"
                                          onClick={() => viewAttachment(log, att)}
                                        >
                                          View PDF
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-file-action"
                                          onClick={() => downloadAttachment(log, att)}
                                        >
                                          Download
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {(!log.attachments || log.attachments.length === 0) && (
                            <div className="view-all-row">
                              <div className="view-all-label">Attachments</div>
                              <div className="view-all-value text-muted">No photos or PDFs attached.</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </div>

      {/* ── Fullscreen Lightbox Preview (for image/pdf view) ─────── */}
      {previewDoc &&
        createPortal(
          <div className="modal-backdrop preview-lightbox-backdrop" onClick={closePreviewDoc}>
            <div className="preview-lightbox-container" onClick={(e) => e.stopPropagation()}>
              <div className="preview-lightbox-header">
                <span className="lightbox-title" title={previewDoc.title}>{previewDoc.title}</span>
                <button type="button" onClick={closePreviewDoc} className="modal-dialog-close">✕</button>
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

      {/* ── Confirm Delete Modal ────────────────────────────────── */}
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

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import * as reflectionService from '../api/reflectionService.js';
import './ReflectionsPage.css';

// html2pdf is loaded from the same CDN the original used (via a <script>
// tag in the page head), but only when this page actually mounts - no
// other page needs it, so it's not loaded globally in index.html.
const HTML2PDF_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

function loadHtml2Pdf() {
  if (window.html2pdf) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${HTML2PDF_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = HTML2PDF_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load html2pdf'));
    document.head.appendChild(script);
  });
}

/**
 * Ports powerful_questions.html exactly - same markup, classes, copy, and
 * the multi-step question-answering flow. localStorage reads/writes are
 * replaced with the /api/reflections/* endpoints (see reflectionController.js);
 * the step-by-step modal logic, search-by-date, and PDF export are otherwise
 * unchanged.
 */
export default function ReflectionsPage() {
  const [questions, setQuestions] = useState([]);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  // Diary (question-answering) modal
  const [diaryModalOpen, setDiaryModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentAnswers, setCurrentAnswers] = useState({});
  const [answerDraft, setAnswerDraft] = useState('');
  const [currentDatetime, setCurrentDatetime] = useState('');

  // View entry modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewedEntry, setViewedEntry] = useState(null);
  const viewCardRef = useRef(null);
  const viewerBodyRef = useRef(null);

  // Edit questions modal & safe deletion state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [deletingQuestionIndex, setDeletingQuestionIndex] = useState(null);

  useEffect(() => {
    document.title = 'Life Manager App - Ask Powerful Questions';
  }, []);

  useEffect(() => {
    const isAnyModalOpen = diaryModalOpen || viewModalOpen || editModalOpen || deletingQuestionIndex !== null;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      if (viewModalOpen && viewerBodyRef.current) {
        viewerBodyRef.current.scrollTop = 0;
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [diaryModalOpen, viewModalOpen, editModalOpen, deletingQuestionIndex, viewedEntry]);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [q, e] = await Promise.all([reflectionService.listQuestions(), reflectionService.listEntries()]);
      setQuestions(q);
      setEntries(e);
    } catch (err) {
      setError('Could not load reflections. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const keys = Object.keys(entries).sort().reverse();
  const filteredKeys = keys.filter((key) => key.includes(searchTerm));

  function openDiaryModal() {
    setCurrentAnswers({});
    setCurrentStep(0);
    setAnswerDraft('');
    setCurrentDatetime(new Date().toLocaleString());
    setDiaryModalOpen(true);
  }

  function goNext() {
    if (!answerDraft.trim()) {
      // eslint-disable-next-line no-alert
      window.alert('Please answer.');
      return;
    }
    const nextAnswers = { ...currentAnswers, [currentStep]: answerDraft.trim() };
    setCurrentAnswers(nextAnswers);
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    setAnswerDraft(nextAnswers[nextStep] || '');
  }

  function goPrev() {
    const nextAnswers = { ...currentAnswers, [currentStep]: answerDraft.trim() };
    setCurrentAnswers(nextAnswers);
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    setAnswerDraft(nextAnswers[prevStep] || '');
  }

  async function handleDiarySubmit(e) {
    e.preventDefault();
    const finalAnswers = { ...currentAnswers, [currentStep]: answerDraft.trim() };
    const answersPayload = questions.map((q, i) => ({ question: q, answer: finalAnswers[i] || '' }));

    try {
      const saved = await reflectionService.saveEntry(answersPayload);
      setEntries((prev) => ({ ...prev, [saved.dateKey]: saved }));
      setDiaryModalOpen(false);
    } catch (err) {
      setError('Could not save reflection. Please try again.');
    }
  }

  function viewEntry(dateKey) {
    setViewedEntry({ dateKey, ...entries[dateKey] });
    setViewModalOpen(true);
  }

  async function downloadEntryPdf() {
    await loadHtml2Pdf();
    if (window.html2pdf && viewCardRef.current) {
      window
        .html2pdf()
        .from(viewCardRef.current)
        .set({ margin: 10, filename: `Reflection_${viewedEntry.dateKey}.pdf`, jsPDF: { format: 'a4' } })
        .save();
    }
  }

  async function handleAddQuestion() {
    const val = newQuestionText.trim();
    if (!val) return;
    try {
      const updated = await reflectionService.addQuestion(val);
      setQuestions(updated);
      setNewQuestionText('');
    } catch (err) {
      setError('Could not add question. Please try again.');
    }
  }

  async function handleRemoveQuestion(index) {
    try {
      const updated = await reflectionService.removeQuestion(index);
      setQuestions(updated);
    } catch (err) {
      setError('Could not remove question. Please try again.');
    }
  }

  async function handleClearAllData() {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Clear all data?')) return;
    try {
      await reflectionService.clearEntries();
      setEntries({});
    } catch (err) {
      setError('Could not clear data. Please try again.');
    }
  }

  return (
    <div className="reflections-page-root">
      <div className="app-container">
        <div className="back-home-container">
          <Link to="/hub" className="back-home-button">
            🏠 Back to Dashboard
          </Link>
        </div>

        <div className="content-wrapper">
          <div id="reflection-content">
            <h2>Ask Powerful Questions</h2>

            <div className="main-actions" style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button type="button" className="add-button" id="open-diary-modal" onClick={openDiaryModal}>
                New Reflection
              </button>
              <button
                type="button"
                className="action-button primary"
                id="open-edit-questions-modal"
                style={{ backgroundColor: '#007bff' }}
                onClick={() => setEditModalOpen(true)}
              >
                Edit Questions
              </button>
              <Link to="/reflections/problems" style={{ textDecoration: 'none' }}>
                <button type="button" className="action-button problem">
                  ⚠️ Problem Solver
                </button>
              </Link>
              <button
                type="button"
                className="action-button secondary"
                id="clear-diary-data"
                style={{ backgroundColor: '#dc3545' }}
                onClick={handleClearAllData}
              >
                Clear All Data
              </button>
            </div>

            <div className="search-container">
              <input
                type="text"
                id="entry-search"
                className="search-input"
                placeholder="Search by date (YYYY-MM-DD)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {error && <div className="reflections-error">{error}</div>}

            <div id="diary-entries-list">
              {loading ? (
                <p>Loading...</p>
              ) : filteredKeys.length === 0 ? (
                <p>No matching reflections found.</p>
              ) : (
                filteredKeys.map((dateKey) => (
                  <div key={dateKey} className="diary-entry-card" onClick={() => viewEntry(dateKey)}>
                    <strong>{dateKey}</strong>
                    <p>{new Date(entries[dateKey].timestamp).toLocaleTimeString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Diary (question-answering) modal */}
      <div id="diary-modal" className={`modal-backdrop${diaryModalOpen ? ' visible' : ''}`}>
        <div className="modal-content">
          <h3 id="form-title">📓 Question ({currentStep + 1}/{questions.length})</h3>
          <form id="diary-form" onSubmit={handleDiarySubmit}>
            <p id="current-datetime">{currentDatetime}</p>
            <textarea
              id="diary-answer"
              required
              placeholder={questions[currentStep] || ''}
              value={answerDraft}
              onChange={(e) => setAnswerDraft(e.target.value)}
            />
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button
                type="button"
                className="action-button secondary"
                id="prev-question"
                style={{ display: currentStep > 0 ? 'inline-block' : 'none' }}
                onClick={goPrev}
              >
                Previous
              </button>
              <button
                type="button"
                className="add-button"
                id="next-question"
                style={{ display: currentStep < questions.length - 1 ? 'inline-block' : 'none' }}
                onClick={goNext}
              >
                Next Question
              </button>
              <button
                type="submit"
                id="save-entry"
                style={{ display: currentStep === questions.length - 1 ? 'inline-block' : 'none' }}
                className="action-button primary"
              >
                Save Reflection
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Dedicated Full-Screen Reflection Viewer */}
      {viewModalOpen && viewedEntry && (
        <div id="view-entry-modal" className="reflection-viewer-overlay">
          <div className="reflection-viewer-header">
            <button
              type="button"
              id="close-view-modal"
              className="btn-back-reflection"
              onClick={() => setViewModalOpen(false)}
            >
              ← Back
            </button>

            <span className="reflection-viewer-title">Reflection Details</span>

            <button
              type="button"
              className="btn-close-x"
              onClick={() => setViewModalOpen(false)}
              aria-label="Close reflection view"
            >
              ✕
            </button>
          </div>

          <div className="reflection-viewer-body" ref={viewerBodyRef}>
            <div id="entry-view-card" className="entry-image-card" ref={viewCardRef}>
              <div className="reflection-meta-header">
                <h2>🗓️ {viewedEntry.dateKey}</h2>
                {viewedEntry.timestamp && (
                  <p className="reflection-meta-time">
                    ⏰ {new Date(viewedEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <hr className="reflection-divider" />

              <div className="reflection-qa-list">
                {viewedEntry.answers && viewedEntry.answers.map((a, i) => (
                  <div key={i} className="reflection-qa-item">
                    <div className="reflection-question">
                      <span className="question-number">Q{i + 1}:</span> {a.question}
                    </div>
                    <div className="reflection-answer">
                      {a.answer || <em style={{ opacity: 0.6 }}>No answer provided</em>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="reflection-viewer-footer">
            <button
              type="button"
              id="download-entry-pdf"
              className="btn-download-reflection"
              onClick={downloadEntryPdf}
            >
              📥 Download PNG / PDF
            </button>
          </div>
        </div>
      )}

      {/* Edit questions modal */}
      <div id="edit-questions-modal" className={`modal-backdrop${editModalOpen ? ' visible' : ''}`}>
        <div className="modal-content edit-questions-modal-content">
          <div className="edit-questions-modal-header">
            <h3>✏️ Edit Your Questions</h3>
          </div>

          <div className="edit-questions-list-container">
            <ul id="question-list">
              {questions.map((q, i) => (
                <li key={i} className="question-list-item">
                  <span>{q}</span>
                  <button
                    type="button"
                    className="btn-delete-q"
                    title="Delete Question"
                    onClick={() => setDeletingQuestionIndex(i)}
                  >
                    X
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="edit-questions-input-bar">
            <input
              type="text"
              id="new-question-input"
              placeholder="Enter new question..."
              className="new-question-input"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
            />
            <button type="button" id="add-question-btn" className="action-button primary" onClick={handleAddQuestion}>
              Add
            </button>
          </div>

          <div className="edit-questions-footer">
            <button type="button" id="close-edit-modal" className="action-button secondary" onClick={() => setEditModalOpen(false)}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Safe Question Deletion Confirmation Dialog */}
      {deletingQuestionIndex !== null && (
        <div className="modal-backdrop visible confirm-dialog-backdrop">
          <div className="modal-content confirm-dialog-content">
            <h3>Delete this question?</h3>
            <p className="confirm-dialog-text">
              Are you sure you want to delete this question? This action cannot be undone.
            </p>
            {questions[deletingQuestionIndex] && (
              <div className="confirm-question-preview">
                "{questions[deletingQuestionIndex]}"
              </div>
            )}
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="action-button secondary"
                onClick={() => setDeletingQuestionIndex(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="action-button danger-btn"
                onClick={async () => {
                  const idx = deletingQuestionIndex;
                  setDeletingQuestionIndex(null);
                  await handleRemoveQuestion(idx);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

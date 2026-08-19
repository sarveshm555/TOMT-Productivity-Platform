import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import * as educationService from '../api/educationService.js';
import './DailyLearningTrackerPage.css';

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Ports daily-learning-tracker.html exactly - same markup, classes, copy,
 * stats (Days Logged / Course name), search-filter, and add/edit form
 * toggle. The original's `currentLearningCourse` localStorage handoff is
 * replaced with a real `:courseId` route param (same reasoning as
 * DailyCodingLogPage.jsx).
 */
export default function DailyLearningTrackerPage() {
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [editId, setEditId] = useState('');
  const [learningLink, setLearningLink] = useState('');
  const [topicLearned, setTopicLearned] = useState('');
  const [logDate, setLogDate] = useState(getTodayDateString());
  const [learningsMessage, setLearningsMessage] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    document.title = course ? course.name : 'Life Manager App - Daily Learning Tracker';
  }, [course]);

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

  // Ported from searchLog() - filters the already-rendered list by
  // substring match across the whole entry's visible text.
  const filteredLogs = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return logs.filter((log) => `${log.topic} ${log.date} ${log.learnings}`.toLowerCase().includes(term));
  }, [logs, searchTerm]);

  function resetForm() {
    setEditId('');
    setLearningLink('');
    setTopicLearned('');
    setLogDate(getTodayDateString());
    setLearningsMessage('');
  }

  function toggleForm() {
    setFormVisible((v) => {
      const next = !v;
      if (!next) resetForm();
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { link: learningLink, topic: topicLearned.trim(), date: logDate, learnings: learningsMessage };

    try {
      if (editId) {
        const updated = await educationService.updateCourseLog(courseId, editId, payload);
        setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const created = await educationService.createCourseLog(courseId, payload);
        setLogs((prev) => [created, ...prev]);
      }
      resetForm();
      setFormVisible(false);
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not save progress.';
      setError(message);
    }
  }

  function editEntry(log) {
    setEditId(log.id);
    setLearningLink(log.link || '');
    setTopicLearned(log.topic);
    setLogDate(log.date);
    setLearningsMessage(log.learnings);
    setFormVisible(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteEntry(id) {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this entry?')) return;
    try {
      await educationService.deleteCourseLog(courseId, id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError('Could not delete entry. Please try again.');
    }
  }

  return (
    <div className="daily-learning-tracker-page-root">
      <div className="app-container">
        <div className="header-box">
          <Link to="/placement/education" className="btn-back">
            ← Back
          </Link>
          <h2 id="log-header-title">{loading ? 'Loading...' : course ? course.name : '...'}</h2>
          <button type="button" className="btn-toggle-form" id="toggle-form-btn" onClick={toggleForm}>
            {formVisible ? '❌ Close' : '➕ Log Progress'}
          </button>
        </div>

        <div id="stats-container">
          <div className="stat-box">
            Days Logged: <strong id="total-days-display">{logs.length}</strong>
          </div>
          <div className="stat-box">
            Course: <strong id="current-course-display">{course ? course.name : '...'}</strong>
          </div>
        </div>

        <div className="search-container">
          <input
            type="text"
            id="search-input"
            placeholder="🔍 Search topics or learnings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {error && <div className="daily-learning-tracker-error">{error}</div>}

        {formVisible && (
          <div id="log-form-container" style={{ display: 'block' }}>
            <form id="daily-log-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Topic Link / Video URL</label>
                  <input
                    type="url"
                    id="learning-link"
                    placeholder="https://..."
                    required
                    value={learningLink}
                    onChange={(e) => setLearningLink(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Topic Covered</label>
                  <input type="text" id="topic-learned" required value={topicLearned} onChange={(e) => setTopicLearned(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Date Studied</label>
                  <input type="date" id="log-date" required value={logDate} onChange={(e) => setLogDate(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Key Takeaways</label>
                <textarea
                  id="learnings-message"
                  rows="4"
                  required
                  value={learningsMessage}
                  onChange={(e) => setLearningsMessage(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-log" id="submit-log-button">
                {editId ? '💾 Update Progress' : '💾 Save Progress'}
              </button>
            </form>
          </div>
        )}

        <h3>Progress History</h3>
        <ul id="daily-progress-list">
          {loading ? (
            <li style={{ textAlign: 'center', padding: '20px', color: '#888' }}>Loading...</li>
          ) : filteredLogs.length === 0 ? (
            <li style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No history found.</li>
          ) : (
            filteredLogs.map((log) => (
              <li className="progress-item" key={log.id}>
                <div className="progress-header">
                  <div className="progress-title">{log.topic}</div>
                  <div className="progress-meta">
                    <small>{log.date}</small>
                    {log.link && (
                      <a href={log.link} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', marginLeft: '10px' }}>
                        🔗
                      </a>
                    )}
                  </div>
                  <div className="progress-actions">
                    <button type="button" data-action="edit" onClick={() => editEntry(log)}>
                      ✏️
                    </button>
                    <button type="button" onClick={() => deleteEntry(log.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="progress-learnings">
                  {log.learnings.split('\n').map((line, i, arr) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < arr.length - 1 ? <br /> : null}
                    </React.Fragment>
                  ))}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

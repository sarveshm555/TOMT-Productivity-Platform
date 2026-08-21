import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import * as codingProfileService from '../api/codingProfileService.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import './DailyCodingLogPage.css';

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Ports daily-coding-log.html exactly - same markup, classes, copy, stats
 * (Total Solved / Solved Today / profile link), search-filter, and
 * add/edit form toggle. The original's `currentCodingProfile` localStorage
 * handoff is replaced with a real `:profileId` route param (see
 * CodingProfilesPage.jsx's viewLog()) - a route param can't silently point
 * at a profile that no longer exists the way a stale localStorage key
 * could, which is a real (if minor) fidelity improvement.
 */
export default function DailyCodingLogPage() {
  const { profileId } = useParams();

  const [profile, setProfile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [editId, setEditId] = useState('');
  const [questionName, setQuestionName] = useState('');
  const [language, setLanguage] = useState('Python');
  const [logDate, setLogDate] = useState(getTodayDateString());
  const [learnings, setLearnings] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  const [deletingLogId, setDeletingLogId] = useState(null);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  useEffect(() => {
    document.title = profile ? `Log: ${profile.name}` : 'Daily Coding Log';
  }, [profile]);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [p, l] = await Promise.all([codingProfileService.getCodingProfile(profileId), codingProfileService.listLogs(profileId)]);
      setProfile(p);
      setLogs(l);
    } catch (err) {
      setError('Could not load this coding profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return logs.filter((log) => `${log.question} ${log.language} ${log.learnings}`.toLowerCase().includes(term));
  }, [logs, searchTerm]);

  const solvedToday = useMemo(() => {
    const today = getTodayDateString();
    return logs.filter((log) => log.date === today).length;
  }, [logs]);

  const totalSolved = (profile ? profile.totalProblems || 0 : 0) + logs.length;

  function resetForm() {
    setEditId('');
    setQuestionName('');
    setLanguage('Python');
    setLogDate(getTodayDateString());
    setLearnings('');
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
    const payload = { question: questionName.trim(), language, date: logDate, learnings: learnings.trim() };

    try {
      if (editId) {
        const updated = await codingProfileService.updateLog(profileId, editId, payload);
        setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const created = await codingProfileService.createLog(profileId, payload);
        setLogs((prev) => [created, ...prev]);
      }
      resetForm();
      setFormVisible(false);
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not save log entry.';
      setError(message);
    }
  }

  function editEntry(log) {
    setEditId(log.id);
    setQuestionName(log.question);
    setLanguage(log.language);
    setLogDate(log.date);
    setLearnings(log.learnings);
    setFormVisible(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteEntry(id) {
    try {
      await codingProfileService.deleteLog(profileId, id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError('Could not delete log entry. Please try again.');
    }
  }

  const activeDeletingLog = logs.find((l) => l.id === deletingLogId);

  return (
    <div className="daily-coding-log-page-root">
      <div className="app-container">
        <h2 id="log-header-title">{profile ? `Log: ${profile.name}` : 'Daily Coding Log'}</h2>

        <div className="header-actions">
          <Link to="/placement/coding-profiles" className="btn-back-profiles">
            ← Profiles
          </Link>
          <button type="button" id="toggle-form-btn" className="btn-add-toggle" onClick={toggleForm}>
            {formVisible ? '❌ Close Form' : '➕ Add New Log'}
          </button>
        </div>

        <div id="stats-container">
          <div className="stat-box">
            Total Solved: <strong id="total-solved-display">{totalSolved}</strong>
          </div>
          <div className="stat-box">
            Solved Today: <strong id="solved-today-display">{solvedToday}</strong>
          </div>
          <div className="stat-box">
            Profile:{' '}
            <span>
              <a id="profile-link-node" href={profile ? profile.link : '#'} target="_blank" rel="noreferrer">
                View Profile
              </a>
            </span>
          </div>
        </div>

        <div className="search-container">
          <input
            type="text"
            id="search-input"
            placeholder="🔍 Search problems by title or language..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {error && <div className="daily-coding-log-error">{error}</div>}

        {formVisible && (
          <div id="log-form-container" style={{ display: 'block' }}>
            <form id="daily-log-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Question Title</label>
                  <input
                    type="text"
                    id="question-name"
                    required
                    placeholder="Enter question name"
                    value={questionName}
                    onChange={(e) => setQuestionName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Language</label>
                  <select id="language-used" value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="Python">Python</option>
                    <option value="Java">Java</option>
                    <option value="C++">C++</option>
                    <option value="JavaScript">JavaScript</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date Solved</label>
                  <input type="date" id="log-date" required value={logDate} onChange={(e) => setLogDate(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Key Concepts</label>
                <textarea id="learnings" rows="4" required placeholder="What did you learn?" value={learnings} onChange={(e) => setLearnings(e.target.value)} />
              </div>
              <button type="submit" className="btn-log" id="submit-log-button">
                {editId ? '💾 Save Changes' : '➕ Log Problem'}
              </button>
            </form>
          </div>
        )}

        <h3>Recent Problems</h3>
        <ul id="daily-log-list">
          {loading ? (
            <li style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>Loading...</li>
          ) : filteredLogs.length === 0 ? (
            <li style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>No entries yet.</li>
          ) : (
            filteredLogs.map((log) => (
              <li className="log-item" key={log.id}>
                <div className="log-header">
                  <div className="log-title">{log.question}</div>
                  <div className="log-actions">
                    <button type="button" onClick={() => editEntry(log)}>
                      ✏️
                    </button>
                    <button type="button" onClick={() => setDeletingLogId(log.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="log-meta">
                  {log.date} | <strong>{log.language}</strong>
                </div>
                <div style={{ fontSize: '0.85em', marginTop: '8px', color: 'var(--text-color)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                  {log.learnings}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <ConfirmDeleteModal
        isOpen={deletingLogId !== null}
        title="Delete Problem Log?"
        message="Are you sure you want to permanently delete this problem log entry? This action cannot be undone."
        itemPreview={activeDeletingLog ? `"${activeDeletingLog.question}"` : null}
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

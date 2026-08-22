import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

import * as targetService from '../api/targetService.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import './TargetsPage.css';

/**
 * Ports target.html exactly - same markup, classes, copy, and validation.
 * The only functional change: `futureGoalsTracker` localStorage reads/writes
 * are replaced with GET/POST/PUT/DELETE /api/targets calls, and
 * calculateStatus() now runs server-side (see targetController.js) instead
 * of client-side - the frontend just reads `target.status` from the API
 * response. Client-side search filtering (filterGoals()) is preserved
 * exactly as-is, operating on the already-fetched list.
 */
export default function TargetsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [deletingGoalId, setDeletingGoalId] = useState(null);

  useEffect(() => {
    document.title = 'Life Manager App - Future Goals Tracker';
  }, []);

  useEffect(() => {
    refreshGoals();
  }, []);

  async function refreshGoals() {
    setLoading(true);
    setLoadError('');
    try {
      const data = await targetService.listTargets();
      setGoals(data);
    } catch (err) {
      setLoadError('Could not load targets. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function toggleAddForm() {
    if (formVisible) {
      resetForm();
      setFormVisible(false);
    } else {
      setFormVisible(true);
    }
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setTargetDate('');
    setProgressNote('');
    setFormError('');
  }

  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  }

  // Ported from renderGoals()'s filter step - client-side search over the
  // already-fetched list, same as the original operating on already-loaded
  // localStorage data.
  const filteredGoals = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return goals.filter((g) => g.name.toLowerCase().includes(term));
  }, [goals, searchTerm]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !targetDate) {
      // Native `required` attributes on the inputs already block empty
      // submits in the browser, matching the original form's behavior.
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload = { name: trimmedName, targetDate, progressNote: progressNote.trim() };
      if (editingId) {
        const updated = await targetService.updateTarget(editingId, payload);
        setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      } else {
        const created = await targetService.createTarget(payload);
        setGoals((prev) => [...prev, created].sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate)));
      }
      resetForm();
      setFormVisible(false);
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not save target.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function editGoal(goal) {
    setEditingId(goal.id);
    setName(goal.name);
    // API returns an ISO datetime; the <input type="date"> needs YYYY-MM-DD.
    setTargetDate(new Date(goal.targetDate).toISOString().slice(0, 10));
    setProgressNote(goal.progressNote || '');
    setFormVisible(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteGoal(id) {
    try {
      await targetService.deleteTarget(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      setLoadError('Could not delete target. Please try again.');
    }
  }

  const activeDeletingGoal = goals.find((g) => g.id === deletingGoalId);

  return (
    <div className="targets-page-root">
      <div className="app-container">
        <div className="top-nav-stack">
          <Link to="/dashboard" className="go-to-dashboard-btn">
            🏠 Back to Dashboard
          </Link>
          <button type="button" className="btn-toggle-add" onClick={toggleAddForm}>
            {formVisible ? '❌ Close Form' : '➕ Add New Target'}
          </button>
        </div>

        <h2>🎯 Future Goals &amp; Target Tracker</h2>

        <div className="content">
          <div className="search-container">
            <input
              type="text"
              id="search-input"
              placeholder="🔍 Search goals & targets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {formVisible && (
            <div id="goal-form-container">
              <form id="goal-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="goal-name">Target / Goal Name (e.g., Save ₹5 Lakhs, Learn Rust)</label>
                  <input
                    type="text"
                    id="goal-name"
                    required
                    placeholder="Enter target description..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="target-date">Target Date (Deadline)</label>
                    <input
                      type="date"
                      id="target-date"
                      required
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group full-flex">
                    <label htmlFor="progress-note">Progress Note (Optional)</label>
                    <textarea
                      id="progress-note"
                      rows="1"
                      placeholder="e.g., Saved 20%, researching models."
                      value={progressNote}
                      onChange={(e) => setProgressNote(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn-save-target" id="submit-button" disabled={submitting}>
                  {editingId ? '💾 Save Changes' : '✨ Add Target Goal'}
                </button>
                {formError && <div className="targets-form-error">{formError}</div>}
              </form>
            </div>
          )}

          <div className="list-header">Active Goals &amp; Targets</div>

          {loadError && <div className="targets-form-error">{loadError}</div>}

          <ul id="goals-list">
            {loading ? (
              <li className="targets-empty-state">
                <div className="empty-text">Loading goals...</div>
              </li>
            ) : filteredGoals.length === 0 ? (
              <li className="targets-empty-state">
                <div className="empty-icon">🎯</div>
                <div className="empty-text">No active goals found</div>
                <div className="empty-subtext">Click "Add New Target" above to set your future milestones.</div>
              </li>
            ) : (
              filteredGoals.map((goal) => {
                const isOverdue = goal.status === 'Overdue';
                return (
                  <li key={goal.id} className={`goal-item${isOverdue ? ' status-overdue' : ''}`}>
                    <div className="goal-header">
                      <div className="goal-title-wrapper">
                        <span className="goal-name">{goal.name}</span>
                        <span className={`goal-status-badge ${isOverdue ? 'badge-overdue' : 'badge-active'}`}>
                          {isOverdue ? '⚠️ Overdue' : '🎯 In Progress'}
                        </span>
                      </div>
                      <div className="goal-date">
                        🗓️ Deadline: <strong>{formatDate(goal.targetDate)}</strong>
                      </div>
                    </div>
                    {goal.progressNote ? (
                      <div className="progress-note-box">
                        <span className="note-label">Note:</span> {goal.progressNote}
                      </div>
                    ) : null}
                    <div className="goal-actions">
                      <button type="button" className="action-btn btn-edit" onClick={() => editGoal(goal)}>
                        ✏️ Edit Goal
                      </button>
                      <button type="button" className="delete-btn" onClick={() => setDeletingGoalId(goal.id)} title="Delete Goal">
                        🗑️
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={deletingGoalId !== null}
        title="Delete Goal?"
        message="Are you sure you want to permanently delete this goal? This action cannot be undone."
        itemPreview={activeDeletingGoal ? `"${activeDeletingGoal.name}"` : null}
        confirmWord="DELETE"
        onClose={() => setDeletingGoalId(null)}
        onConfirm={async () => {
          const id = deletingGoalId;
          setDeletingGoalId(null);
          await deleteGoal(id);
        }}
      />
    </div>
  );
}

import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

import * as rememberService from '../api/rememberService.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import './RememberBlockPage.css';

/**
 * Ports remember_block.html exactly - same markup, classes, copy, and
 * sort order (priorityOrder: High > Medium > Low > No Priority, then
 * soonest due date). The active/history split and sorting now happen via
 * GET /api/remember instead of two localStorage arrays (see
 * rememberController.js) - the frontend just renders what it's given.
 */
export default function RememberBlockPage() {
  const [activeTasks, setActiveTasks] = useState([]);
  const [historyTasks, setHistoryTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [priority, setPriority] = useState('No Priority');
  const [dueDate, setDueDate] = useState('');
  const [addError, setAddError] = useState('');

  const [historyVisible, setHistoryVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [deletingTaskId, setDeletingTaskId] = useState(null);

  useEffect(() => {
    document.title = 'Remember Block - Quick Notes';
  }, []);

  useEffect(() => {
    refreshData();
  }, []);

  async function refreshData() {
    setLoading(true);
    setLoadError('');
    try {
      const data = await rememberService.listRememberTasks();
      setActiveTasks(data.active);
      setHistoryTasks(data.history);
    } catch (err) {
      setLoadError('Could not load reminders. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function toggleAddForm() {
    setFormVisible((v) => !v);
    setAddError('');
  }

  function toggleHistory() {
    setHistoryVisible((v) => !v);
  }

  function formatDueDateForDisplay(dateString) {
    if (!dateString) return 'No Due Date';
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const filteredActiveTasks = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return activeTasks.filter((t) => t.text.toLowerCase().includes(term));
  }, [activeTasks, searchTerm]);

  async function addTask() {
    const text = taskText.trim();
    if (!text) {
      // eslint-disable-next-line no-alert
      window.alert('Enter task text');
      return;
    }
    try {
      const created = await rememberService.createRememberTask({ text, priority, dueDate: dueDate || null });
      setActiveTasks((prev) => [...prev, created]);
      setTaskText('');
      setPriority('No Priority');
      setDueDate('');
      setFormVisible(false);
      setAddError('');
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not add reminder.';
      setAddError(message);
    }
  }

  async function confirmComplete(id) {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Complete task?')) return;
    try {
      const completed = await rememberService.completeRememberTask(id);
      setActiveTasks((prev) => prev.filter((t) => t.id !== id));
      setHistoryTasks((prev) => [completed, ...prev]);
    } catch (err) {
      setLoadError('Could not complete reminder. Please try again.');
    }
  }

  async function deleteTask(id) {
    try {
      await rememberService.deleteRememberTask(id);
      setActiveTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setLoadError('Could not delete reminder. Please try again.');
    }
  }

  const activeDeletingTask = activeTasks.find((t) => t.id === deletingTaskId);

  return (
    <div className="remember-page-root">
      <div className="app-container">
        <div className="top-nav-stack">
          <Link to="/dashboard" className="go-to-dashboard-btn">
            🏠 Back to Dashboard
          </Link>
          <button type="button" className="btn-toggle-add" onClick={toggleAddForm}>
            {formVisible ? '❌ Close Form' : '➕ Add Priority Task'}
          </button>
        </div>

        <h2>📌 Quick Remember Block</h2>

        <div className="content">
          <div className="search-box">
            <input
              type="text"
              id="search-input"
              placeholder="🔍 Search active reminders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {formVisible && (
            <div id="add-form-container">
              <textarea
                id="task-input"
                placeholder="Enter new note or task to remember..."
                rows="2"
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
              />
              <div className="form-row">
                <div>
                  <label htmlFor="priority-select">Priority</label>
                  <select id="priority-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="No Priority">No Priority</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="due-date-input">Due Date (Optional)</label>
                  <input
                    type="date"
                    id="due-date-input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              <button id="add-note-btn" type="button" onClick={addTask}>
                ✨ Save Priority Task
              </button>
              {addError && <div className="remember-form-error">{addError}</div>}
            </div>
          )}

          <div className="list-header">Active Reminders</div>

          {loadError && <div className="remember-form-error">{loadError}</div>}

          <ul id="active-tasks-container">
            {loading ? (
              <li className="remember-empty-state">
                <div className="empty-text">Loading reminders...</div>
              </li>
            ) : filteredActiveTasks.length === 0 ? (
              <li className="remember-empty-state">
                <div className="empty-icon">📌</div>
                <div className="empty-text">No active reminders found</div>
                <div className="empty-subtext">Click "Add Priority Task" above to save quick notes & reminders.</div>
              </li>
            ) : (
              filteredActiveTasks.map((task) => (
                <li
                  key={task.id}
                  className={`task-item priority-${task.priority.toLowerCase().replace(' ', '-')}`}
                >
                  <div className="task-details">
                    <span className="task-title-text">{task.text}</span>
                    <div className="task-meta">
                      <span className={`priority-badge badge-${task.priority.toLowerCase().replace(' ', '-')}`}>
                        {task.priority}
                      </span>
                      <span className="due-date-label">Due: {formatDueDateForDisplay(task.dueDate)}</span>
                    </div>
                  </div>
                  <div className="task-actions">
                    <button type="button" className="action-btn complete-btn" onClick={() => confirmComplete(task.id)}>
                      ✅ Done
                    </button>
                    <button type="button" className="delete-btn" onClick={() => setDeletingTaskId(task.id)} title="Delete Reminder">
                      🗑️
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>

          <button id="toggle-history-btn" type="button" onClick={toggleHistory}>
            {historyVisible ? '🔒 Hide History' : '📜 View Completed History'}
          </button>

          {historyVisible && (
            <div id="history-section">
              <ul id="history-container">
                {historyTasks.length === 0 ? (
                  <li className="remember-empty-state">
                    <div className="empty-subtext">No completed history records yet.</div>
                  </li>
                ) : (
                  historyTasks.map((t) => (
                    <li key={t.id} className="history-item">
                      <span className="history-text">{t.text}</span>
                      <div className="history-completed-tag">✅ Completed</div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={deletingTaskId !== null}
        title="Delete Reminder?"
        message="Are you sure you want to permanently delete this reminder? This action cannot be undone."
        itemPreview={activeDeletingTask ? `"${activeDeletingTask.text}"` : null}
        confirmWord="DELETE"
        onClose={() => setDeletingTaskId(null)}
        onConfirm={async () => {
          const id = deletingTaskId;
          setDeletingTaskId(null);
          await deleteTask(id);
        }}
      />
    </div>
  );
}

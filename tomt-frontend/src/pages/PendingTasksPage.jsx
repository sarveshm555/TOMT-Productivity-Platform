import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import * as pendingTaskService from '../api/pendingTaskService.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import './PendingTasksPage.css';

/**
 * Ports pending-tasks.html exactly - same markup, classes, copy, and modal
 * behavior. localStorage reads/writes are replaced with the
 * /api/pending-tasks/* endpoints (see pendingTaskController.js); "Complete"
 * and "Move All" now write into the shared ScheduleHistory/ScheduleTask
 * collections server-side instead of two more localStorage keys, but the
 * user-visible behavior (and alert() copy) is unchanged.
 */
export default function PendingTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskPriority, setTaskPriority] = useState('No Priority');

  const [historyVisible, setHistoryVisible] = useState(false);
  const [history, setHistory] = useState([]);

  const [deletingTaskId, setDeletingTaskId] = useState(null);

  useEffect(() => {
    document.title = 'Life Manager App - Pending Tasks';
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      setTasks(await pendingTaskService.listPendingTasks());
    } catch (err) {
      setError('Could not load pending tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    try {
      const created = await pendingTaskService.createPendingTask({
        task: taskName,
        dueDate: taskDate,
        priority: taskPriority,
      });
      setTasks((prev) => [...prev, created]);
      setTaskName('');
      setTaskDate('');
      setTaskPriority('No Priority');
      closeModal();
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not add task.';
      setError(message);
    }
  }

  async function completeTask(id) {
    try {
      await pendingTaskService.completePendingTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError('Could not complete task. Please try again.');
    }
  }

  async function deleteTask(id) {
    try {
      await pendingTaskService.deletePendingTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError('Could not delete task. Please try again.');
    }
  }

  async function moveAllPending() {
    if (tasks.length === 0) {
      // eslint-disable-next-line no-alert
      window.alert('Nothing to move!');
      return;
    }
    try {
      await pendingTaskService.moveAllToSchedule();
      setTasks([]);
      // eslint-disable-next-line no-alert
      window.alert("Moved to Today's Schedule!");
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not move tasks.';
      // eslint-disable-next-line no-alert
      window.alert(message);
    }
  }

  async function toggleHistory() {
    const next = !historyVisible;
    setHistoryVisible(next);
    if (next) {
      try {
        setHistory(await pendingTaskService.listPendingTaskHistory());
      } catch (err) {
        setError('Could not load history. Please try again.');
      }
    }
  }

  const activeDeletingTask = tasks.find((t) => t.id === deletingTaskId);

  return (
    <div className="pending-tasks-page-root">
      <div className="app-container">
        <div className="top-nav-stack">
          <Link to="/dashboard" className="go-to-dashboard-btn">
            🏠 Back to Dashboard
          </Link>
        </div>

        <h2>⏳ Past Pending Task Manager</h2>

        <div className="content-wrapper">
          <p className="subtitle">Carry over incomplete goals or manually add tasks from previous sessions.</p>

          <div className="btn-container">
            <button type="button" className="btn-stylized btn-primary" id="open-past-task-modal" onClick={openModal}>
              ➕ Add Past Pending Task
            </button>
            <button type="button" className="btn-stylized btn-secondary" id="move-all-pending" onClick={moveAllPending}>
              🔄 Move All to Today&rsquo;s Schedule
            </button>
          </div>

          <div className="tasks-heading">Current Pending List</div>

          {error && <div className="pending-tasks-error">{error}</div>}

          <ul id="pending-tasks-list" className="tasks-list">
            {loading ? (
              <li className="pending-empty-state">
                <div className="empty-text">Loading pending tasks...</div>
              </li>
            ) : tasks.length === 0 ? (
              <li className="pending-empty-state">
                <div className="empty-icon">⏳</div>
                <div className="empty-text">No pending tasks</div>
                <div className="empty-subtext">All past tasks have been moved or completed!</div>
              </li>
            ) : (
              tasks.map((t) => (
                <li className="task-item" key={t.id}>
                  <div className="task-details">
                    <span className="task-name">{t.task}</span>
                    {t.dueDate && <span className="task-due-date">Due: {t.dueDate}</span>}
                  </div>
                  <div className="task-actions">
                    <span className={`priority-tag priority-${t.priority.replace(' ', '-')}`}>{t.priority}</span>
                    <button type="button" className="btn-complete" onClick={() => completeTask(t.id)}>
                      ✅ Complete
                    </button>
                    <button type="button" className="delete-task-btn" onClick={() => setDeletingTaskId(t.id)} title="Delete Task">
                      🗑️
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>

          <button type="button" id="toggle-history-btn" onClick={toggleHistory}>
            {historyVisible ? '🔒 Hide History' : '⌚ View Completed History'}
          </button>
          {historyVisible && (
            <div id="history-section">
              <div className="tasks-heading history-heading">
                Completed History
              </div>
              <ul id="pending-history-list" className="tasks-list">
                {history.length === 0 ? (
                  <li className="pending-empty-state">
                    <div className="empty-subtext">No completed pending task history yet.</div>
                  </li>
                ) : (
                  history.map((h) => (
                    <li className="task-item history-item" key={h.id}>
                      <span className="history-task-name">✅ {h.task}</span>
                      <small className="history-task-date">{new Date(h.completedAt).toLocaleDateString('en-GB')}</small>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div id="past-task-modal" className={`modal-backdrop${modalOpen ? ' visible' : ''}`}>
        <div className="modal-content">
          <h3>➕ Add Past Pending Task</h3>
          <form id="add-past-form" onSubmit={handleAddSubmit}>
            <div className="modal-field">
              <label htmlFor="past-task-name">Task Description</label>
              <input
                type="text"
                id="past-task-name"
                placeholder="Enter task details..."
                required
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
              />
            </div>
            <div className="modal-row">
              <div className="modal-field">
                <label htmlFor="past-task-date">Due Date</label>
                <input type="date" id="past-task-date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
              </div>
              <div className="modal-field">
                <label htmlFor="past-task-priority">Priority</label>
                <select id="past-task-priority" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                  <option value="No Priority">No Priority</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="close-modal-btn" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="submit-modal-btn">
                ✨ Add Task
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={deletingTaskId !== null}
        title="Delete Pending Task?"
        message="Are you sure you want to permanently delete this pending task? This action cannot be undone."
        itemPreview={activeDeletingTask ? `"${activeDeletingTask.task}"` : null}
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

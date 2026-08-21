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
        <div className="back-home-container">
          <Link to="/hub" className="back-home-button">
            🏠 Back to Dashboard
          </Link>
        </div>

        <div className="flip-wrapper">
          <div className="content-wrapper">
            <div id="pending-tasks">
              <h2>⏳ Past Pending Task Manager</h2>
              <p>Carry over incomplete goals or manually add tasks from previous sessions.</p>

              <div className="btn-container">
                <button type="button" className="btn-stylized" id="open-past-task-modal" onClick={openModal}>
                  ➕ Add Past Pending Task
                </button>
                <button type="button" className="btn-stylized" id="move-all-pending" onClick={moveAllPending}>
                  🔄 Move All to Today&rsquo;s Schedule
                </button>
              </div>

              <h3 className="tasks-heading">Current Pending List</h3>

              {error && <div className="pending-tasks-error">{error}</div>}

              <ul id="pending-tasks-list" className="tasks-list">
                {loading ? (
                  <li style={{ textAlign: 'center', padding: '20px', color: '#555' }}>Loading...</li>
                ) : tasks.length === 0 ? (
                  <li style={{ textAlign: 'center', padding: '20px', color: '#555' }}>No pending tasks.</li>
                ) : (
                  tasks.map((t) => (
                    <li className="task-item" key={t.id}>
                      <span className="task-name">
                        {t.task} <br />
                        <small style={{ color: '#666' }}>{t.dueDate || ''}</small>
                      </span>
                      <div className="task-actions">
                        <span className={`priority-tag priority-${t.priority.replace(' ', '-')}`}>{t.priority}</span>
                        <button type="button" className="btn-complete" onClick={() => completeTask(t.id)}>
                          Complete
                        </button>
                        <button type="button" className="delete-task-btn" onClick={() => setDeletingTaskId(t.id)}>
                          🗑️
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>

              <button type="button" id="toggle-history-btn" onClick={toggleHistory}>
                ⌚ View History
              </button>
              <div id="history-section" style={{ display: historyVisible ? 'block' : 'none' }}>
                <h3 className="tasks-heading" style={{ borderBottomColor: 'var(--history-color)', color: 'var(--history-color)' }}>
                  Completed History
                </h3>
                <ul id="pending-history-list" className="tasks-list">
                  {history.map((h) => (
                    <li className="task-item" style={{ opacity: 0.6 }} key={h.id}>
                      <span>
                        ✅ {h.task} <br />
                        <small>{new Date(h.completedAt).toLocaleDateString('en-GB')}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="past-task-modal" className={`modal-backdrop${modalOpen ? ' visible' : ''}`}>
        <div className="modal-content">
          <h3>Add Past Pending Task</h3>
          <form id="add-past-form" onSubmit={handleAddSubmit}>
            <input
              type="text"
              id="past-task-name"
              placeholder="Task description..."
              required
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
            />
            <label>Due Date</label>
            <input type="date" id="past-task-date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
            <label>Priority</label>
            <select id="past-task-priority" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
              <option value="No Priority">No Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '15px' }}>
              <button type="submit" className="btn-complete" style={{ padding: '10px 20px' }}>
                Add
              </button>
              <button
                type="button"
                className="close-modal"
                style={{ background: '#444', border: 'none', color: 'white', borderRadius: '4px', padding: '10px 20px', cursor: 'pointer' }}
                onClick={closeModal}
              >
                Cancel
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

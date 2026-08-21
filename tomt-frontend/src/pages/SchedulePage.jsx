import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import * as scheduleService from '../api/scheduleService.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import './SchedulePage.css';

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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime12hr(time24hr) {
  if (!time24hr || time24hr === 'N/A') return 'N/A';
  try {
    const [hours, minutes] = time24hr.split(':');
    const date = new Date(2000, 0, 1, hours, minutes);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) {
    return time24hr;
  }
}

function formatDateForDisplay(dateString) {
  if (!dateString) return 'N/A';
  const [year, month, day] = (dateString || '').split('-');
  if (!year || !month || !day) return dateString;
  return `${month}/${day}/${year}`;
}

// Ported 1:1 from schedule.html's saveToScheduleHistory() format string.
function formatHistoryDate(completedAt) {
  return new Date(completedAt)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/\//g, ' ');
}

const getPriorityClass = (priority) => `priority-${priority.toLowerCase().replace(' ', '-')}`;
const getPriorityTagColor = (priority) => {
  if (priority === 'High') return 'var(--high-priority)';
  if (priority === 'Medium') return 'var(--medium-priority)';
  if (priority === 'Low') return 'var(--low-priority)';
  return 'gray';
};

/**
 * Ports schedule.html exactly - same markup, classes, copy, sort order,
 * day-rollover behavior, and PDF export. localStorage reads/writes are
 * replaced with /api/schedule/* (see scheduleController.js), which itself
 * reuses the existing PendingTask/ScheduleHistory/RememberTask
 * collections/endpoints exactly like the original pages shared the same
 * localStorage keys.
 */
export default function SchedulePage() {
  const navigate = useNavigate();
  const [flippingOut, setFlippingOut] = useState(false);

  const [dailyTasks, setDailyTasks] = useState([]);
  const [pastPendingTasks, setPastPendingTasks] = useState([]);
  const [activeReminders, setActiveReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [now, setNow] = useState(new Date());

  const [modalOpen, setModalOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDate, setTaskDate] = useState(getTodayDateString());
  const [taskTime, setTaskTime] = useState('');
  const [taskPriority, setTaskPriority] = useState('No Priority');

  const [historyVisible, setHistoryVisible] = useState(false);
  const [history, setHistory] = useState([]);

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [deletingDailyTask, setDeletingDailyTask] = useState(null);
  const [deletingPendingTask, setDeletingPendingTask] = useState(null);

  const exportWrapperRef = useRef(null);
  const dayInfoRef = useRef(null);

  useEffect(() => {
    document.title = 'Life Manager App - Schedule';
  }, []);

  // Keep the clock updated every second, matching the original's
  // setTimeout(displayDailySchedule, 1000) self-scheduling loop.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [daily, pending, reminders] = await Promise.all([
        scheduleService.listTasks(), // runs day-rollover migration server-side
        scheduleService.listPendingTasks(),
        scheduleService.listRememberTasks(),
      ]);
      setDailyTasks(daily);
      setPastPendingTasks(pending);
      setActiveReminders(reminders.active);
    } catch (err) {
      setError('Could not load your schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleBackHome(e) {
    e.preventDefault();
    setFlippingOut(true);
    setTimeout(() => navigate('/hub'), 800);
  }

  function openModal() {
    setTaskName('');
    setTaskDate(getTodayDateString());
    setTaskTime('');
    setTaskPriority('No Priority');
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    const trimmed = taskName.trim();
    if (!trimmed || !taskDate) return;

    try {
      const tasks = await scheduleService.createTask({
        task: trimmed,
        dueDate: taskDate,
        time: taskTime || 'N/A',
        priority: taskPriority,
      });
      setDailyTasks(tasks);
      closeModal();
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not save task.';
      setError(message);
    }
  }

  async function clearAllTasks() {
    try {
      await scheduleService.clearAllTasks();
      setDailyTasks([]);
    } catch (err) {
      setError('Could not clear tasks. Please try again.');
    }
  }

  async function handleComplete(task) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Mark "${task.task}" as completed and save to Schedule History?`)) return;
    try {
      await scheduleService.completeTask(task.id);
      setDailyTasks((prev) => prev.filter((t) => t.id !== task.id));
      // eslint-disable-next-line no-alert
      window.alert('Task completed and saved to History!');
    } catch (err) {
      setError('Could not complete task. Please try again.');
    }
  }

  async function handleRemember(task) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Move "${task.task}" to Remember Block Active List?`)) return;
    try {
      await scheduleService.rememberTask(task.id);
      const reminders = await scheduleService.listRememberTasks();
      setActiveReminders(reminders.active);
      // eslint-disable-next-line no-alert
      window.alert('Task added to Active Reminders!');
    } catch (err) {
      setError('Could not update Remember Block. Please try again.');
    }
  }

  async function handleDeleteDaily(task) {
    try {
      await scheduleService.deleteTask(task.id);
      setDailyTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      setError('Could not delete task. Please try again.');
    }
  }

  async function handleDeletePending(task) {
    try {
      await scheduleService.deletePendingTask(task.id);
      setPastPendingTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      setError('Could not delete task. Please try again.');
    }
  }

  async function toggleHistory() {
    const next = !historyVisible;
    setHistoryVisible(next);
    if (next) {
      try {
        setHistory(await scheduleService.listScheduleHistory());
      } catch (err) {
        setError('Could not load history. Please try again.');
      }
    }
  }

  async function downloadSchedule() {
    try {
      await loadHtml2Pdf();
      const exportWrapper = exportWrapperRef.current;

      const printableContent = document.createElement('div');
      printableContent.className = 'printable-schedule';
      printableContent.style.padding = '20px';

      const headerInfo = document.createElement('div');
      headerInfo.innerHTML = `<h3>Daily Schedule Export</h3><p>${dayInfoRef.current ? dayInfoRef.current.innerHTML : ''}</p>`;
      printableContent.appendChild(headerInfo);
      printableContent.appendChild(exportWrapper.cloneNode(true));

      document.body.appendChild(printableContent);

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `todays-tasks-${getTodayDateString()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
      };

      await window.html2pdf().set(opt).from(printableContent).save();
      document.body.removeChild(printableContent);
    } catch (err) {
      // eslint-disable-next-line no-alert
      window.alert('PDF export failed. See console for details.');
      // eslint-disable-next-line no-console
      console.error('PDF export error:', err);
    }
  }

  const dayName = DAY_NAMES[now.getDay()];
  const formattedDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const todayStr = getTodayDateString();

  return (
    <div className="schedule-page-root">
      <div className="app-container">
        <div className="back-home-container">
          <a href="/hub" className="back-home-button" id="back-home-link" onClick={handleBackHome}>
            🏠 Back to Dashboard
          </a>
        </div>

        <div className={`flip-wrapper${flippingOut ? ' flip-out' : ''}`}>
          <div className="content-wrapper">
            <div id="schedule" className="tab-content active">
              <h2>Daily Task Manager</h2>

              <div className="schedule-header" id="current-day-info" ref={dayInfoRef}>
                <p>
                  <strong>Date:</strong> {formattedDate} ({dayName})
                </p>
                <p>
                  <strong>Current Time:</strong> {formattedTime}
                </p>
              </div>

              <div className="task-management-controls">
                <button type="button" className="add-button" id="open-task-modal" onClick={openModal}>
                  ➕ Add Task
                </button>
                <button type="button" className="action-button secondary" id="clear-all-tasks" onClick={() => setConfirmClearOpen(true)}>
                  🗑️ Clear All Tasks
                </button>
                <button type="button" className="action-button primary" id="download-schedule" onClick={downloadSchedule}>
                  ⬇️ Download PDF
                </button>
              </div>

              {error && <div className="schedule-error">{error}</div>}

              <h3 className="tasks-heading pending">Past Pending Tasks (High Priority)</h3>
              <ul id="past-pending-tasks-list" className="tasks-list">
                {!loading && pastPendingTasks.length === 0 ? (
                  <li className="task-item" style={{ borderLeft: '5px solid gray' }}>
                    No past pending tasks.
                  </li>
                ) : (
                  pastPendingTasks.map((task) => (
                    <li className="task-item past" key={task.id}>
                      <span className="task-time" style={{ color: '#800080' }}>
                        N/A
                      </span>
                      <span className="task-name">{task.task}</span>
                      <div className="task-actions">
                        <span className="priority-tag" style={{ color: 'white', backgroundColor: '#800080', padding: '2px 5px', borderRadius: '3px' }}>
                          PAST
                        </span>
                        <span
                          className="priority-tag"
                          style={{ color: getPriorityTagColor(task.priority), border: `1px solid ${getPriorityTagColor(task.priority)}` }}
                        >
                          {task.priority}
                        </span>
                        <button type="button" className="delete-task-btn" onClick={() => setDeletingPendingTask(task)}>
                          🗑️
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>

              <div id="today-tasks-export-wrapper" ref={exportWrapperRef}>
                <h3 className="tasks-heading">Today&rsquo;s Tasks</h3>
                <ul id="schedule-tasks-list" className="tasks-list">
                  {!loading && dailyTasks.length === 0 ? (
                    <li className="task-item pending" style={{ borderLeft: '5px solid #ff9800' }}>
                      No tasks scheduled for today. Click &ldquo;➕ Add Task&rdquo; to begin!
                    </li>
                  ) : (
                    dailyTasks.map((task) => {
                      const isActiveRemembered = activeReminders.some((rt) => rt.text === task.task && rt.priority === task.priority);
                      const formattedTaskTime = formatTime12hr(task.time);
                      const taskDateDisplay =
                        task.dueDate !== todayStr ? (
                          <span style={{ fontSize: '0.8em', color: 'var(--primary-color)', marginRight: '5px' }}>
                            ({formatDateForDisplay(task.dueDate)})
                          </span>
                        ) : null;

                      return (
                        <li className={`task-item ${task.completed ? 'completed' : 'pending'}`} key={task.id}>
                          <span className="task-time">{formattedTaskTime}</span>
                          <span className="task-name">
                            {taskDateDisplay}
                            {task.task}
                          </span>
                          <div className="task-actions">
                            <span className={`priority-tag ${getPriorityClass(task.priority)}`}>{task.priority}</span>
                            <button
                              type="button"
                              className={`task-action-btn ${isActiveRemembered ? 'btn-remembered' : 'btn-remember'}`}
                              disabled={isActiveRemembered}
                              onClick={() => handleRemember(task)}
                            >
                              {isActiveRemembered ? 'Remembered' : 'Remember'}
                            </button>
                            <button type="button" className="task-action-btn btn-complete" onClick={() => handleComplete(task)}>
                              Complete
                            </button>
                            <button type="button" className="delete-task-btn" onClick={() => setDeletingDailyTask(task)}>
                              🗑️
                            </button>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>

              <button type="button" id="toggle-history-btn" onClick={toggleHistory}>
                {historyVisible ? '❌ Hide History' : '⌚ View History'}
              </button>

              <div id="schedule-history-section" style={{ display: historyVisible ? 'block' : 'none' }}>
                <h3 className="tasks-heading history">Schedule History</h3>
                <ul id="schedule-history-list" className="tasks-list">
                  {history.length === 0 ? (
                    <li className="history-item-schedule">History is currently empty.</li>
                  ) : (
                    history.map((h) => (
                      <li className="history-item-schedule" key={h.id}>
                        <strong>✅ Completed:</strong> {h.task}
                        <span>({formatHistoryDate(h.completedAt)})</span>
                        <small style={{ color: 'gray', marginLeft: '10px' }}>Priority: {h.priority}</small>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="task-modal" className={`modal-backdrop${modalOpen ? ' visible' : ''}`}>
        <div className="modal-content">
          <h3>Add New Task</h3>
          <form id="task-form" onSubmit={handleAddSubmit}>
            <input
              type="text"
              id="task-name-input"
              placeholder="Task description"
              required
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
            />

            <div className="form-row">
              <div>
                <label htmlFor="task-date-input">Due Date (Default: Today)</label>
                <input type="date" id="task-date-input" required value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
              </div>
              <div>
                <label htmlFor="task-time-input">Time (Optional)</label>
                <input type="time" id="task-time-input" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} />
              </div>
              <div>
                <label htmlFor="task-priority-input">Priority</label>
                <select id="task-priority-input" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                  <option value="No Priority">No Priority</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button type="submit" id="save-task" className="action-button primary">
                Save Task
              </button>
              <button type="button" className="close-task-modal action-button secondary" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={confirmClearOpen}
        title="Clear All Today's Tasks?"
        message="WARNING: This will clear ALL tasks for today's schedule. Proceed?"
        confirmWord="DELETE"
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={async () => {
          setConfirmClearOpen(false);
          await clearAllTasks();
        }}
      />

      <ConfirmDeleteModal
        isOpen={deletingDailyTask !== null}
        title="Delete Schedule Task?"
        message="Are you sure you want to permanently delete this task? This action cannot be undone."
        itemPreview={deletingDailyTask ? `"${deletingDailyTask.task}"` : null}
        confirmWord="DELETE"
        onClose={() => setDeletingDailyTask(null)}
        onConfirm={async () => {
          const task = deletingDailyTask;
          setDeletingDailyTask(null);
          await handleDeleteDaily(task);
        }}
      />

      <ConfirmDeleteModal
        isOpen={deletingPendingTask !== null}
        title="Delete Past Pending Task?"
        message="Are you sure you want to permanently delete this task? This action cannot be undone."
        itemPreview={deletingPendingTask ? `"${deletingPendingTask.task}"` : null}
        confirmWord="DELETE"
        onClose={() => setDeletingPendingTask(null)}
        onConfirm={async () => {
          const task = deletingPendingTask;
          setDeletingPendingTask(null);
          await handleDeletePending(task);
        }}
      />
    </div>
  );
}

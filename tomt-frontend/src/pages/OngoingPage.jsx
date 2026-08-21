import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import * as monitoringService from '../api/monitoringService.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import './OngoingPage.css';

/**
 * Ports ongoing.html exactly - same markup, classes, copy, sort order, and
 * card states (high-priority badge, completed/green state, optional
 * link+message). Sort/priority computed server-side (ongoingTaskController.js).
 */
export default function OngoingPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [editId, setEditId] = useState('');
  const [procName, setProcName] = useState('');
  const [procDeadline, setProcDeadline] = useState('');
  const [procLink, setProcLink] = useState('');
  const [procMsg, setProcMsg] = useState('');
  const [formError, setFormError] = useState('');

  const [deletingTaskId, setDeletingTaskId] = useState(null);

  useEffect(() => {
    document.title = 'Ongoing Processes';
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setLoadError('');
    try {
      setTasks(await monitoringService.listOngoingTasks());
    } catch (err) {
      setLoadError('Could not load processes. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditId('');
    setProcName('');
    setProcDeadline('');
    setProcLink('');
    setProcMsg('');
    setFormError('');
  }

  function toggleForm() {
    setFormVisible((v) => {
      const next = !v;
      if (!next) resetForm();
      return next;
    });
  }

  async function saveTask() {
    if (!procName || !procDeadline) {
      // eslint-disable-next-line no-alert
      window.alert('Please enter Name and Deadline');
      return;
    }

    try {
      const payload = { name: procName, deadline: procDeadline, link: procLink, msg: procMsg };
      if (editId) {
        const updated = await monitoringService.updateOngoingTask(editId, payload);
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await monitoringService.createOngoingTask(payload);
        setTasks((prev) => [...prev, created]);
      }
      resetForm();
      setFormVisible(false);
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not save process.';
      setFormError(message);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      // eslint-disable-next-line no-alert
      window.alert('Link copied to clipboard!');
    });
  }

  async function markDone(id) {
    try {
      const updated = await monitoringService.markDone(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      setLoadError('Could not update process. Please try again.');
    }
  }

  async function deleteTask(id) {
    try {
      await monitoringService.deleteOngoingTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setLoadError('Could not delete process. Please try again.');
    }
  }

  function editTask(t) {
    setEditId(t.id);
    setProcName(t.name);
    setProcDeadline(t.deadline);
    setProcLink(t.link || '');
    setProcMsg(t.msg || '');
    setFormVisible(true);
    window.scrollTo(0, 0);
  }

  const activeDeletingTask = tasks.find((t) => t.id === deletingTaskId);

  return (
    <div className="ongoing-page-root">
      <div className="app-container">
        <Link to="/monitoring" className="back-button">
          🏠 Back
        </Link>
        <div className="header">
          <h2 style={{ color: 'var(--primary-color)', margin: 0 }}>🔄 Ongoing Processes</h2>
          <button type="button" className="btn-add" onClick={toggleForm}>
            ➕ Add New
          </button>
        </div>

        {formVisible && (
          <div id="form-container" style={{ display: 'block' }}>
            <input type="text" id="proc-name" placeholder="Process Name" value={procName} onChange={(e) => setProcName(e.target.value)} />
            <input type="date" id="proc-deadline" value={procDeadline} onChange={(e) => setProcDeadline(e.target.value)} />
            <input
              type="url"
              id="proc-link"
              placeholder="Profile/Application Link (Optional)"
              value={procLink}
              onChange={(e) => setProcLink(e.target.value)}
            />
            <textarea id="proc-msg" rows="3" placeholder="Message (Optional)" value={procMsg} onChange={(e) => setProcMsg(e.target.value)} />
            <button type="button" className="btn-add" style={{ width: '100%' }} onClick={saveTask}>
              Save Process
            </button>
            {formError && <div className="ongoing-form-error">{formError}</div>}
          </div>
        )}

        {loadError && <div className="ongoing-form-error">{loadError}</div>}

        <div className="task-list" id="task-list">
          {loading ? (
            <div style={{ textAlign: 'center', color: '#666', padding: '15px' }}>Loading...</div>
          ) : (
            tasks.map((t) => (
              <div
                key={t.id}
                className={`task-item ${t.completed ? 'completed' : ''} ${t.isHighPriority ? 'high-priority' : ''}`}
              >
                <div className="task-info">
                  {t.isHighPriority && <span className="priority-badge">🚨 IMMEDIATE ATTENTION</span>}
                  {t.completed && (
                    <span className="priority-badge" style={{ background: '#1b5e20' }}>
                      ✅ COMPLETED
                    </span>
                  )}
                  <strong>{t.name}</strong>
                  <small
                    style={{
                      color: t.completed ? 'white' : t.isHighPriority ? 'var(--priority-color)' : 'var(--secondary-color)',
                    }}
                  >
                    📅 Deadline: {t.deadline}
                  </small>
                  {t.msg && <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: '#888' }}>{t.msg}</p>}
                </div>
                <div className="task-actions">
                  {t.link && (
                    <>
                      <a href={t.link} target="_blank" rel="noreferrer" className="btn-link-action">
                        🔗 View
                      </a>
                      <button type="button" className="btn-link-action" onClick={() => copyToClipboard(t.link)}>
                        📋 Copy
                      </button>
                    </>
                  )}
                  {!t.completed ? (
                    <>
                      <button type="button" className="btn-status" onClick={() => markDone(t.id)}>
                        ✅ Done
                      </button>
                      <button type="button" className="btn-edit" onClick={() => editTask(t)}>
                        ✏️ Edit
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ color: 'white', fontWeight: 'bold', alignSelf: 'center', marginRight: '10px' }}>
                        Process Finished
                      </span>
                      <button type="button" className="btn-delete" onClick={() => setDeletingTaskId(t.id)}>
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={deletingTaskId !== null}
        title="Delete Ongoing Process?"
        message="Are you sure you want to permanently delete this process record? This action cannot be undone."
        itemPreview={activeDeletingTask ? `"${activeDeletingTask.name}"` : null}
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

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import * as monitoringService from '../api/monitoringService.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import './NeedToApplyPage.css';

/**
 * Ports needtoapply.html exactly - same markup, classes, copy, sort order,
 * and card states (high-priority badge, applied/green state). `isHighPriority`
 * and the sort are computed server-side now (applyTaskController.js) using
 * the identical formula; the frontend just reads `app.isHighPriority`.
 */
export default function NeedToApplyPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [editId, setEditId] = useState('');
  const [appName, setAppName] = useState('');
  const [appDeadline, setAppDeadline] = useState('');
  const [appLink, setAppLink] = useState('');
  const [formError, setFormError] = useState('');

  const [deletingAppId, setDeletingAppId] = useState(null);

  useEffect(() => {
    document.title = 'Need to Apply';
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setLoadError('');
    try {
      setApps(await monitoringService.listApplyTasks());
    } catch (err) {
      setLoadError('Could not load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function toggleForm() {
    setFormVisible((v) => !v);
  }

  function resetForm() {
    setEditId('');
    setAppName('');
    setAppDeadline('');
    setAppLink('');
    setFormError('');
  }

  async function saveApp() {
    if (!appName || !appDeadline || !appLink) {
      // eslint-disable-next-line no-alert
      window.alert('Please enter Name, Deadline, and Link');
      return;
    }

    try {
      if (editId) {
        const updated = await monitoringService.updateApplyTask(editId, {
          name: appName,
          deadline: appDeadline,
          link: appLink,
        });
        setApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      } else {
        const created = await monitoringService.createApplyTask({
          name: appName,
          deadline: appDeadline,
          link: appLink,
        });
        setApps((prev) => [...prev, created]);
      }
      resetForm();
      setFormVisible(false);
    } catch (err) {
      const message = (err.response && err.response.data && err.response.data.message) || 'Could not save application.';
      setFormError(message);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      // eslint-disable-next-line no-alert
      window.alert('Link copied!');
    });
  }

  async function markApplied(id) {
    try {
      const updated = await monitoringService.markApplied(id);
      setApps((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err) {
      setLoadError('Could not update application. Please try again.');
    }
  }

  async function deleteApp(id) {
    try {
      await monitoringService.deleteApplyTask(id);
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setLoadError('Could not delete application. Please try again.');
    }
  }

  function editApp(a) {
    setEditId(a.id);
    setAppName(a.name);
    setAppDeadline(a.deadline);
    setAppLink(a.link);
    setFormVisible(true);
    window.scrollTo(0, 0);
  }

  const activeDeletingApp = apps.find((a) => a.id === deletingAppId);

  return (
    <div className="apply-page-root">
      <div className="app-container">
        <Link to="/monitoring" className="back-button">
          🏠 Back
        </Link>
        <div className="header">
          <h2 style={{ color: 'var(--primary-color)', margin: 0 }}>📝 Need to Apply</h2>
          <button type="button" className="btn-add" onClick={toggleForm}>
            ➕ Add New
          </button>
        </div>

        {formVisible && (
          <div id="form-container" style={{ display: 'block' }}>
            <input type="text" id="app-name" placeholder="Application Name" value={appName} onChange={(e) => setAppName(e.target.value)} />
            <input type="date" id="app-deadline" value={appDeadline} onChange={(e) => setAppDeadline(e.target.value)} />
            <input
              type="url"
              id="app-link"
              placeholder="Application Link (https://...)"
              value={appLink}
              onChange={(e) => setAppLink(e.target.value)}
            />
            <button type="button" className="btn-add" style={{ width: '100%' }} onClick={saveApp}>
              Save Application
            </button>
            {formError && <div className="apply-form-error">{formError}</div>}
          </div>
        )}

        {loadError && <div className="apply-form-error">{loadError}</div>}

        <div className="task-list" id="task-list">
          {loading ? (
            <div style={{ textAlign: 'center', color: '#666', padding: '15px' }}>Loading...</div>
          ) : (
            apps.map((a) => (
              <div
                key={a.id}
                className={`task-item ${a.applied ? 'applied' : ''} ${a.isHighPriority ? 'high-priority' : ''}`}
              >
                <div className="task-info">
                  {a.isHighPriority && <span className="priority-badge">🚨 IMMEDIATE ATTENTION</span>}
                  {a.applied && (
                    <span className="priority-badge" style={{ background: '#1b5e20' }}>
                      ✅ APPLIED
                    </span>
                  )}
                  <strong>{a.name}</strong>
                  <small
                    style={{
                      color: a.applied ? 'white' : a.isHighPriority ? 'var(--priority-color)' : 'var(--primary-color)',
                    }}
                  >
                    📅 Deadline: {a.deadline}
                  </small>
                </div>
                <div className="task-actions">
                  <a
                    href={a.link}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-action"
                    style={a.applied ? { background: 'rgba(255,255,255,0.2)' } : undefined}
                  >
                    🔗 Open
                  </a>
                  {!a.applied ? (
                    <>
                      <button type="button" className="btn-action btn-copy" onClick={() => copyToClipboard(a.link)}>
                        📋 Copy
                      </button>
                      <button type="button" className="btn-status" onClick={() => markApplied(a.id)}>
                        🚀 Applied
                      </button>
                      <button type="button" className="btn-action" onClick={() => editApp(a)}>
                        ✏️
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ color: 'white', fontWeight: 'bold', alignSelf: 'center', marginRight: '10px' }}>
                        Success!
                      </span>
                      <button type="button" className="btn-action" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setDeletingAppId(a.id)}>
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
        isOpen={deletingAppId !== null}
        title="Delete Application Record?"
        message="Are you sure you want to permanently delete this application record? This action cannot be undone."
        itemPreview={activeDeletingApp ? `"${activeDeletingApp.name}"` : null}
        confirmWord="DELETE"
        onClose={() => setDeletingAppId(null)}
        onConfirm={async () => {
          const id = deletingAppId;
          setDeletingAppId(null);
          await deleteApp(id);
        }}
      />
    </div>
  );
}

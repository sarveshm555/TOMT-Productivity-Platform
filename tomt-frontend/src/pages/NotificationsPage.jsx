import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import * as notificationService from '../api/notificationService.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import './NotificationsPage.css';

/**
 * Ports notifications.html exactly - same markup, classes, copy, and
 * per-type border coloring. The three generator functions
 * (generateScheduleNotifications, generateDailyRoutineReminder,
 * generatePendingTasksNotification) now run server-side on every GET
 * (see notificationController.js), reading the already-migrated
 * ScheduleTask/RoutineHistory/PendingTask collections instead of three
 * separate localStorage keys - the frontend just polls and renders,
 * exactly like the original's `setInterval(renderNotifications, 60000)`.
 *
 * `notification-body` is rendered via dangerouslySetInnerHTML because the
 * original's bodies contain real `<a href>` links (and literal `**text**`
 * markers that were NEVER markdown-parsed in the original - preserved
 * exactly as literal asterisks, not converted to real bold).
 */
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [userName, setUserName] = useState('Life Manager User');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  useEffect(() => {
    document.title = 'Life Manager App - Notifications';
  }, []);

  useEffect(() => {
    refresh();
    // Ported from the original's setInterval(renderNotifications, 60000) -
    // continuous check for time-sensitive notifications every 60 seconds.
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    try {
      const data = await notificationService.listNotifications();
      setNotifications(data.notifications);
      setUserName(data.userName);
      setError('');
    } catch (err) {
      setError('Could not load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function clearAllNotifications() {
    try {
      await notificationService.clearAllNotifications();
      setNotifications([]);
    } catch (err) {
      setError('Could not clear notifications. Please try again.');
    }
  }

  return (
    <div className="notifications-page-root">
      <div className="app-container">
        <h2>🔔 Notification Center</h2>

        <div id="notifications-area">
          <h3>Current Notifications</h3>

          {error && <div className="notifications-error">{error}</div>}

          <ul id="notification-list">
            {!loading && notifications.length === 0 ? (
              <li className="notification-item notification-info">
                <div className="notification-header">All Clear, {userName}!</div>
                <div className="notification-body">No pending notifications at this time. All systems nominal.</div>
              </li>
            ) : (
              notifications.map((n) => (
                <li className={`notification-item notification-${n.type.replace(/\s/g, '-')}`} key={n.id}>
                  <div className="notification-header">
                    <span>{n.header}</span>
                    <span className="notification-time">{n.timestamp}</span>
                  </div>
                  {/* eslint-disable-next-line react/no-danger */}
                  <div className="notification-body" dangerouslySetInnerHTML={{ __html: n.body }} />
                </li>
              ))
            )}
          </ul>

          {notifications.length > 0 && (
            <button type="button" className="btn btn-clear" id="clear-notifications-btn" onClick={() => setConfirmClearOpen(true)}>
              🗑️ Clear All Notifications
            </button>
          )}
        </div>

        <div className="dashboard-footer">
          <Link to="/dashboard" className="go-to-dashboard-btn">
            ⬅️ Back to Dashboard
          </Link>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={confirmClearOpen}
        title="Clear All Notifications?"
        message="Are you sure you want to clear ALL visible notifications? This action cannot be undone."
        confirmWord="DELETE"
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={async () => {
          setConfirmClearOpen(false);
          await clearAllNotifications();
        }}
      />
    </div>
  );
}

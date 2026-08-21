import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import './DashboardPage.css';

const MOTIVATE_TAG_KEY = 'motivateTag';

/**
 * Ports dashboard.html exactly - same markup, classes, SVG icons, and the
 * "Add Tag" motivation terminal widget. That widget is small, purely
 * client-side, self-contained data belonging to this page (not one of the
 * excluded business modules), so it is kept on localStorage exactly as the
 * original did rather than inventing a new backend endpoint for it in a
 * phase that is explicitly foundation-only.
 *
 * The three module links (Notifications, Remember, Targets) point to their
 * eventual routes per the approved Phase 1 React Router Plan; those routes
 * aren't built yet in Phase 3.2, so they resolve to the NotFoundPage
 * placeholder until their phase arrives - this page's own UI is unaffected.
 */
export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [tagText, setTagText] = useState('');
  const [confirmDeleteTagOpen, setConfirmDeleteTagOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    document.title = 'TOMT Dashboard';
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(MOTIVATE_TAG_KEY);
    if (saved) setTagText(saved);
  }, []);

  useEffect(() => {
    if (tagText && containerRef.current) {
      const charWidth = tagText.length * 0.65;
      containerRef.current.style.setProperty('--text-width', `${charWidth}em`);
    }
  }, [tagText]);

  function askForTag() {
    // eslint-disable-next-line no-alert
    const tag = window.prompt('Enter your motivation for today:');
    if (tag) {
      window.localStorage.setItem(MOTIVATE_TAG_KEY, tag);
      setTagText(tag);
    }
  }

  function deleteTag() {
    window.localStorage.removeItem(MOTIVATE_TAG_KEY);
    setTagText('');
  }

  return (
    <div className="dashboard-page-root">
      <div className="tag-btn-container">
        <button type="button" className="add-tag-btn" onClick={askForTag}>
          🏷️ Add Tag
        </button>
        <button
          type="button"
          className="add-tag-btn"
          style={{ marginLeft: '8px' }}
          onClick={logout}
          title={user ? `Logged in as ${user.username}` : undefined}
        >
          Logout
        </button>
      </div>

      <div className="terminal-loader" id="tag-display" ref={containerRef} style={{ display: tagText ? 'block' : 'none' }}>
        <div className="terminal-header">
          <div className="terminal-title">Motivation.exe</div>
          <div className="terminal-controls">
            <div className="control minimize" />
            <div className="control maximize" />
            <div className="control close" onClick={() => setConfirmDeleteTagOpen(true)} />
          </div>
        </div>
        <div className="text" id="tag-text">
          {tagText}
        </div>
      </div>

      <div className="dashboard-container">
        <h1>TOMT App Modules</h1>

        <div className="modules-layout">
          <div className="modules-row row-top">
            <Link to="/notifications" className="notification-button">
              <div className="btn-content">
                <svg className="bell" viewBox="0 0 448 512">
                  <path d="M224 0c-17.7 0-32 14.3-32 32V49.9C119.5 61.4 64 124.2 64 200v33.4c0 45.4-15.5 89.5-43.8 124.9L5.3 377c-5.8 7.2-6.9 17.1-2.9 25.4S14.8 416 24 416H424c9.2 0 17.6-5.3 21.6-13.6s2.9-18.2-2.9-25.4l-14.9-18.6C399.5 322.9 384 278.8 384 233.4V200c0-75.8-55.5-138.6-128-150.1V32c0-17.7-14.3-32-32-32zm0 96h8c57.4 0 104 46.6 104 104v33.4c0 47.9 13.9 94.6 39.7 134.6H72.3C98.1 328 112 281.3 112 233.4V200c0-57.4 46.6-104 104-104h8zm64 352H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7s18.7-28.3 18.7-45.3z" />
                </svg>
                <span className="btn-label">Notifications (Pending Tasks)</span>
              </div>
              <div className="arrow">›</div>
            </Link>

            <Link to="/remember" className="action-button btn-remember">
              <svg className="svgIcon" viewBox="0 0 512 512">
                <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm50.7-186.9L162.4 380.6c-19.4 7.5-38.5-11.6-31-31l55.5-144.3c3.3-8.5 9.9-15.1 18.4-18.4l144.3-55.5c19.4-7.5 38.5 11.6 31 31L325.1 306.7c-3.2 8.5-9.9 15.1-18.4 18.4zM288 256a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z" />
              </svg>
              <span className="btn-label">Remember Block</span>
            </Link>
          </div>

          <div className="modules-row row-middle">
            <Link to="/targets" className="action-button btn-target">
              <svg className="svgIcon" viewBox="0 0 512 512">
                <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm50.7-186.9L162.4 380.6c-19.4 7.5-38.5-11.6-31-31l55.5-144.3c3.3-8.5 9.9-15.1 18.4-18.4l144.3-55.5c19.4-7.5 38.5 11.6 31 31L325.1 306.7c-3.2 8.5-9.9 15.1-18.4 18.4zM288 256a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z" />
              </svg>
              <span className="btn-label">Target Tracker</span>
            </Link>
          </div>

          <div className="modules-row row-bottom">
            <Link to="/hub" className="go-to-dashboard-btn">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={confirmDeleteTagOpen}
        title="Delete Today's Motivation?"
        message="Are you sure you want to delete today's motivation tag? This action cannot be undone."
        itemPreview={tagText ? `"${tagText}"` : null}
        confirmWord="DELETE"
        onClose={() => setConfirmDeleteTagOpen(false)}
        onConfirm={async () => {
          setConfirmDeleteTagOpen(false);
          deleteTag();
        }}
      />
    </div>
  );
}

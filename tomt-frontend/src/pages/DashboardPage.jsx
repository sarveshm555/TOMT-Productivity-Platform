import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import './DashboardPage.css';

const MOTIVATE_TAG_KEY = 'motivateTag';

/**
 * Clean, responsive Dashboard with a redesigned Motivation Quotes section
 * ("Today's Perspective"). Resolves mobile header button overlaps while
 * providing a premium, spacious, and inspiring daily quote experience.
 */
export default function DashboardPage() {
  const { user, logout, updateMotivation } = useAuth();
  const [tagText, setTagText] = useState(() => {
    return window.localStorage.getItem(MOTIVATE_TAG_KEY) || '';
  });
  const [confirmDeleteTagOpen, setConfirmDeleteTagOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    document.title = 'TOMT Dashboard';
  }, []);

  useEffect(() => {
    if (user && typeof user.motivateTag === 'string') {
      setTagText(user.motivateTag);
      if (user.motivateTag) {
        window.localStorage.setItem(MOTIVATE_TAG_KEY, user.motivateTag);
      } else {
        window.localStorage.removeItem(MOTIVATE_TAG_KEY);
      }
    }
  }, [user]);

  async function askForTag() {
    // eslint-disable-next-line no-alert
    const tag = window.prompt('Enter your motivation for today:');
    if (tag !== null) {
      const trimmed = tag.trim();
      setTagText(trimmed);
      if (trimmed) {
        window.localStorage.setItem(MOTIVATE_TAG_KEY, trimmed);
      } else {
        window.localStorage.removeItem(MOTIVATE_TAG_KEY);
      }
      try {
        await updateMotivation(trimmed);
      } catch (err) {
        console.error('Could not save motivation to server:', err);
      }
    }
  }

  async function deleteTag() {
    window.localStorage.removeItem(MOTIVATE_TAG_KEY);
    setTagText('');
    try {
      await updateMotivation('');
    } catch (err) {
      console.error('Could not clear motivation on server:', err);
    }
  }

  return (
    <div className="dashboard-page-root">
      <div className="dashboard-wrapper">
        <header className="dashboard-top-bar">
          <div className="brand-badge">
            <span className="brand-dot" />
            <span className="brand-title">TOMT Productivity</span>
          </div>
          <div className="tag-btn-container">
            <button type="button" className="add-tag-btn" onClick={askForTag}>
              🏷️ Add Tag
            </button>
            <button
              type="button"
              className="logout-btn"
              onClick={logout}
              title={user ? `Logged in as ${user.username}` : undefined}
            >
              Logout
            </button>
          </div>
        </header>

        <section className="motivation-section">
          {tagText ? (
            <div className="motivation-card active-quote" ref={containerRef}>
              <div className="motivation-card-header">
                <span className="motivation-badge">✨ TODAY'S PERSPECTIVE</span>
                <button
                  type="button"
                  className="motivation-delete-btn"
                  onClick={() => setConfirmDeleteTagOpen(true)}
                  title="Delete motivation tag"
                >
                  ✕
                </button>
              </div>
              <div className="motivation-quote-body">
                <span className="quote-mark open">“</span>
                <p className="quote-text">{tagText}</p>
                <span className="quote-mark close">”</span>
              </div>
            </div>
          ) : (
            <div className="motivation-card empty-quote">
              <div className="motivation-card-header">
                <span className="motivation-badge">✨ TODAY'S PERSPECTIVE</span>
              </div>
              <div className="empty-quote-body">
                <p className="empty-quote-text">Start your morning with clarity and focus. Add your daily motivation tag.</p>
                <button type="button" className="set-tag-prompt-btn" onClick={askForTag}>
                  ➕ Set Today's Motivation
                </button>
              </div>
            </div>
          )}
        </section>

        <main className="dashboard-container">
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
        </main>
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

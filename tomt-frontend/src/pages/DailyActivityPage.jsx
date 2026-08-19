import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import './DailyActivityPage.css';

/**
 * Ports daily-activity.html exactly - same markup, classes, copy, and the
 * 3D flip-out transition on "Back to Dashboard" (800ms delay before the
 * actual navigation, matching the original's setTimeout).
 */
export default function DailyActivityPage() {
  const [flippingOut, setFlippingOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Life Manager App - Daily Activities Hub';
  }, []);

  function handleBackHome(e) {
    e.preventDefault();
    setFlippingOut(true);
    setTimeout(() => {
      navigate('/hub');
    }, 800);
  }

  return (
    <div className="daily-activity-page-root">
      <div className="app-container">
        <div className="back-home-container">
          <a href="/hub" className="back-home-button" id="back-home-link" onClick={handleBackHome}>
            🏠 Back to Dashboard
          </a>
        </div>

        <div className={`flip-wrapper${flippingOut ? ' flip-out' : ''}`}>
          <div className="content-wrapper">
            <div id="activity-unlocked-content" className="unlocked-content-wrapper">
              <h2>Daily Routine Hub</h2>
              <p>Please select the routine you wish to log today.</p>

              <div className="router-grid">
                <Link to="/daily-activity/health" className="router-card" id="health-card">
                  <span className="icon">🏃‍♀️</span>
                  <h3>Health &amp; Personal</h3>
                  <p style={{ fontSize: '0.9em', marginTop: '10px' }}>Track diet, exercise, meditation, and sleep quality.</p>
                </Link>

                <Link to="/daily-activity/professional" className="router-card" id="professional-card">
                  <span className="icon">🧠</span>
                  <h3>Professional &amp; Coding</h3>
                  <p style={{ fontSize: '0.9em', marginTop: '10px' }}>Log learning minutes, problem-solving, and career tasks.</p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

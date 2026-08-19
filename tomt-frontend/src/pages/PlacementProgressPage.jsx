import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

import './PlacementProgressPage.css';

/**
 * Ports placement-progress.html exactly - a static router hub with no data
 * of its own, same as monitoring.html. Icon color-coding uses explicit
 * classes instead of href-substring selectors, same reasoning as
 * HubPage.jsx/index.html.
 */
export default function PlacementProgressPage() {
  useEffect(() => {
    document.title = 'Placement File - Life Manager Dashboard';
  }, []);

  return (
    <div className="placement-hub-page-root">
      <div className="header-container">
        <Link to="/hub" className="back-to-dashboard-btn">
          🏠 Back to Dashboard
        </Link>
      </div>

      <div className="app-container">
        <h1>Placement &amp; Development Tracker</h1>
        <center>
          <p className="subtitle">Your central hub for tracking applications, learning progress, and important documents.</p>
        </center>

        <div className="flip-wrapper">
          <div className="dashboard-grid">
            <Link to="/placement/internships" className="dashboard-card internship-icon-card">
              <span className="icon">📈</span>
              <h3>Internship Tracker</h3>
              <p>Log all applied internships, manage status, and track failure points.</p>
            </Link>

            <Link to="/placement/coding-profiles" className="dashboard-card coding-profiles-icon-card">
              <span className="icon">💻</span>
              <h3>Coding Profiles &amp; Log</h3>
              <p>Manage platforms, track total problems solved, and log daily practice.</p>
            </Link>

            <Link to="/placement/education" className="dashboard-card education-icon-card">
              <span className="icon">📚</span>
              <h3> Education/Learning Log</h3>
              <p>Track day-wise progress, links, and key takeaways for specific courses.</p>
            </Link>

            <Link to="/placement/documents" className="dashboard-card documents-icon-card">
              <span className="icon">📄</span>
              <h3>Document Manager</h3>
              <p>Store, view, and download important files like resumes and certificates.</p>
            </Link>

            <Link to="/placement/links" className="dashboard-card infocopy-icon-card">
              <span className="icon">🔗</span>
              <h3>infocopy</h3>
              <p>quickly copy and store your info</p>
            </Link>

            <Link to="/placement/notes" className="dashboard-card importantnote-icon-card">
              <span className="icon">⏳</span>
              <h3>important notes</h3>
              <p>store your important things</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

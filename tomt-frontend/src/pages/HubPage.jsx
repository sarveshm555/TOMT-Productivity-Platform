import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

import './HubPage.css';

/**
 * Ports index.html exactly - same markup, classes, icons, card copy, and
 * the href-based icon color-coding (`a[href*="schedule"] .icon`, etc).
 * Each card links to its module's eventual route per the approved Phase 1
 * React Router Plan; none of those modules are built yet in Phase 3.2
 * (explicitly out of scope), so they resolve to the NotFoundPage
 * placeholder until their phase arrives.
 */
export default function HubPage() {
  useEffect(() => {
    document.title = 'Life Manager App - Dashboard';
  }, []);

  return (
    <div className="hub-page-root">
      <div className="app-container">
        <Link to="/dashboard" className="back-button">
          <span role="img" aria-label="Back">
            🏠
          </span>{' '}
          Back to Application Home
        </Link>
        <h1>Welcome to Your Life Manager 🚀</h1>

        <div className="flip-wrapper">
          <div className="dashboard-grid">
            <Link to="/monitoring" className="dashboard-card" style={{ borderLeft: '5px solid var(--primary-color)' }}>
              <span className="icon">📊</span>
              <h3>Process Monitoring</h3>
              <p>Track ongoing processes and application deadlines.</p>
            </Link>
            <Link to="/schedule" className="dashboard-card schedule-icon-card">
              <span className="icon">🗓️</span>
              <h3>Daily Schedule</h3>
              <p>Manage, add, and check off your tasks.</p>
            </Link>

            <Link to="/dress-checker" className="dashboard-card dress-checker-icon-card">
              <span className="icon">👔</span>
              <h3>Dress Checker</h3>
              <p>Instantly get your outfit based on rules.</p>
            </Link>

            <Link to="/reflections" className="dashboard-card powerful-questions-icon-card">
              <span className="icon">💡</span>
              <h3>Powerful Questions</h3>
              <p>Journal with guided, thought-provoking questions.</p>
            </Link>

            <Link to="/daily-activity" className="dashboard-card daily-activity-icon-card">
              <span className="icon">✍️</span>
              <h3>Log Activity</h3>
              <p>Enter non-scheduled activities or quick notes.</p>
            </Link>

            <Link to="/progress" className="dashboard-card progress-icon-card">
              <span className="icon">📈</span>
              <h3>Progress Checker</h3>
              <p>Visualize your task completion rates.</p>
            </Link>

            <Link to="/pending-tasks" className="dashboard-card pending-tasks-icon-card">
              <span className="icon">⏳</span>
              <h3>Pending Tasks</h3>
              <p>Review tasks that were not completed.</p>
            </Link>

            <Link to="/placement" className="dashboard-card placement-progress-icon-card">
              <span className="icon">💼</span>
              <h3>Placement Progress</h3>
              <p>Track job applications, coding practice, and documents.</p>
            </Link>

            <Link to="/diary" className="dashboard-card personal-diary-icon-card">
              <span className="icon">📖</span>
              <h3>Personal Diary</h3>
              <p>Fill your thoughts, reflections, and memories.</p>
            </Link>

            <Link to="/space-for-you" className="dashboard-card space-for-you-icon-card" style={{ borderLeft: '5px solid #8b5cf6' }}>
              <span className="icon">🌌</span>
              <h3>Space for You</h3>
              <p>Personal learning, knowledge, thoughts, links, and notes.</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

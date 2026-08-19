import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

import './MonitoringPage.css';

/**
 * Ports monitoring.html exactly - a static router hub with no data of its
 * own, so no backend/localStorage involved at all, same as the original.
 */
export default function MonitoringPage() {
  useEffect(() => {
    document.title = 'Monitoring Dashboard';
  }, []);

  return (
    <div className="monitoring-page-root">
      <div className="page-wrapper">
        <div className="back-container">
          <Link to="/hub" className="back-button">
            <span>🏠</span> Back to Dashboard
          </Link>
        </div>

        <div className="app-container">
          <h2>Process Monitoring</h2>
          <p className="subtitle">Select a category to manage your active tasks.</p>

          <div className="router-grid">
            <Link to="/monitoring/ongoing" className="router-card" id="ongoing-card">
              <div className="icon-box">🔄</div>
              <h3>Ongoing Processes</h3>
              <p>Track progress of active applications and interviews.</p>
            </Link>

            <Link to="/monitoring/apply" className="router-card" id="apply-card">
              <div className="icon-box">📝</div>
              <h3>Need to Apply</h3>
              <p>Manage new opportunities and upcoming deadlines.</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

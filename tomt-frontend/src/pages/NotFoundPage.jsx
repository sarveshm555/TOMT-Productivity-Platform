import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

import DashboardLayout from '../layout/DashboardLayout.jsx';
import './NotFoundPage.css';

/**
 * Catch-all for any route that doesn't resolve to a page built so far.
 * In Phase 3.2 this is every business-module link on DashboardPage and
 * HubPage (monitoring, schedule, targets, remember, notifications,
 * dress-checker, reflections, daily-activity, progress, pending-tasks,
 * placement, diary) - all explicitly out of scope for this phase. This is
 * intentionally neutral scaffolding, not a redesign of any ported page.
 *
 * Rendered inside DashboardLayout (Header + Sidebar) so landing here isn't
 * a dead end - the sidebar built in this same phase gives real navigation
 * back out, and doubles as a live integration test for that layout shell.
 */
export default function NotFoundPage() {
  const location = useLocation();

  useEffect(() => {
    document.title = 'TOMT - Not Available Yet';
  }, []);

  return (
    <DashboardLayout title="TOMT">
      <div className="not-found-page-root">
        <div className="not-found-card">
          <div className="not-found-icon">🚧</div>
          <h2>Not available yet</h2>
          <p>
            <code>{location.pathname}</code> hasn&rsquo;t been migrated in this phase of the project.
          </p>
          <div className="not-found-links">
            <Link to="/dashboard">Back to Dashboard</Link>
            <Link to="/hub">Back to Hub</Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

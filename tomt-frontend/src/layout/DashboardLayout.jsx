import React from 'react';

import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';
import './DashboardLayout.css';

/**
 * Shell for authenticated module pages built from Phase 3.3 onward.
 * Deliberately not used by the four pixel-perfect ported pages (see
 * Header.jsx / Sidebar.jsx for why) - currently exercised only by
 * NotFoundPage, so the placeholder a user lands on for an unbuilt module
 * still has real navigation to get back out, rather than being a dead end.
 */
export default function DashboardLayout({ title, children }) {
  return (
    <div className="app-dashboard-layout">
      <Header title={title} />
      <div className="app-dashboard-layout-body">
        <Sidebar />
        <main className="app-dashboard-layout-content">{children}</main>
      </div>
    </div>
  );
}

import React from 'react';

import { useAuth } from '../context/AuthContext.jsx';
import './Header.css';

/**
 * Shared header for authenticated pages built in Phase 3.3+. Not used by
 * LoadingPage/LoginPage/RegisterPage/DashboardPage/HubPage - those four are
 * pixel-perfect ports of standalone original pages and adding persistent
 * chrome on top of them would be a visual change, not a port. This exists
 * so future module pages (schedule, monitoring, diary, etc.) have a
 * consistent shell to render into, per the Phase 1 React Component Plan
 * (Section 7 - "AppLayout with persistent header/nav").
 */
export default function Header({ title }) {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="app-header-title">{title || 'TOMT'}</div>
      <div className="app-header-user">
        {user ? <span className="app-header-username">{user.username}</span> : null}
        <button type="button" className="app-header-logout" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}

import React from 'react';
import { NavLink } from 'react-router-dom';

import './Sidebar.css';

// One entry per module route from the approved Phase 1 React Router Plan.
// None of these are implemented yet (Phase 3.2 is frontend foundation
// only) - they all currently resolve to NotFoundPage - but the navigation
// shell itself is real, working infrastructure for Phase 3.3+.
const MODULE_LINKS = [
  { to: '/hub', label: 'Hub', icon: '🏠' },
  { to: '/monitoring', label: 'Process Monitoring', icon: '📊' },
  { to: '/schedule', label: 'Daily Schedule', icon: '🗓️' },
  { to: '/targets', label: 'Targets', icon: '🎯' },
  { to: '/remember', label: 'Remember', icon: '📌' },
  { to: '/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/dress-checker', label: 'Dress Checker', icon: '👔' },
  { to: '/reflections', label: 'Powerful Questions', icon: '💡' },
  { to: '/daily-activity', label: 'Log Activity', icon: '✍️' },
  { to: '/progress', label: 'Progress Checker', icon: '📈' },
  { to: '/pending-tasks', label: 'Pending Tasks', icon: '⏳' },
  { to: '/placement', label: 'Placement Progress', icon: '💼' },
  { to: '/diary', label: 'Personal Diary', icon: '📖' },
];

/**
 * Sidebar for future authenticated module pages. Same scoping note as
 * Header.jsx: not used on the four pixel-perfect ported pages, which have
 * no persistent sidebar in the original app.
 */
export default function Sidebar() {
  return (
    <nav className="app-sidebar" aria-label="Module navigation">
      <ul className="app-sidebar-list">
        {MODULE_LINKS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) => `app-sidebar-link${isActive ? ' app-sidebar-link--active' : ''}`}
            >
              <span className="app-sidebar-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

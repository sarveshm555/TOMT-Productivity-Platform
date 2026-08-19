import React from 'react';
import './LoadingSpinner.css';

/**
 * Small shared loading indicator for in-app async states (session
 * bootstrap, route guards). This is NOT the liquid-loader splash from
 * loading_page.html - that one is a full-page, one-time entry animation and
 * is ported as-is in pages/LoadingPage.jsx. This is a lightweight everyday
 * spinner for brief waits elsewhere in the app, kept visually consistent
 * with the app's dark theme rather than introducing a new design language.
 */
export default function LoadingSpinner({ label }) {
  return (
    <div className="shared-loading-spinner-root">
      <div className="shared-loading-spinner" aria-hidden="true" />
      {label ? <div className="shared-loading-spinner-label">{label}</div> : null}
    </div>
  );
}

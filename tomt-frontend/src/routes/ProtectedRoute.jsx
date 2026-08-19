import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

/**
 * Wraps any route that requires a logged-in session. This is the exact
 * mechanism Phase 1 (Risk #1) and Phase 2 (Section 4) called for: the
 * original app's password_page.html only gated the entry point, so any
 * page could be opened directly by URL. Every protected route in this app
 * goes through this component, closing that gap for real.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    // Still trying to silently restore a session from the refresh cookie -
    // render nothing decisive yet, to avoid a flash of the login screen for
    // users who are actually already logged in.
    return <LoadingSpinner label="Checking session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

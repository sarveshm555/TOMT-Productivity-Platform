import React from 'react';
import './ErrorMessage.css';

/**
 * Generic inline status/error banner for future authenticated pages
 * (business modules land in later phases). The auth screens
 * (LoginPage/RegisterPage) intentionally do NOT use this - they port
 * password_page.html's own `.error-message` class verbatim instead, to
 * stay pixel-identical to the original neon/glitch styling. This component
 * is for everything else.
 */
export default function ErrorMessage({ children, tone = 'error' }) {
  if (!children) return null;
  return <div className={`shared-error-message shared-error-message--${tone}`}>{children}</div>;
}

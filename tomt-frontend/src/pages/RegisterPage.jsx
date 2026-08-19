import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import './AuthPage.css';

/**
 * Multi-user Sign Up Page.
 * Allows new users to create an account with username, password, and confirmation,
 * automatically signs in on creation, and provides instant navigation back to Sign In.
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorText, setErrorText] = useState('');
  const errorTimeoutRef = useRef(null);

  useEffect(() => {
    document.title = 'TOMT Security Interface';
  }, []);

  useEffect(() => () => clearTimeout(errorTimeoutRef.current), []);

  function displayError(message) {
    setErrorText(message);
    clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => setErrorText(''), 3000);
  }

  async function handleRegister(e) {
    e.preventDefault();
    const newUsername = username.trim();
    const newPassword = password.trim();
    const newConfirmPassword = confirmPassword.trim();

    if (newUsername.length < 3) {
      displayError('Error 402: Access Name must be 3 or more characters.');
      return;
    }
    if (newPassword.length < 4) {
      displayError('Error 401: Password must be 4 or more characters.');
      return;
    }
    if (newPassword !== newConfirmPassword) {
      displayError('Error: Passwords do not match. Check integrity.');
      return;
    }

    try {
      await register(newUsername, newPassword);
      displayError('Access granted. Account created. Redirecting...');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1000);
    } catch (err) {
      const message =
        (err.response && err.response.data && err.response.data.message) ||
        'Error: Could not create account. Try again.';
      displayError(message);
    }
  }

  return (
    <div className="auth-page-root">
      <div className="auth-container">
        <div id="auth-form-container">
          <div className="header-text">SET ACCESS CREDENTIALS</div>
          <form className="container" id="set-password-form" onSubmit={handleRegister}>
            <div className="input-container">
              <div className="input-content">
                <div className="input-dist">
                  <div className="input-type">
                    <input
                      className="input-is"
                      type="text"
                      id="set-username-input"
                      placeholder="CREATE ACCESS NAME"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                    <input
                      className="input-is"
                      type="password"
                      id="set-password-input"
                      placeholder="CREATE PASSWORD"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <input
                      className="input-is"
                      type="password"
                      id="set-confirm-password-input"
                      placeholder="CONFIRM PASSWORD"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button type="submit" className="submit">
                      CREATE ACCOUNT
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
            <button
              type="button"
              className="link-button"
              id="signin-link"
              onClick={() => navigate('/login')}
              style={{ fontSize: '16px', color: '#06aed8' }}
            >
              Already have an account? SIGN IN
            </button>
          </div>
        </div>
        <p className="error-message" id="error-message" style={{ display: errorText ? 'block' : 'none' }}>
          {errorText}
        </p>
      </div>
    </div>
  );
}


import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import * as authService from '../api/authService.js';
import './AuthPage.css';

/**
 * Multi-user Login Page.
 * Renders "AUTHORIZATION REQUIRED" (LOGIN) and "PASSWORD RECOVERY" (RESET_PASSWORD)
 * screens with full theme-matched styling, access name & password inputs,
 * and clear navigation between sign in, sign up, and password recovery.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [view, setView] = useState('LOGIN'); // 'LOGIN' | 'RESET_PASSWORD'

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [resetUsername, setResetUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
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

  function loadResetScreen() {
    setView('RESET_PASSWORD');
    setErrorText('');
  }

  function loadLoginScreen() {
    setView('LOGIN');
    setErrorText('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    const usernameValue = username.trim();
    const passwordValue = password.trim();

    if (!usernameValue) {
      displayError('Error: Access Name is required.');
      return;
    }
    if (!passwordValue) {
      displayError('Error: Password is required.');
      return;
    }

    try {
      await login(usernameValue, passwordValue);
      displayError('ACCESS GRANTED. Redirecting...');
      setTimeout(() => {
        const redirectTo = (location.state && location.state.from && location.state.from.pathname) || '/dashboard';
        navigate(redirectTo, { replace: true });
      }, 1000);
    } catch (err) {
      const status = err.response && err.response.status;
      if (status === 401) {
        displayError('ACCESS DENIED. Incorrect Access Name or Password.');
      } else {
        const message = (err.response && err.response.data && err.response.data.message) || 'Login failed. Try again.';
        displayError(message);
      }
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    const usernameValue = resetUsername.trim();
    const newPasswordValue = newPassword.trim();
    const confirmPasswordValue = confirmPassword.trim();

    if (!usernameValue) {
      displayError('Error: Access Name is required.');
      return;
    }
    if (newPasswordValue.length < 4) {
      displayError('Error: New Password must be 4+ characters.');
      return;
    }
    if (newPasswordValue !== confirmPasswordValue) {
      displayError('Error: Passwords do not match. Check integrity.');
      return;
    }

    try {
      await authService.resetPassword(usernameValue, newPasswordValue, confirmPasswordValue);
      displayError('Password reset successful. Use new credential to login.');
      setTimeout(() => {
        setNewPassword('');
        setConfirmPassword('');
        setResetUsername('');
        loadLoginScreen();
      }, 1500);
    } catch (err) {
      const status = err.response && err.response.status;
      if (status === 401) {
        displayError('Error: Access Name verification failed. Abort.');
      } else if (status === 400) {
        const message = (err.response && err.response.data && err.response.data.message) || 'Error: Invalid reset request.';
        displayError(message);
      } else {
        displayError('Error: Could not reset password. Try again.');
      }
    }
  }

  return (
    <div className="auth-page-root">
      <div className="auth-container">
        <div id="auth-form-container">
          {view === 'LOGIN' ? (
            <>
              <div className="header-text">AUTHORIZATION REQUIRED</div>
              <form className="container" id="login-form" onSubmit={handleLogin}>
                <div className="input-container">
                  <div className="input-content">
                    <div className="input-dist">
                      <div className="input-type">
                        <input
                          className="input-is"
                          type="text"
                          id="login-username-input"
                          placeholder="ENTER ACCESS NAME"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                        <input
                          className="input-is"
                          type="password"
                          id="password-input"
                          placeholder="ENTER PASSWORD"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button type="submit" className="submit">
                          ACCESS SYSTEM
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="link-button" id="forgot-password-link" onClick={loadResetScreen} style={{ fontSize: '16px' }}>
                  FORGOT PASSWORD?
                </button>
                <button
                  type="button"
                  className="link-button"
                  id="signup-link"
                  onClick={() => navigate('/register')}
                  style={{ fontSize: '16px', color: '#37FF8B' }}
                >
                  Don&apos;t have an account? SIGN UP
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="header-text">PASSWORD RECOVERY</div>
              <form className="container" id="reset-password-form" onSubmit={handleResetPassword}>
                <div className="input-container">
                  <div className="input-content">
                    <div className="input-dist">
                      <div className="input-type">
                        <input
                          className="input-is"
                          type="text"
                          id="reset-username-input"
                          placeholder="CONFIRM ACCESS NAME"
                          required
                          value={resetUsername}
                          onChange={(e) => setResetUsername(e.target.value)}
                        />
                        <input
                          className="input-is"
                          type="password"
                          id="new-password-input"
                          placeholder="ENTER NEW PASSWORD"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <input
                          className="input-is"
                          type="password"
                          id="confirm-password-input"
                          placeholder="CONFIRM NEW PASSWORD"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button type="submit" className="submit">
                          RESET &amp; RE-SECURE
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                <button type="button" className="link-button" onClick={loadLoginScreen} style={{ fontSize: '16px' }}>
                  BACK TO SIGN IN
                </button>
              </div>
            </>
          )}
        </div>
        <p className="error-message" id="error-message" style={{ display: errorText ? 'block' : 'none' }}>
          {errorText}
        </p>
      </div>
    </div>
  );
}


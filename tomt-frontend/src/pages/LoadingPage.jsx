import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import './LoadingPage.css';

// Ported verbatim from loading_page.html's <script> block.
const MIN_LOADING_TIME_MS = 3000;
const REDIRECT_DELAY_MS = 1000;

function fetchDynamicConfig(titleText) {
  const apiLatency = Math.random() * 1000 + 500;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        titleText,
        subtitleText: 'Loading interactive features...',
        primaryColor: '#37FF8B',
        primaryColorFaded: 'rgba(55, 255, 139, 0.4)',
        secondaryColor: '#3498db',
      });
    }, apiLatency);
  });
}

function enforceMinDelay() {
  return new Promise((resolve) => setTimeout(resolve, MIN_LOADING_TIME_MS));
}

/**
 * Entry screen. Ported 1:1 from loading_page.html - same DOM structure,
 * same CSS (LoadingPage.css), same animation timings and sequencing.
 * The only functional change: instead of a hardcoded
 * `window.location.href = 'password_page.html'`, it asks the AuthContext
 * whether a session already exists and routes to /dashboard or /login
 * accordingly - the SPA-appropriate equivalent of the original's single
 * next destination.
 */
export default function LoadingPage() {
  const rootRef = useRef(null);
  const [loaderHidden, setLoaderHidden] = useState(false);
  const [loaderDisplayNone, setLoaderDisplayNone] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [buttonVisible, setButtonVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [subtitleText, setSubtitleText] = useState('');
  const [bodyReady, setBodyReady] = useState(false);

  const navigate = useNavigate();
  const { isAuthenticated, isBootstrapping } = useAuth();

  useEffect(() => {
    document.title = 'TOMT Loading...';
  }, []);

  useEffect(() => {
    let cancelled = false;
    const titleText = 'TOMT PRODUCT SUITE';

    async function initializePage() {
      const [config] = await Promise.all([fetchDynamicConfig(titleText), enforceMinDelay()]);
      if (cancelled) return;

      if (rootRef.current) {
        rootRef.current.style.setProperty('--primary-color', config.primaryColor);
        rootRef.current.style.setProperty('--primary-color-faded', config.primaryColorFaded);
        rootRef.current.style.setProperty('--secondary-color', config.secondaryColor);
      }

      setLoaderHidden(true);

      setTimeout(() => {
        if (cancelled) return;
        setLoaderDisplayNone(true);
        setTitleVisible(true);
        setButtonVisible(true);
        setSubtitleVisible(true);
        setSubtitleText(config.subtitleText);

        setTimeout(() => {
          if (cancelled) return;
          setBodyReady(true);
        }, 1000 + REDIRECT_DELAY_MS);
      }, 500);
    }

    initializePage();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bodyReady || isBootstrapping) return;

    const timer = setTimeout(() => {
      navigate(isAuthenticated ? '/dashboard' : '/login', { replace: true });
    }, 500);

    return () => clearTimeout(timer);
  }, [bodyReady, isBootstrapping, isAuthenticated, navigate]);

  return (
    <div
      ref={rootRef}
      className={`loading-page-root${bodyReady ? ' loading-page-root--ready' : ''}`}
    >
      <div className={`liquid-loader${loaderHidden ? ' hidden' : ''}`} style={loaderDisplayNone ? { display: 'none' } : undefined}>
        <div className="loading-text">
          Loading<span className="dot">.</span>
          <span className="dot">.</span>
          <span className="dot">.</span>
        </div>
        <div className="loader-track">
          <div className="liquid-fill" />
        </div>
      </div>

      <div className="title-container" style={{ opacity: titleVisible ? 1 : 0 }}>
        <button
          type="button"
          className={`button${buttonVisible ? ' visible' : ''}`}
          data-text="&nbsp;TOMT PRODUCT&nbsp;"
        >
          <span className="actual-text">&nbsp;TOMT PRODUCT SUITE&nbsp;</span>
          <span aria-hidden="true" className="hover-text" data-text="&nbsp;TOMT PRODUCT SUITE&nbsp;">
            &nbsp;TOMT PRODUCT SUITE&nbsp;
          </span>
        </button>
      </div>

      <div id="subtitle" className={subtitleVisible ? 'visible' : ''}>
        {subtitleText}
      </div>

      <div className="footer-text">Created by sarvesh - Powered by TOMT</div>
    </div>
  );
}

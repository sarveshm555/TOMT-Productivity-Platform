import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

import * as authService from '../api/authService.js';
import { setAccessToken, setOnRefreshFailure } from '../api/axiosClient.js';

const AuthContext = createContext(null);

/**
 * Access tokens are kept ONLY in React state (backed by axiosClient's
 * in-memory reference) - never in localStorage or sessionStorage. This is a
 * deliberate security choice from Phase 2 (Section 4): anything in
 * localStorage is readable by any script on the page (XSS blast radius),
 * while an in-memory token disappears on tab close/reload. Session
 * continuity across reloads comes from the httpOnly refresh cookie instead,
 * via the bootstrap effect below - exactly the flow the backend was built
 * for in Phase 3.1.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, username } | null
  const [accessToken, setAccessTokenState] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true); // true until the initial refresh attempt resolves
  const [setupComplete, setSetupComplete] = useState(null); // null = unknown yet, true/false once checked

  // Avoids setting state on an unmounted component if the bootstrap effect's
  // async work resolves after the provider has already unmounted.
  const isMountedRef = useRef(true);
  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  const applyToken = useCallback((token) => {
    setAccessToken(token); // axiosClient's module-level reference, used by every request
    setAccessTokenState(token || null);
  }, []);

  const clearSession = useCallback(() => {
    applyToken(null);
    if (isMountedRef.current) setUser(null);
  }, [applyToken]);

  // If axiosClient's response interceptor ever fails to refresh (refresh
  // token itself expired or was invalidated - e.g. after logout elsewhere),
  // it calls this so the app's state matches reality instead of pretending
  // the user is still logged in.
  useEffect(() => {
    setOnRefreshFailure(() => {
      clearSession();
    });
  }, [clearSession]);

  // On first mount, try to silently restore a session using the httpOnly
  // refresh cookie (if the browser still has one from a previous visit).
  // This is the ONLY place a failed refresh is expected and not an error -
  // it just means "no existing session," which is the normal first-visit case.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const data = await authService.refreshSession();
        if (cancelled) return;
        applyToken(data.accessToken);
        const meData = await authService.getMe();
        if (cancelled) return;
        setUser(meData.user);
      } catch (err) {
        if (cancelled) return;
        clearSession();
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const register = useCallback(
    async (username, password) => {
      const data = await authService.register(username, password);
      applyToken(data.accessToken);
      setUser(data.user);
      return data;
    },
    [applyToken]
  );

  const login = useCallback(
    async (username, password) => {
      const data = await authService.login(username, password);
      applyToken(data.accessToken);
      setUser(data.user);
      return data;
    },
    [applyToken]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const resetPassword = useCallback((username, newPassword, confirmPassword) => {
    return authService.resetPassword(username, newPassword, confirmPassword);
  }, []);

  const updateMotivation = useCallback(async (tagText) => {
    const data = await authService.updateMotivation(tagText);
    if (data && data.user) {
      setUser(data.user);
    } else {
      setUser((prev) => (prev ? { ...prev, motivateTag: data.motivateTag } : prev));
    }
    return data.motivateTag;
  }, []);

  const value = {
    user,
    accessToken,
    isAuthenticated: Boolean(user && accessToken),
    isBootstrapping,
    setup: register,
    register,
    login,
    logout,
    resetPassword,
    updateMotivation,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be used within an <AuthProvider>.');
  }
  return ctx;
}

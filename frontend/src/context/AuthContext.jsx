import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]                       = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [terminationMessage, setTermMsg]      = useState('');
  // Holds credentials temporarily between the conflict dialog steps
  const pendingCredsRef                       = useRef(null);
  const pollIntervalRef                       = useRef(null);

  // ── Axios auth header helper ─────────────────────────────────────────────
  const setAuthHeader = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  // ── Start polling /me to detect session termination ──────────────────────
  const startSessionPoll = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        await axios.get('/api/auth/me');
      } catch (err) {
        const errorMsg = err.response?.data?.error;
        if (err.response?.status === 401 && errorMsg === 'SESSION_TERMINATED') {
          // Session was terminated by another login — force logout here
          stopSessionPoll();
          localStorage.removeItem('token');
          setAuthHeader(null);
          setUser(null);
          setTermMsg('Your session has been terminated because your account was logged in from another browser.');
        }
      }
    }, 30000); // poll every 30 seconds
  }, []);

  const stopSessionPoll = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // ── On mount: restore session from localStorage ───────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuthHeader(token);
      axios.get('/api/auth/me')
        .then(res => {
          setUser(res.data);
          startSessionPoll();
        })
        .catch(err => {
          console.error('Failed to validate session token:', err);
          localStorage.removeItem('token');
          setAuthHeader(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => stopSessionPoll();
  }, [startSessionPoll, stopSessionPoll]);

  // ── login() — called from Login.jsx handleSubmit ─────────────────────────
  // Returns normally on success.
  // Throws { conflict: true } when a session conflict is detected (no token yet).
  // Throws string error on failure.
  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });

      if (res.data.conflict) {
        // Store credentials so confirmLogin() can reuse them
        pendingCredsRef.current = { email, password };
        throw { conflict: true };
      }

      const { token, user: userData } = res.data;
      localStorage.setItem('token', token);
      setAuthHeader(token);
      setUser(userData);
      setTermMsg('');
      startSessionPoll();
      return userData;
    } catch (error) {
      if (error?.conflict) throw error;
      throw error.response?.data?.error || 'Invalid credentials or login failed';
    }
  };

  // ── confirmLogin() — called after user chooses action in conflict dialog ──
  // action: 'force_logout' | 'allow_both'
  const confirmLogin = async (action) => {
    const creds = pendingCredsRef.current;
    if (!creds) throw 'No pending credentials. Please try logging in again.';

    try {
      const res = await axios.post('/api/auth/login/confirm', {
        email: creds.email,
        password: creds.password,
        action
      });

      const { token, user: userData } = res.data;
      localStorage.setItem('token', token);
      setAuthHeader(token);
      setUser(userData);
      setTermMsg('');
      pendingCredsRef.current = null;
      startSessionPoll();
      return userData;
    } catch (error) {
      throw error.response?.data?.error || 'Login confirmation failed. Please try again.';
    }
  };

  // ── logout() ─────────────────────────────────────────────────────────────
  const logout = async () => {
    stopSessionPoll();
    try {
      await axios.post('/api/auth/logout');
    } catch (e) {
      // Best-effort; proceed even if the server call fails
      console.warn('Server logout failed:', e);
    }
    localStorage.removeItem('token');
    setAuthHeader(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      confirmLogin,
      terminationMessage,
      clearTerminationMessage: () => setTermMsg(''),
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

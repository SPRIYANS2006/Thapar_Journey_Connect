import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './auth-context-def.js';
import { api, getToken, setToken, clearToken, onUnauthorized, disconnectSocket } from '../services/api';

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));
  const [error, setError] = useState(null);

  const refreshUser = useCallback(async () => {
    const currentToken = getToken();
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const res = await api.getMe();
      if (res && res.user) {
        setUser(res.user);
        setError(null);
        return res.user;
      }
      return null;
    } catch (err) {
      if (err.status === 401) {
        clearToken();
        setTokenState(null);
        setUser(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const tokenOnMount = getToken();
    if (tokenOnMount) {
      api.getMe()
        .then((res) => {
          if (!active) return;
          if (res?.user) {
            setUser(res.user);
            setError(null);
          }
        })
        .catch((err) => {
          if (!active) return;
          if (err.status === 401) {
            clearToken();
            setTokenState(null);
            setUser(null);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    const unsubscribe = onUnauthorized(() => {
      if (active) {
        setTokenState(null);
        setUser(null);
        disconnectSocket();
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = async (credential) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.googleLogin(credential);
      if (res && res.token && res.user) {
        setToken(res.token);
        setTokenState(res.token);
        setUser(res.user);
        return res.user;
      }
      throw new Error(res?.error || 'Google login failed');
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithPassword = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(email, password);
      if (res && res.token && res.user) {
        setToken(res.token);
        setTokenState(res.token);
        setUser(res.user);
        return res.user;
      }
      throw new Error(res?.error || 'Password login failed');
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
    setUser(null);
    disconnectSocket();
  };

  const setPassword = async (password) => {
    return api.setPassword(password);
  };

  const updateProfile = async (profileData) => {
    const res = await api.updateProfile(profileData);
    if (res && res.user) {
      setUser(res.user);
    }
    return res;
  };

  const value = {
    user,
    token,
    loading,
    error,
    loginWithGoogle,
    loginWithPassword,
    logout,
    refreshUser,
    setPassword,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;

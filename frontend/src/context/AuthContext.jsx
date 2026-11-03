import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/me');
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        setPermissions(new Set(response.data.permissions || []));
      } else {
        setUser(null);
        setPermissions(new Set());
      }
    } catch {
      setUser(null);
      setPermissions(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();

    const handleUnauthorized = () => {
      setUser(null);
      setPermissions(new Set());
    };

    window.addEventListener('meflow:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('meflow:unauthorized', handleUnauthorized);
  }, [fetchCurrentUser]);

  const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    if (response.success && response.data?.user) {
      setUser(response.data.user);
      setPermissions(new Set(response.data.permissions || []));
      toast.success(`Welcome back, ${response.data.user.name}!`);
      return response.data.user;
    }
    throw new Error(response.message || 'Login failed');
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setUser(null);
      setPermissions(new Set());
      toast.info('You have been signed out.');
    }
  };

  const hasPermission = useCallback((permKey) => {
    if (!user) return false;
    if (user.role?.is_system_admin || user.role?.code === 'ADMIN') return true;
    return permissions.has(permKey);
  }, [user, permissions]);

  const hasAnyPermission = useCallback((permKeys = []) => {
    if (!user) return false;
    if (user.role?.is_system_admin || user.role?.code === 'ADMIN') return true;
    return permKeys.some((k) => permissions.has(k));
  }, [user, permissions]);

  const isAdmin = Boolean(user?.role?.is_system_admin || user?.role?.code === 'ADMIN');

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        loading,
        isAdmin,
        hasPermission,
        hasAnyPermission,
        login,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

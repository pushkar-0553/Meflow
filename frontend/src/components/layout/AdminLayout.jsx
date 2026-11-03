import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Navbar } from '../common/Navbar';
import { Sidebar } from '../common/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const AdminLayout = () => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Verifying session credentials..." />
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

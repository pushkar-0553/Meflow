import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Navbar } from '../common/Navbar';
import { Sidebar } from '../common/Sidebar';
import { MobileBottomNav } from '../common/MobileBottomNav';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const AdminLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8F7]">
        <LoadingSpinner size="lg" text="Verifying session credentials..." />
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F8F8F7] flex flex-col font-['Plus_Jakarta_Sans',sans-serif] pb-16 md:pb-0">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-3.5 sm:p-5 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
};

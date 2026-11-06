import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Navbar } from '../common/Navbar';
import { MobileBottomNav } from '../common/MobileBottomNav';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const EmployeeLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8F7]">
        <LoadingSpinner size="lg" text="Loading workspace..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F8F8F7] flex flex-col font-['Plus_Jakarta_Sans',sans-serif] pb-16 md:pb-0">
      <Navbar />
      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
};

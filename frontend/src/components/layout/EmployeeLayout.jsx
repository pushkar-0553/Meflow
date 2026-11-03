import React from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { Navbar } from '../common/Navbar';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { LayoutDashboard, Sparkles, CheckSquare, Clock } from 'lucide-react';

export const EmployeeLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Loading workspace..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const mobileNav = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Available', to: '/available-work', icon: Sparkles },
    { name: 'My Bucket', to: '/my-bucket', icon: CheckSquare },
    { name: 'Schedule', to: '/my-calendar', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-0 font-['Plus_Jakarta_Sans',sans-serif]">
      <Navbar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Mobile Sticky Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-3 rounded-xl text-xs font-semibold transition-all ${
                  isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

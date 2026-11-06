import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
import { LogOut, User, Activity } from 'lucide-react';

export const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const [serverHealth, setServerHealth] = useState({ status: 'CHECKING', latency: 0 });

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      const startTime = performance.now();
      try {
        const res = await apiClient.get('/health');
        const latency = Math.round(performance.now() - startTime);
        if (isMounted) {
          setServerHealth({
            status: res.data?.database?.connected ? 'HEALTHY' : 'DB_OFFLINE',
            latency,
          });
        }
      } catch {
        if (isMounted) {
          setServerHealth({ status: 'OFFLINE', latency: 0 });
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAEAEA] px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between shadow-xs">
      {/* Brand Logo & Identity */}
      <div className="flex items-center gap-3">
        <a href={isAdmin ? '/admin/dashboard' : '/dashboard'} className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="VCUBE MediaFlow"
            className="h-8 sm:h-9 w-auto object-contain max-w-[200px] sm:max-w-[240px]"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{ display: 'none' }} className="items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B00] text-white font-black text-sm flex items-center justify-center">
              V
            </div>
            <span className="font-extrabold text-base tracking-tight text-[#171717]">
              VCUBE <span className="text-[#FF6B00]">MediaFlow</span>
            </span>
          </div>
        </a>

        {/* Live Server & Database Health Indicator */}
        <div className="hidden sm:flex items-center gap-2 ml-3 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-[#F8F8F7] border-[#EAEAEA]">
          <span
            className={`w-2 h-2 rounded-full ${
              serverHealth.status === 'HEALTHY'
                ? 'bg-[#16A36A] animate-pulse'
                : serverHealth.status === 'DB_OFFLINE'
                ? 'bg-[#E9A23B]'
                : 'bg-[#DC4545]'
            }`}
          />
          <span className="text-[#737373]">
            {serverHealth.status === 'HEALTHY' && `Live (${serverHealth.latency}ms)`}
            {serverHealth.status === 'DB_OFFLINE' && 'DB Offline'}
            {serverHealth.status === 'OFFLINE' && 'Server Offline'}
            {serverHealth.status === 'CHECKING' && 'Checking...'}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {user ? (
          <>
            <NotificationDropdown />

            {/* Profile Meta (Desktop) */}
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-[#171717]">{user.name}</span>
              <span className="text-[11px] font-medium text-[#737373]">
                {user.role?.name || (isAdmin ? 'Administrator' : 'Team Member')}
              </span>
            </div>

            {/* Avatar Pill */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FFF7ED] border border-[#FFEDD5] text-[#FF6B00] font-black text-xs sm:text-sm flex items-center justify-center">
              {user.name?.charAt(0) || <User className="w-4 h-4" />}
            </div>

            {/* Desktop Logout Button */}
            <button
              onClick={logout}
              title="Sign Out"
              className="hidden md:flex p-2 text-[#737373] hover:text-[#DC4545] hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <a
            href="/login"
            className="text-xs font-bold text-[#FF6B00] hover:text-[#EA580C] px-3 py-1.5 rounded-lg border border-[#FF6B00]/30 hover:bg-[#FFF7ED] transition-colors"
          >
            Sign In
          </a>
        )}
      </div>
    </header>
  );
};

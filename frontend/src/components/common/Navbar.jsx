import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { LogOut, User, Bell, Activity, Sparkles } from 'lucide-react';

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
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 flex items-center justify-between">
      {/* Brand & Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm shadow-blue-500/20">
            V
          </div>
          <div>
            <span className="font-extrabold text-slate-900 tracking-tight text-base flex items-center gap-1.5">
              VCube MeFlow
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 tracking-wide">
                OPERATIONS
              </span>
            </span>
          </div>
        </div>

        {/* Server & Database Health Indicator */}
        <div className="hidden sm:flex items-center gap-2 ml-4 px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-50 border-slate-200">
          <span
            className={`w-2 h-2 rounded-full ${
              serverHealth.status === 'HEALTHY'
                ? 'bg-emerald-500 animate-pulse'
                : serverHealth.status === 'DB_OFFLINE'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
          />
          <span className="text-slate-600">
            {serverHealth.status === 'HEALTHY' && `Live (${serverHealth.latency}ms)`}
            {serverHealth.status === 'DB_OFFLINE' && 'DB Pending'}
            {serverHealth.status === 'OFFLINE' && 'Server Offline'}
            {serverHealth.status === 'CHECKING' && 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-bold text-slate-900">{user.name}</span>
              <span className="text-xs font-medium text-slate-500">
                {user.role?.name || (isAdmin ? 'Administrator' : 'Team Member')} • {user.department || 'Marketing'}
              </span>
            </div>

            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
              {user.name?.charAt(0) || <User className="w-4 h-4" />}
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <a
            href="/login"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
          >
            Sign In
          </a>
        )}
      </div>
    </header>
  );
};


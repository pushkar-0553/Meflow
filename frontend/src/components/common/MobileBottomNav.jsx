import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Film,
  CheckSquare,
  Calendar,
  Menu,
  X,
  Users,
  ShieldCheck,
  Share2,
  ScrollText,
  Briefcase,
  Sparkles,
  LogOut,
  User,
  ExternalLink,
} from 'lucide-react';

export const MobileBottomNav = () => {
  const { user, isAdmin, hasPermission, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const primaryTabs = [
    {
      name: 'Home',
      to: isAdmin ? '/admin/dashboard' : '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Drafts',
      to: isAdmin ? '/admin/drafts' : '/drafts',
      icon: Film,
    },
    {
      name: isAdmin ? 'Tasks' : 'My Work',
      to: isAdmin ? '/admin/tasks' : '/my-bucket',
      icon: CheckSquare,
    },
    {
      name: 'Calendar',
      to: isAdmin ? '/admin/calendar' : '/my-calendar',
      icon: Calendar,
    },
  ];

  const handleLogout = async () => {
    setMoreOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Fixed Bottom Tab Bar (Visible only on mobile/tablet screens < md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EAEAEA] px-3 py-1 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[11px] font-bold transition-all min-h-[44px] min-w-[54px] ${
                  isActive ? 'text-[#FF6B00]' : 'text-[#737373] hover:text-[#171717]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      isActive ? 'bg-[#FFF7ED] text-[#FF6B00]' : 'text-[#737373]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="mt-0.5 tracking-tight">{tab.name}</span>
                </>
              )}
            </NavLink>
          );
        })}

        {/* More / Menu Drawer Trigger */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[11px] font-bold transition-all min-h-[44px] min-w-[54px] ${
            moreOpen ? 'text-[#FF6B00]' : 'text-[#737373] hover:text-[#171717]'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              moreOpen ? 'bg-[#FFF7ED] text-[#FF6B00]' : 'text-[#737373]'
            }`}
          >
            <Menu className="w-4 h-4" />
          </div>
          <span className="mt-0.5 tracking-tight">More</span>
        </button>
      </nav>

      {/* Slide-Up Bottom Sheet for Secondary Navigation */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/50 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
          <div
            className="w-full bg-white rounded-t-3xl shadow-2xl border-t border-[#EAEAEA] p-5 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle & Close */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#FFF7ED] border border-[#FFEDD5] text-[#FF6B00] font-black text-sm flex items-center justify-center">
                  {user.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-[#171717]">{user.name}</h4>
                  <p className="text-[11px] font-semibold text-[#737373]">
                    {user.role?.name || (isAdmin ? 'Administrator' : 'Team Member')} • {user.department || 'Operations'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1.5 text-[#737373] hover:text-[#171717] rounded-xl hover:bg-[#F8F8F7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Links */}
            <div className="py-4 space-y-1">
              {isAdmin ? (
                <>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#A3A3A3] px-3 mb-1">
                    Management Controls
                  </div>
                  <NavLink
                    to="/admin/reviews"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#242424] hover:bg-[#F8F8F7] active:bg-[#FFF7ED]"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
                    <span>Review Sign-Off</span>
                  </NavLink>
                  <NavLink
                    to="/admin/users"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#242424] hover:bg-[#F8F8F7] active:bg-[#FFF7ED]"
                  >
                    <Users className="w-4 h-4 text-[#FF6B00]" />
                    <span>Employee Workforce Directory</span>
                  </NavLink>
                  <NavLink
                    to="/admin/roles"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#242424] hover:bg-[#F8F8F7] active:bg-[#FFF7ED]"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
                    <span>Roles & Permission Catalog</span>
                  </NavLink>
                  <NavLink
                    to="/admin/workload"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#242424] hover:bg-[#F8F8F7] active:bg-[#FFF7ED]"
                  >
                    <Briefcase className="w-4 h-4 text-[#FF6B00]" />
                    <span>Team Workload Hub</span>
                  </NavLink>
                  <NavLink
                    to="/admin/publishing"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#242424] hover:bg-[#F8F8F7] active:bg-[#FFF7ED]"
                  >
                    <Share2 className="w-4 h-4 text-[#FF6B00]" />
                    <span>Published Archive</span>
                  </NavLink>
                  <NavLink
                    to="/admin/audit"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#242424] hover:bg-[#F8F8F7] active:bg-[#FFF7ED]"
                  >
                    <ScrollText className="w-4 h-4 text-[#FF6B00]" />
                    <span>System Audit Ledger</span>
                  </NavLink>
                </>
              ) : (
                <>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#A3A3A3] px-3 mb-1">
                    Worker Channels
                  </div>
                  <NavLink
                    to="/available-work"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#242424] hover:bg-[#F8F8F7] active:bg-[#FFF7ED]"
                  >
                    <Sparkles className="w-4 h-4 text-[#FF6B00]" />
                    <span>Claim Available Work Pool</span>
                  </NavLink>
                  {hasPermission('publishing.view') && (
                    <NavLink
                      to="/admin/publishing"
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#242424] hover:bg-[#F8F8F7] active:bg-[#FFF7ED]"
                    >
                      <Share2 className="w-4 h-4 text-[#FF6B00]" />
                      <span>Published Content Archive</span>
                    </NavLink>
                  )}
                </>
              )}
            </div>

            {/* Logout Action */}
            <div className="pt-3 border-t border-[#EAEAEA]">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 px-3 rounded-xl bg-red-50 text-red-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out of Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


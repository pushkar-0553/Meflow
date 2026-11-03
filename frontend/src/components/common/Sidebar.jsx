import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Layers,
  Users,
  ShieldCheck,
  CheckSquare,
  Sparkles,
  Calendar,
  Share2,
  ScrollText,
  Sliders,
  Briefcase,
  Clock,
} from 'lucide-react';

export const Sidebar = () => {
  const { user, isAdmin, hasPermission } = useAuth();

  const adminNav = [
    { name: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Review Sign-Off', to: '/admin/reviews', icon: ShieldCheck, perm: 'approval.review' },
    { name: 'Tasks & Pipeline', to: '/admin/tasks', icon: Layers, perm: 'tasks.view' },
    { name: 'Employees', to: '/admin/users', icon: Users, perm: 'users.view' },
    { name: 'Roles & Permissions', to: '/admin/roles', icon: ShieldCheck, perm: 'roles.view' },
    { name: 'Team Workload', to: '/admin/workload', icon: Briefcase, perm: 'workload.view_all' },
    { name: 'Master Calendar', to: '/admin/calendar', icon: Calendar, perm: 'calendar.view_all' },
    { name: 'Published Archive', to: '/admin/publishing', icon: Share2, perm: 'publishing.view' },
    { name: 'Audit History', to: '/admin/audit', icon: ScrollText, perm: 'audit.view' },
  ];

  const employeeNav = [
    { name: 'My Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Available Work', to: '/available-work', icon: Sparkles },
    { name: 'My Bucket', to: '/my-bucket', icon: CheckSquare },
    { name: 'My Calendar', to: '/my-calendar', icon: Clock },
  ];

  const filteredAdminNav = adminNav.filter((item) => {
    if (isAdmin) return true;
    if (!item.perm) return true;
    return hasPermission(item.perm);
  });

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200/80 min-h-[calc(100vh-61px)] p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-6">
        {/* Workspace Mode Badge */}
        <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/60 text-xs font-semibold text-slate-600 flex items-center justify-between">
          <span className="uppercase tracking-wider text-[11px] text-slate-400">Mode</span>
          <span className="text-blue-700 font-bold">{isAdmin ? 'Admin Console' : 'Worker Workspace'}</span>
        </div>

        {/* Admin Navigation Section */}
        {isAdmin && (
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Management
            </div>
            <nav className="space-y-1">
              {filteredAdminNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}

        {/* Employee Workspace Navigation Section */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            {isAdmin ? 'Employee View' : 'My Production'}
          </div>
          <nav className="space-y-1">
            {employeeNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500 text-center">
        <p className="font-semibold text-slate-700">VCube Operations</p>
        <p className="text-[11px] text-slate-400 mt-0.5">TiDB • Resend • Cloudinary</p>
      </div>
    </aside>
  );
};


import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Film,
  Layers,
  Users,
  ShieldCheck,
  CheckSquare,
  Sparkles,
  Calendar,
  Share2,
  ScrollText,
  Briefcase,
  Clock,
} from 'lucide-react';

export const Sidebar = () => {
  const { user, isAdmin, hasPermission } = useAuth();

  const adminNav = [
    { name: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Video Drafts', to: '/admin/drafts', icon: Film, perm: 'drafts.view' },
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
    { name: 'Video Drafts', to: '/drafts', icon: Film },
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
    <aside className="w-64 shrink-0 bg-white border-r border-[#EAEAEA] min-h-[calc(100vh-57px)] p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-6">
        {/* Workspace Mode Badge */}
        <div className="px-3 py-2 rounded-xl bg-[#F8F8F7] border border-[#EAEAEA] text-xs font-semibold text-[#737373] flex items-center justify-between">
          <span className="uppercase tracking-wider text-[10px] text-[#737373] font-bold">Workspace</span>
          <span className="text-[#FF6B00] font-black">{isAdmin ? 'Admin Console' : 'Worker Portal'}</span>
        </div>

        {/* Admin Navigation Section */}
        {isAdmin && (
          <div>
            <div className="px-3 mb-2 text-[10px] font-black tracking-wider text-[#A3A3A3] uppercase">
              Management Console
            </div>
            <nav className="space-y-1">
              {filteredAdminNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                        isActive
                          ? 'bg-[#FFF7ED] text-[#FF6B00] shadow-xs'
                          : 'text-[#737373] hover:text-[#171717] hover:bg-[#F8F8F7]'
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

        {/* Employee Navigation Section */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-black tracking-wider text-[#A3A3A3] uppercase">
            {isAdmin ? 'Employee Pipeline' : 'My Production Queue'}
          </div>
          <nav className="space-y-1">
            {employeeNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                      isActive
                        ? 'bg-[#FFF7ED] text-[#FF6B00] shadow-xs'
                        : 'text-[#737373] hover:text-[#171717] hover:bg-[#F8F8F7]'
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
      <div className="p-3 rounded-xl bg-[#F8F8F7] border border-[#EAEAEA] text-xs text-[#737373] text-center">
        <p className="font-bold text-[#171717]">VCUBE MediaFlow</p>
        <p className="text-[10px] text-[#A3A3A3] mt-0.5">TiDB • Brevo • Cloudinary</p>
      </div>
    </aside>
  );
};

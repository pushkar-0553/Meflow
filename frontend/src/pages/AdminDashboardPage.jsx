import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { InviteEmployeeModal } from '../components/users/InviteEmployeeModal';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { CreateDraftModal } from '../components/projects/CreateDraftModal';
import apiClient from '../api/client';
import {
  Layers,
  Video,
  Scissors,
  CheckCircle,
  AlertTriangle,
  Share2,
  PlusCircle,
  UserPlus,
  ShieldCheck,
  TrendingUp,
  Users,
  Briefcase,
  Calendar,
  ScrollText,
  Clock,
  ArrowRight,
  ExternalLink,
  Sparkles,
  FileCheck2,
  Film,
  Flame,
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    scheduled: 0,
    inProgress: 0,
    underReview: 0,
    completed: 0,
    delayed: 0,
    totalTasks: 0,
    totalEmployees: 0,
    totalProjects: 0,
  });

  const [recentTasks, setRecentTasks] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [createDraftModalOpen, setCreateDraftModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [tasksRes, reviewsRes, usersRes, projectsRes] = await Promise.all([
        apiClient.get('/tasks'),
        apiClient.get('/workflow/pending-reviews'),
        apiClient.get('/users?status=ACTIVE'),
        apiClient.get('/projects/drafts?limit=5'),
      ]);

      const tasksList = tasksRes.success ? tasksRes.data || [] : [];
      const reviewsList = reviewsRes.success ? reviewsRes.data || [] : [];
      const usersList = usersRes.success ? usersRes.data || [] : [];
      const projectsList = projectsRes.success ? projectsRes.data || [] : [];

      setRecentTasks(tasksList.slice(0, 5));
      setRecentProjects(projectsList.slice(0, 5));
      setPendingReviews(reviewsList.slice(0, 3));

      // Calculate dynamic stats from live database records
      const scheduled = tasksList.filter((t) => t.status === 'SCHEDULED' || t.status === 'AVAILABLE').length;
      const inProgress = tasksList.filter((t) => t.status === 'IN_PROGRESS').length;
      const underReview = reviewsList.length;
      const completed = tasksList.filter((t) => t.status === 'COMPLETED').length;
      const delayed = tasksList.filter(
        (t) => t.scheduled_end && new Date(t.scheduled_end) < new Date() && t.status !== 'COMPLETED'
      ).length;

      setStats({
        scheduled,
        inProgress,
        underReview,
        completed,
        delayed,
        totalTasks: tasksList.length,
        totalEmployees: usersList.length,
        totalProjects: projectsRes.meta?.total || projectsList.length,
      });
    } catch (err) {
      console.warn('Dashboard telemetry fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Synchronizing executive command deck..." />;
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-20 md:pb-6 max-w-7xl mx-auto">
      {/* Top Banner with VCUBE Brand Styling */}
      <div className="bg-gradient-to-br from-neutral-900 via-stone-900 to-black rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden border border-neutral-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-orange-500/15 via-orange-500/5 to-transparent pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20 text-xs font-bold backdrop-blur-sm mb-3">
              <span className="w-2 h-2 rounded-full bg-vcube-orange animate-pulse" />
              Live Operations Deck • Administrator
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              Executive Production Command
            </h1>
            <p className="text-neutral-300 text-xs md:text-sm mt-1 max-w-xl">
              Track tasks across Cinematography, Video Editing, SEO, and Social Media distribution in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setCreateDraftModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-vcube-orange to-orange-500 hover:from-orange-600 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-500/25 transition-transform active:scale-[0.98] cursor-pointer"
            >
              <Film className="w-4 h-4" />
              <span>New Video Draft</span>
            </button>
            <button
              onClick={() => setCreateTaskModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-neutral-700 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-orange-400" />
              <span>New Task</span>
            </button>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-sm transition-colors border border-white/15 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Staff</span>
            </button>
          </div>
        </div>
      </div>

      {/* Production KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <div onClick={() => navigate('/admin/tasks')} className="cursor-pointer transition-transform hover:scale-102">
          <StatCard
            title="Total Tasks"
            value={stats.totalTasks}
            subtitle="Pipeline inventory"
            icon={Layers}
            variant="orange"
          />
        </div>
        <div onClick={() => navigate('/admin/tasks')} className="cursor-pointer transition-transform hover:scale-102">
          <StatCard
            title="In Progress"
            value={stats.inProgress}
            subtitle="Shooting / Editing"
            icon={Video}
            variant="amber"
          />
        </div>
        <div onClick={() => navigate('/admin/reviews')} className="cursor-pointer transition-transform hover:scale-102">
          <StatCard
            title="Review Queue"
            value={stats.underReview}
            subtitle="Manager Sign-off"
            icon={ShieldCheck}
            variant="purple"
          />
        </div>
        <div onClick={() => navigate('/admin/publishing')} className="cursor-pointer transition-transform hover:scale-102">
          <StatCard
            title="Completed"
            value={stats.completed}
            subtitle="Published / Staged"
            icon={CheckCircle}
            variant="emerald"
          />
        </div>
        <div onClick={() => navigate('/admin/tasks')} className="cursor-pointer transition-transform hover:scale-102">
          <StatCard
            title="Delayed"
            value={stats.delayed}
            subtitle="Past Deadline"
            icon={AlertTriangle}
            variant="rose"
          />
        </div>
        <div onClick={() => navigate('/admin/users')} className="cursor-pointer transition-transform hover:scale-102">
          <StatCard
            title="Team Staff"
            value={stats.totalEmployees}
            subtitle="Active members"
            icon={Users}
            variant="slate"
          />
        </div>
      </div>

      {/* Review Queue Action Banner if cuts are waiting */}
      {stats.underReview > 0 && (
        <div className="p-4 md:p-5 rounded-3xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs md:text-sm font-extrabold text-purple-950">
                {stats.underReview} Video Cut{stats.underReview > 1 ? 's' : ''} Awaiting Review Sign-Off
              </h3>
              <p className="text-[11px] md:text-xs text-purple-700 mt-0.5">
                Editors have submitted approval-gated cuts. Evaluate footage and sign off or request rework.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/reviews')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors shrink-0 shadow-xs shadow-purple-500/20 cursor-pointer"
          >
            Open Review Queue &rarr;
          </button>
        </div>
      )}

      {/* Quick Access Control Deck */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight">Operations Control Deck</h2>
          <p className="text-xs text-slate-500 mt-0.5">Quick access to administrative management consoles.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: 'Video Projects & Drafts', to: '/drafts', icon: Film, desc: '8-stage video lifecycle' },
            { name: 'Tasks & Pipeline', to: '/admin/tasks', icon: Layers, desc: 'Production roadmap & stages' },
            { name: 'Employee Directory', to: '/admin/users', icon: Users, desc: 'Onboard & manage staff' },
            { name: 'Roles & RBAC', to: '/admin/roles', icon: ShieldCheck, desc: 'Dynamic permission matrices' },
            { name: 'Team Capacity', to: '/admin/workload', icon: Briefcase, desc: 'Bottlenecks & member loads' },
            { name: 'Production Calendar', to: '/admin/calendar', icon: Calendar, desc: 'Shoot schedules & bookings' },
            { name: 'Published Archive', to: '/admin/publishing', icon: Share2, desc: 'Live social posts & proof' },
            { name: 'Personal Bucket', to: '/my-bucket', icon: FileCheck2, desc: 'Worker view & execution' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.to}
                onClick={() => navigate(item.to)}
                className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-orange-50/40 hover:border-orange-200 cursor-pointer transition-all space-y-1.5 group"
              >
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 group-hover:text-vcube-orange group-hover:border-orange-200 transition-colors shadow-2xs">
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-vcube-orange transition-colors">
                  {item.name}
                </h4>
                <p className="text-[11px] text-slate-400 font-medium line-clamp-1">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Master Video Projects Production Pipeline Table */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-vcube-orange" />
              <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight">
                Live Video Projects & Production Stages
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Unified lifecycle tracking across Scripts, Shoots, Footage Handover, Cuts, and Multi-Platform Publishing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreateDraftModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-vcube-orange to-orange-500 hover:from-orange-600 hover:to-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Draft</span>
            </button>
            <button
              onClick={() => navigate('/drafts')}
              className="text-xs font-bold text-vcube-orange hover:text-orange-700 flex items-center gap-1 cursor-pointer"
            >
              <span>All Projects ({stats.totalProjects})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {recentProjects.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
            <Film className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No Video Projects Yet</p>
            <button
              onClick={() => setCreateDraftModalOpen(true)}
              className="mt-2 text-xs text-vcube-orange font-bold hover:underline cursor-pointer"
            >
              + Create your first video draft
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Video Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4 text-right">Workspace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recentProjects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-vcube-orange">
                      {proj.project_code}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] uppercase">
                        {proj.course_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[200px] truncate">
                      {proj.title}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {proj.category?.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={proj.current_stage} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={proj.priority} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/projects/${proj.id}`)}
                        className="px-3 py-1.5 bg-vcube-orange hover:bg-orange-600 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                      >
                        Open Workspace
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Production Tasks Table */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight">Recent Content Productions</h2>
            <p className="text-xs text-slate-500 mt-0.5">Live overview of tasks moving through the pipeline.</p>
          </div>
          <button
            onClick={() => navigate('/admin/tasks')}
            className="text-xs font-bold text-vcube-orange hover:text-orange-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View All ({stats.totalTasks})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTasks.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
            <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No Production Tasks Yet</p>
            <button
              onClick={() => setCreateTaskModalOpen(true)}
              className="mt-2 text-xs text-vcube-orange font-bold hover:underline cursor-pointer"
            >
              + Create your first task
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Course / Campaign</th>
                  <th className="py-3 px-4">Task Title</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Target Role</th>
                  <th className="py-3 px-4 text-right">Pipeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recentTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-orange-900">
                      <span className="px-2 py-0.5 rounded-md bg-orange-100 text-[10px] uppercase">
                        {task.course_code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[200px] truncate">
                      {task.title}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={task.priority} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {task.target_role_name || 'Cinematographer'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/admin/tasks/${task.id}`)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task Creation Modal */}
      {createTaskModalOpen && (
        <CreateTaskModal
          isOpen={createTaskModalOpen}
          onClose={() => setCreateTaskModalOpen(false)}
          onSuccess={fetchDashboardData}
        />
      )}

      {/* Invite Employee Modal */}
      {inviteModalOpen && (
        <InviteEmployeeModal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
        />
      )}

      {/* Video Draft Creation Modal */}
      {createDraftModalOpen && (
        <CreateDraftModal
          isOpen={createDraftModalOpen}
          onClose={() => setCreateDraftModalOpen(false)}
          onSuccess={fetchDashboardData}
        />
      )}
    </div>
  );
};

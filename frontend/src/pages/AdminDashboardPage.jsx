import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/common/StatCard';
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
} from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const AdminDashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    scheduled: 0,
    inProgress: 0,
    editing: 0,
    underReview: 0,
    completed: 0,
    delayed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In Phase 1 foundation, test backend health and initialize counters
    const fetchDashboardStats = async () => {
      try {
        const res = await apiClient.get('/health');
        if (res.success) {
          // Placeholder metrics until Task & Production endpoints mount in later phases
          setStats({
            scheduled: 4,
            inProgress: 6,
            editing: 3,
            underReview: 2,
            completed: 18,
            delayed: 1,
          });
        }
      } catch (err) {
        console.warn('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading production telemetry..." />;
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold backdrop-blur-sm mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Operations Deck
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
              Executive Production Command
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Track assignments across Cinematography, Editing, SEO, and Publishing in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="/admin/tasks/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              New Production Task
            </a>
            <a
              href="/admin/users/invite"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-sm transition-colors border border-white/15"
            >
              <UserPlus className="w-4 h-4" />
              Invite Employee
            </a>
          </div>
        </div>
      </div>

      {/* Production KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Scheduled"
          value={stats.scheduled}
          subtitle="Awaiting Shoot"
          icon={Layers}
          variant="slate"
        />
        <StatCard
          title="Shooting"
          value={stats.inProgress}
          subtitle="On Set"
          icon={Video}
          variant="amber"
        />
        <StatCard
          title="In Editing"
          value={stats.editing}
          subtitle="First/Final Cut"
          icon={Scissors}
          variant="blue"
        />
        <StatCard
          title="Review"
          value={stats.underReview}
          subtitle="Manager Sign-off"
          icon={ShieldCheck}
          variant="purple"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          subtitle="Ready / Staged"
          icon={CheckCircle}
          variant="emerald"
        />
        <StatCard
          title="Delayed"
          value={stats.delayed}
          subtitle="Past Deadline"
          icon={AlertTriangle}
          variant="rose"
        />
      </div>

      {/* Pipeline Visual Progression */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Current Production Pipeline</h2>
            <p className="text-xs text-slate-500">Active distribution of content pieces across workflow stages</p>
          </div>
          <span className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
            View All Tasks &rarr;
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { stage: '1. Shoot', count: stats.inProgress, role: 'Cinematographer', color: 'bg-amber-500' },
            { stage: '2. Raw Footage', count: 2, role: 'Uploader', color: 'bg-indigo-500' },
            { stage: '3. Editing', count: stats.editing, role: 'Video Editor', color: 'bg-blue-500' },
            { stage: '4. Cut Review', count: stats.underReview, role: 'Manager', color: 'bg-purple-500' },
            { stage: '5. SEO Package', count: 3, role: 'SEO Team', color: 'bg-sky-500' },
            { stage: '6. Publishing', count: 18, role: 'Social Media', color: 'bg-emerald-500' },
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700">{item.stage}</span>
                  <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                </div>
                <div className="text-[11px] font-medium text-slate-400">{item.role}</div>
              </div>
              <div className="mt-4 text-2xl font-black text-slate-900">{item.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

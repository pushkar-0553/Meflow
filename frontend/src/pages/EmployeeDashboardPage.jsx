import React from 'react';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  MapPin,
  ArrowRight,
  UploadCloud,
} from 'lucide-react';

export const EmployeeDashboardPage = () => {
  const { user } = useAuth();

  // Dynamic greeting based on current local hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            {user?.role?.name || 'Production Team Member'}
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Team'} 👋
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Department: {user?.department || 'Marketing'} • Ready for today's assignments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/available-work"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Claim Available Work
          </a>
        </div>
      </div>

      {/* My Work Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Pending"
          value="2"
          subtitle="Awaiting pickup"
          icon={Clock}
          variant="slate"
        />
        <StatCard
          title="In Progress"
          value="3"
          subtitle="In your bucket"
          icon={Sparkles}
          variant="blue"
        />
        <StatCard
          title="Completed"
          value="8"
          subtitle="Signed off"
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          title="Delayed"
          value="1"
          subtitle="Needs attention"
          icon={AlertCircle}
          variant="rose"
        />
      </div>

      {/* Today's Schedule Feed */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Today's Production Schedule</h2>
            <p className="text-xs text-slate-500">Scheduled assignments and studio shooting blocks</p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <div className="space-y-3">
          {/* Example Today Task 1 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                  09:30 AM
                </span>
                <StatusBadge status="AVAILABLE" />
                <span className="text-xs font-bold text-slate-400">• Expected 2h</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">ITNIK Course Promotional Video - Shoot</h3>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  VCube Studio Room A
                </span>
                <span>• Stage: Cinematography</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors">
                Accept Assignment
              </button>
            </div>
          </div>

          {/* Example Today Task 2 */}
          <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-800 bg-slate-200 px-2 py-0.5 rounded-md">
                  02:00 PM
                </span>
                <StatusBadge status="IN_PROGRESS" />
                <span className="text-xs font-bold text-slate-400">• Expected 1.5h</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Python Fast-Track Reel - Shoot & Audio</h3>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Campus Lab 3
                </span>
                <span>• Stage: Cinematography</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/my-bucket"
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                Upload Proof
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


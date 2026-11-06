import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import apiClient from '../api/client';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  MapPin,
  ArrowRight,
  UploadCloud,
  CheckSquare,
  Video,
  FileText,
  Scissors,
  Share2,
  Image as ImageIcon,
  PlusCircle,
  ExternalLink,
  Layers,
  ChevronRight,
  Flame,
} from 'lucide-react';

export const EmployeeDashboardPage = () => {
  const { user } = useAuth();
  const [availableWork, setAvailableWork] = useState([]);
  const [myBucketItems, setMyBucketItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);

  const toast = useToast();
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const loadDashboardData = async () => {
    try {
      const [availRes, bucketRes] = await Promise.all([
        apiClient.get('/work/available'),
        apiClient.get('/work/my-bucket'),
      ]);

      if (availRes.success) setAvailableWork(availRes.data || []);
      if (bucketRes.success) setMyBucketItems(bucketRes.data || []);
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleAcceptWork = async (stageId) => {
    setAcceptingId(stageId);
    try {
      const res = await apiClient.post(`/work/${stageId}/accept`);
      if (res.success) {
        toast.success(res.message || 'Assignment claimed successfully!');
        loadDashboardData();
      }
    } catch (err) {
      if (err.statusCode === 409) {
        toast.error('Another team member just claimed this assignment.');
      } else {
        toast.error(err.message || 'Failed to accept assignment.');
      }
      loadDashboardData();
    } finally {
      setAcceptingId(null);
    }
  };

  const inProgressCount = myBucketItems.filter((i) => i.stage_status === 'IN_PROGRESS').length;
  const completedCount = myBucketItems.filter((i) => i.stage_status === 'APPROVED' || i.stage_status === 'COMPLETED').length;

  // Determine user role archetype
  const roleCode = (user?.role_code || user?.role?.code || '').toUpperCase();
  const isCinematographer = roleCode.includes('CINEMA') || roleCode.includes('CAM');
  const isEditor = roleCode.includes('EDIT');
  const isWriter = roleCode.includes('WRITE') || roleCode.includes('CONTENT');
  const isSEO = roleCode.includes('SEO') || roleCode.includes('PUBLISH') || roleCode.includes('SOCIAL');

  const todayDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  if (loading) {
    return <LoadingSpinner text="Synchronizing your production queue..." />;
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6 max-w-7xl mx-auto">
      {/* Mobile-First Welcome Header */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-500/10 via-amber-500/5 to-transparent rounded-bl-full pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-orange-50 text-vcube-orange border border-orange-200/80">
                {user?.role?.name || user?.role_code || 'Production Specialist'}
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">•</span>
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {todayDateFormatted}
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1.5">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Team'} 👋
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Department: <strong className="text-slate-700">{user?.department || 'Digital Marketing'}</strong> •{' '}
              <span className="text-vcube-orange font-bold">{availableWork.length}</span> unclaimed tasks in team pool
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 pt-1 md:pt-0">
            <button
              onClick={() => navigate('/available-work')}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-gradient-to-r from-vcube-orange to-orange-500 hover:from-orange-600 hover:to-orange-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Claim Work</span>
            </button>
            <button
              onClick={() => navigate('/drafts')}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-slate-600" />
              <span>New Draft</span>
            </button>
          </div>
        </div>
      </div>

      {/* Production Counters (2x2 on Mobile, 4x1 on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="In My Bucket"
          value={myBucketItems.length}
          subtitle="Assigned to you"
          icon={CheckSquare}
          variant="orange"
          onClick={() => navigate('/my-bucket')}
        />
        <StatCard
          title="Available Pool"
          value={availableWork.length}
          subtitle="Ready for pickup"
          icon={Clock}
          variant="amber"
          onClick={() => navigate('/available-work')}
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          subtitle="Currently working"
          icon={Flame}
          variant="blue"
          onClick={() => navigate('/my-bucket?filter=in_progress')}
        />
        <StatCard
          title="Completed"
          value={completedCount}
          subtitle="Signed off & done"
          icon={CheckCircle2}
          variant="emerald"
          onClick={() => navigate('/my-bucket?filter=completed')}
        />
      </div>

      {/* Role-Specific Focus Quick Banner */}
      {isCinematographer && (
        <div className="p-4 md:p-5 rounded-3xl bg-gradient-to-r from-orange-50 to-amber-50/60 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-vcube-orange text-white flex items-center justify-center shrink-0 shadow-xs">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs md:text-sm font-extrabold text-slate-900">
                Cinematography Hub & Footage Handover
              </h3>
              <p className="text-[11px] text-slate-600">
                Log shoot takes, register raw media chip IDs, and transfer footage to post-production.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/drafts?tab=upcoming_shoots')}
            className="px-3.5 py-2 bg-vcube-orange hover:bg-orange-600 text-white rounded-xl text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Upcoming Shoots</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isEditor && (
        <div className="p-4 md:p-5 rounded-3xl bg-gradient-to-r from-purple-50 to-indigo-50/60 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs md:text-sm font-extrabold text-slate-900">
                Video Editing & Cut Versions Queue
              </h3>
              <p className="text-[11px] text-slate-600">
                Deliver First Cuts, review feedback timestamps, and prepare final color-graded master exports.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/my-bucket')}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>My Editing Queue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isWriter && (
        <div className="p-4 md:p-5 rounded-3xl bg-gradient-to-r from-blue-50 to-sky-50/60 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs md:text-sm font-extrabold text-slate-900">
                Scriptwriting & Concept Development
              </h3>
              <p className="text-[11px] text-slate-600">
                Draft hooks, Google Docs scripts, and scene outlines for approved video drafts.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/drafts?tab=pending_content')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Pending Scripts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isSEO && (
        <div className="p-4 md:p-5 rounded-3xl bg-gradient-to-r from-emerald-50 to-teal-50/60 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs md:text-sm font-extrabold text-slate-900">
                SEO & Multi-Platform Distribution Hub
              </h3>
              <p className="text-[11px] text-slate-600">
                Final approved cuts are ready for YouTube, Instagram, LinkedIn, and Facebook release.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/publishing')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Publishing Deck</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Available For You Right Now Section */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-vcube-orange animate-pulse" />
              <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight">
                Available in Pool ({availableWork.length})
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Unclaimed tasks matching your role and permissions
            </p>
          </div>
          {availableWork.length > 0 && (
            <button
              onClick={() => navigate('/available-work')}
              className="text-xs font-bold text-vcube-orange hover:text-orange-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {availableWork.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 font-medium">
            <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No unclaimed tasks waiting for your role right now. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableWork.slice(0, 4).map((stage) => (
              <div
                key={stage.stage_id}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-orange-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-orange-100 text-orange-800">
                        {stage.course_code}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {stage.stage_type}
                      </span>
                    </div>
                    <StatusBadge status={stage.priority} />
                  </div>

                  <h3 className="text-xs md:text-sm font-bold text-slate-900 group-hover:text-vcube-orange transition-colors line-clamp-2">
                    {stage.task_title}
                  </h3>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      {stage.location || 'Studio Set'}
                    </span>
                    <span>• {stage.expected_duration_minutes || 120}m duration</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-medium">
                    Tap to claim assignment
                  </span>
                  <button
                    onClick={() => handleAcceptWork(stage.stage_id)}
                    disabled={acceptingId === stage.stage_id}
                    className="px-3.5 py-2 bg-gradient-to-r from-vcube-orange to-orange-500 hover:from-orange-600 hover:to-orange-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-[0.97] cursor-pointer"
                  >
                    {acceptingId === stage.stage_id ? 'Claiming...' : 'Claim Task'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Work In My Bucket Section */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight">
              My Active Bucket ({myBucketItems.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Tasks currently claimed and in your personal pipeline</p>
          </div>
          {myBucketItems.length > 0 && (
            <button
              onClick={() => navigate('/my-bucket')}
              className="text-xs font-bold text-vcube-orange hover:text-orange-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Manage Bucket</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {myBucketItems.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 font-medium">
            <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            You don't have any active tasks in your bucket.{' '}
            <button
              onClick={() => navigate('/available-work')}
              className="text-vcube-orange font-bold underline ml-1 cursor-pointer"
            >
              Claim one now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {myBucketItems.slice(0, 4).map((item) => (
              <div
                key={item.stage_id}
                className="p-4 rounded-2xl bg-orange-50/20 border border-orange-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-orange-50/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-orange-100 text-orange-900">
                      {item.course_code}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                      {item.stage_type}
                    </span>
                    <StatusBadge status={item.stage_status} />
                  </div>
                  <h3 className="text-xs md:text-sm font-bold text-slate-900">{item.task_title}</h3>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {item.location || 'Studio Set'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 md:pt-0">
                  <button
                    onClick={() => navigate('/my-bucket')}
                    className="w-full md:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-vcube-orange" />
                    <span>Open in Bucket</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

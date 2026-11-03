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
  AlertCircle,
  Calendar,
  MapPin,
  ArrowRight,
  UploadCloud,
  CheckSquare,
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
        toast.success(res.message);
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
  const completedCount = myBucketItems.filter((i) => i.stage_status === 'APPROVED').length;
  const pendingCount = myBucketItems.filter((i) => i.stage_status === 'ACCEPTED').length;

  if (loading) {
    return <LoadingSpinner text="Loading today's production deck..." />;
  }

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
            Department: {user?.department || 'Marketing'} • {availableWork.length} assignments available in pool
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/available-work')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Claim Available Work
          </button>
        </div>
      </div>

      {/* My Work Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="In My Bucket"
          value={myBucketItems.length}
          subtitle="Total assigned"
          icon={CheckSquare}
          variant="blue"
          onClick={() => navigate('/my-bucket')}
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          subtitle="Currently working"
          icon={Sparkles}
          variant="amber"
          onClick={() => navigate('/my-bucket?filter=in_progress')}
        />
        <StatCard
          title="Available Pool"
          value={availableWork.length}
          subtitle="Ready for pickup"
          icon={Clock}
          variant="slate"
          onClick={() => navigate('/available-work')}
        />
        <StatCard
          title="Completed"
          value={completedCount}
          subtitle="Signed off"
          icon={CheckCircle2}
          variant="emerald"
          onClick={() => navigate('/my-bucket?filter=completed')}
        />
      </div>

      {/* Available for You Today Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Available For You Right Now</h2>
            <p className="text-xs text-slate-500">Unclaimed tasks matching your role and capabilities</p>
          </div>
          <button
            onClick={() => navigate('/available-work')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            View All ({availableWork.length}) &rarr;
          </button>
        </div>

        {availableWork.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/60 text-xs text-slate-400 font-medium">
            No unclaimed tasks waiting for your role right now.
          </div>
        ) : (
          <div className="space-y-3">
            {availableWork.slice(0, 3).map((stage) => (
              <div
                key={stage.stage_id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-300 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                      {stage.course_code}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                      STAGE: {stage.stage_type}
                    </span>
                    <StatusBadge status={stage.priority} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{stage.task_title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {stage.location || 'Studio Set'}
                    </span>
                    <span>• {stage.expected_duration_minutes || 120} mins expected</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAcceptWork(stage.stage_id)}
                    disabled={acceptingId === stage.stage_id}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    {acceptingId === stage.stage_id ? 'Accepting...' : 'Accept Assignment'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Work In My Bucket Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Your Active Work</h2>
            <p className="text-xs text-slate-500">Tasks currently in your bucket</p>
          </div>
          <button
            onClick={() => navigate('/my-bucket')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            Open My Bucket &rarr;
          </button>
        </div>

        {myBucketItems.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/60 text-xs text-slate-400 font-medium">
            You don't have any active tasks in your bucket.{' '}
            <button onClick={() => navigate('/available-work')} className="text-blue-600 font-bold underline">
              Claim a task
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {myBucketItems.slice(0, 3).map((item) => (
              <div
                key={item.stage_id}
                className="p-4 rounded-2xl bg-blue-50/30 border border-blue-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                      {item.course_code}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {item.stage_type}
                    </span>
                    <StatusBadge status={item.stage_status} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{item.task_title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {item.location || 'Studio Set'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/my-bucket')}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                    Manage in Bucket
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

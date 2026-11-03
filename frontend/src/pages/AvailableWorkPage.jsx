import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield,
} from 'lucide-react';

export const AvailableWorkPage = () => {
  const [availableStages, setAvailableStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchAvailableWork = async () => {
    try {
      const res = await apiClient.get('/work/available');
      if (res.success) {
        setAvailableStages(res.data || []);
      }
    } catch (err) {
      toast.error('Failed to load available work pool.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableWork();
  }, []);

  const handleAccept = async (stage) => {
    setClaimingId(stage.stage_id);
    try {
      const res = await apiClient.post(`/work/${stage.stage_id}/accept`);
      if (res.success) {
        toast.success(res.message);
        // Refresh and navigate to My Bucket
        navigate('/my-bucket');
      }
    } catch (err) {
      if (err.statusCode === 409) {
        toast.error('Another team member just accepted this assignment!');
      } else {
        toast.error(err.message || 'Failed to claim assignment.');
      }
      fetchAvailableWork();
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Checking available production tasks..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Self-Serve Work Pool
            </span>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
              {availableStages.length} Available
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Available Work
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Pick up ready assignments matching your role and place them into your personal bucket.
          </p>
        </div>
      </div>

      {/* Available Stages Grid */}
      {availableStages.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">You're All Caught Up!</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            There are currently no unclaimed tasks waiting for your role. New shoots and edits will appear here as stages unlock.
          </p>
          <button
            onClick={() => navigate('/my-bucket')}
            className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
          >
            <span>Go to My Bucket</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableStages.map((stage) => {
            const isClaiming = claimingId === stage.stage_id;

            return (
              <div
                key={stage.stage_id}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-100/80 text-blue-800 text-[11px] font-extrabold uppercase tracking-wide">
                      {stage.course_code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={stage.priority} />
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {stage.stage_type}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {stage.task_title}
                  </h3>

                  {/* Details */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-500 font-medium">
                    {stage.scheduled_start && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {new Date(stage.scheduled_start).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Expected Duration: {stage.expected_duration_minutes || 120} mins</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{stage.location || 'Studio Set'}</span>
                    </div>
                  </div>
                </div>

                {/* Accept Button Footer */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-slate-400">
                    Role: <strong className="text-slate-600">{stage.target_role_name}</strong>
                  </div>

                  <button
                    onClick={() => handleAccept(stage)}
                    disabled={isClaiming}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isClaiming ? (
                      'Claiming...'
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Accept Assignment
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


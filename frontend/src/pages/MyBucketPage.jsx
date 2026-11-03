import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { CompleteStageModal } from '../components/workflow/CompleteStageModal';
import { UploadProofModal } from '../components/proofs/UploadProofModal';
import { StageProofsModal } from '../components/proofs/StageProofsModal';
import {
  CheckSquare,
  Play,
  RotateCcw,
  UploadCloud,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  FileCheck2,
} from 'lucide-react';

export const MyBucketPage = () => {
  const [bucketItems, setBucketItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, in_progress, completed, delayed
  const [activeCompleteStage, setActiveCompleteStage] = useState(null);
  const [activeUploadProofStage, setActiveUploadProofStage] = useState(null);
  const [activeViewProofsStage, setActiveViewProofsStage] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchMyBucket = async () => {
    try {
      const res = await apiClient.get(`/work/my-bucket?filter=${filter}`);
      if (res.success) {
        setBucketItems(res.data || []);
      }
    } catch (err) {
      toast.error('Failed to load your personal work bucket.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBucket();
  }, [filter]);

  const handleStartWork = async (stageId) => {
    try {
      const res = await apiClient.post(`/work/${stageId}/start`);
      if (res.success) {
        toast.success(res.message);
        fetchMyBucket();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start execution.');
    }
  };

  const handleRelease = async (stageId, taskTitle) => {
    const confirmed = window.confirm(`Are you sure you want to release '${taskTitle}' back to the available work pool?`);
    if (!confirmed) return;

    try {
      const res = await apiClient.post(`/work/${stageId}/reject`);
      if (res.success) {
        toast.info(res.message);
        fetchMyBucket();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to release assignment.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Personal Execution Workspace
            </span>
            <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
              {bucketItems.length} Assignments
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            My Bucket
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Execute accepted shoots, cuts, and optimization stages. Upload proof of work to advance production.
          </p>
        </div>

        <div>
          <button
            onClick={() => navigate('/available-work')}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            Pick Up More Work
          </button>
        </div>
      </div>

      {/* Timeline Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'all', label: 'All Work' },
          { key: 'today', label: "Today's Schedule" },
          { key: 'in_progress', label: 'In Progress' },
          { key: 'completed', label: 'Completed' },
          { key: 'delayed', label: 'Delayed' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              filter === item.key
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Bucket List */}
      {loading ? (
        <div className="p-12">
          <LoadingSpinner text="Loading your personal work bucket..." />
        </div>
      ) : bucketItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Your Bucket is Empty</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You don't have any tasks matching this filter. Browse available work to claim assignments for your role.
          </p>
          <button
            onClick={() => navigate('/available-work')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Browse Available Work
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {bucketItems.map((item) => (
            <div
              key={item.stage_id}
              className={`bg-white rounded-3xl p-5 border shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                item.stage_status === 'IN_PROGRESS'
                  ? 'border-blue-300 ring-1 ring-blue-500/10'
                  : 'border-slate-200/80'
              }`}
            >
              {/* Task Details */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">
                    {item.course_code}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                    STAGE: {item.stage_type}
                  </span>
                  <StatusBadge status={item.stage_status} />
                  <StatusBadge status={item.priority} />
                </div>

                <h3 className="text-base font-bold text-slate-900 truncate">
                  {item.task_title}
                </h3>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                  {item.scheduled_start && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(item.scheduled_start).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}

                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {item.location || 'Studio Set'}
                  </span>

                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {item.expected_duration_minutes || 120} mins
                  </span>
                </div>

                {/* Manager Revision Feedback Alert Banner */}
                {item.stage_status === 'CHANGES_REQUESTED' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold">Manager Revisions Required: </span>
                      <span className="font-medium">{item.rework_comments || 'Please revise the cut and resubmit for review.'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Start Work Button */}
                {item.assignment_status === 'ACCEPTED' && item.stage_status !== 'IN_PROGRESS' && item.stage_status !== 'CHANGES_REQUESTED' && (
                  <button
                    onClick={() => handleStartWork(item.stage_id)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Start Work
                  </button>
                )}

                {/* Complete Stage or Submit for Review Button */}
                {item.stage_status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => setActiveCompleteStage(item)}
                    className={`px-3.5 py-2 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs ${
                      item.is_approval_gate
                        ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {item.is_approval_gate ? 'Submit for Review' : 'Complete Stage'}
                  </button>
                )}

                {/* Resubmit after Rework */}
                {item.stage_status === 'CHANGES_REQUESTED' && (
                  <button
                    onClick={() => setActiveCompleteStage(item)}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs shadow-purple-500/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Resubmit Cut
                  </button>
                )}

                {/* Release back to pool */}
                {item.stage_status !== 'APPROVED' && item.stage_status !== 'SUBMITTED' && (
                  <button
                    onClick={() => handleRelease(item.stage_id, item.task_title)}
                    title="Release assignment back to available work pool"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}

                {/* View Proofs Button */}
                {item.proof_count > 0 && (
                  <button
                    onClick={() => setActiveViewProofsStage(item)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                    Proofs ({item.proof_count})
                  </button>
                )}

                {/* Upload Proof button */}
                <button
                  onClick={() => setActiveUploadProofStage(item)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs shadow-blue-500/20"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Upload Proof
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Complete Stage Modal */}
      {activeCompleteStage && (
        <CompleteStageModal
          stage={activeCompleteStage}
          isOpen={Boolean(activeCompleteStage)}
          onClose={() => setActiveCompleteStage(null)}
          onSuccess={fetchMyBucket}
        />
      )}

      {/* Upload Proof Modal */}
      {activeUploadProofStage && (
        <UploadProofModal
          stage={activeUploadProofStage}
          isOpen={Boolean(activeUploadProofStage)}
          onClose={() => setActiveUploadProofStage(null)}
          onSuccess={fetchMyBucket}
        />
      )}

      {/* View Proofs Modal */}
      {activeViewProofsStage && (
        <StageProofsModal
          stage={activeViewProofsStage}
          isOpen={Boolean(activeViewProofsStage)}
          onClose={() => setActiveViewProofsStage(null)}
          onUploadNew={(stg) => {
            setActiveViewProofsStage(null);
            setActiveUploadProofStage(stg);
          }}
        />
      )}
    </div>
  );
};


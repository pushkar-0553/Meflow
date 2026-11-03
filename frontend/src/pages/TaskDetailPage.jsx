import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ReviewCutModal } from '../components/workflow/ReviewCutModal';
import { CompleteStageModal } from '../components/workflow/CompleteStageModal';
import { UploadProofModal } from '../components/proofs/UploadProofModal';
import { StageProofsModal } from '../components/proofs/StageProofsModal';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Layers,
  User,
  Shield,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Send,
  RotateCcw,
  ShieldCheck,
  CheckCircle,
  FileCheck2,
  UploadCloud,
} from 'lucide-react';

export const TaskDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const { user, isAdmin, hasPermission } = useAuth();
  const [task, setTask] = useState(null);
  const [stages, setStages] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reassigningStageId, setReassigningStageId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [activeReviewStage, setActiveReviewStage] = useState(null);
  const [activeCompleteStage, setActiveCompleteStage] = useState(null);
  const [activeUploadProofStage, setActiveUploadProofStage] = useState(null);
  const [activeViewProofsStage, setActiveViewProofsStage] = useState(null);

  const fetchTaskDetails = async () => {
    try {
      const [taskRes, usersRes] = await Promise.all([
        apiClient.get(`/tasks/${id}`),
        apiClient.get('/users?status=ACTIVE'),
      ]);

      if (taskRes.success && taskRes.data) {
        setTask(taskRes.data.task);
        setStages(taskRes.data.stages || []);
        setProofs(taskRes.data.proofs || []);
      }
      if (usersRes.success) {
        setEmployees(usersRes.data || []);
      }
    } catch (err) {
      toast.error('Failed to load task details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const handleDirectAssign = async (stageId) => {
    if (!selectedUserId) {
      toast.error('Please select an employee to assign.');
      return;
    }

    try {
      const res = await apiClient.post(`/tasks/stages/${stageId}/assign`, {
        user_id: parseInt(selectedUserId, 10),
      });

      if (res.success) {
        toast.success(res.message);
        setReassigningStageId(null);
        setSelectedUserId('');
        fetchTaskDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to assign stage.');
    }
  };

  const handleRollback = async (stageId, stageType) => {
    const confirmed = window.confirm(
      `Are you sure you want to rollback stage '${stageType}'? This will reset downstream stages to PENDING.`
    );
    if (!confirmed) return;

    try {
      const res = await apiClient.post(`/workflow/stages/${stageId}/rollback`);
      if (res.success) {
        toast.info(res.message);
        fetchTaskDetails();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to rollback stage.');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading production pipeline timeline..." />;
  }

  if (!task) {
    return (
      <div className="p-8 text-center text-slate-500">
        Task not found.{' '}
        <button onClick={() => navigate('/admin/tasks')} className="text-blue-600 underline">
          Return to tasks
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/tasks')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Production Directory
        </button>
      </div>

      {/* Task Overview Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 text-[11px] font-extrabold uppercase">
              {task.course_code}
            </span>
            <StatusBadge status={task.priority} />
            <StatusBadge status={task.status} />
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{task.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
            {task.scheduled_start && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(task.scheduled_start).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}

            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {task.location || 'Studio Set'}
            </span>

            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Expected {task.expected_duration_minutes || 120} mins
            </span>
          </div>

          {task.description && (
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2">
              {task.description}
            </p>
          )}
        </div>
      </div>

      {/* Sequential Production Stages Timeline */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Content Production Pipeline</h2>
          <p className="text-xs text-slate-500">
            Stages advance sequentially. When a stage completes, the next stage unlocks automatically for eligible team members.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {stages.map((stage, idx) => {
            const isReassigning = reassigningStageId === stage.id;

            return (
              <div
                key={stage.id}
                className={`p-4 rounded-2xl border transition-all ${
                  stage.status === 'IN_PROGRESS'
                    ? 'bg-blue-50/40 border-blue-200 shadow-xs'
                    : stage.status === 'APPROVED'
                    ? 'bg-emerald-50/30 border-emerald-200'
                    : 'bg-slate-50/70 border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Stage Index & Type */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        stage.status === 'APPROVED'
                          ? 'bg-emerald-600 text-white'
                          : stage.status === 'IN_PROGRESS'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">
                          {stage.stage_type}
                        </span>
                        <StatusBadge status={stage.status} />
                        {stage.is_approval_gate && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">
                            Approval Gate
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                        Target Role: <strong className="text-slate-600">{stage.target_role_name}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Assignee Info */}
                  <div className="flex items-center gap-2">
                    {stage.assignee_name ? (
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                        <div className="text-xs">
                          <span className="font-bold text-slate-800">{stage.assignee_name}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5">
                            ({stage.assignment_type === 'SELF_CLAIM' ? 'Self-Claimed' : 'Manager-Assigned'})
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 italic">
                        {stage.status === 'READY' ? 'Available in work pool' : 'Pending prior stage'}
                      </span>
                    )}

                    {/* View Proofs Button */}
                    <button
                      onClick={() => setActiveViewProofsStage({ ...stage, task_title: task.title })}
                      className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                      Proofs
                    </button>

                    {/* Upload Proof Button for active assignee or admin */}
                    {(stage.assignee_id === user?.id || isAdmin) && stage.status !== 'APPROVED' && (
                      <button
                        onClick={() => setActiveUploadProofStage({ ...stage, task_title: task.title })}
                        title="Upload deliverable or proof for this stage"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      >
                        <UploadCloud className="w-4 h-4" />
                      </button>
                    )}

                    {/* Review Cut Action Button */}
                    {stage.status === 'SUBMITTED' && (isAdmin || hasPermission('approval.review')) && (
                      <button
                        onClick={() => setActiveReviewStage({ ...stage, task_title: task.title })}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs shadow-purple-500/20"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Review Cut
                      </button>
                    )}

                    {/* Complete Stage Action Button */}
                    {stage.status === 'IN_PROGRESS' && (stage.assignee_id === user?.id || isAdmin) && (
                      <button
                        onClick={() => setActiveCompleteStage({ ...stage, task_title: task.title })}
                        className={`px-3 py-1.5 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs ${
                          stage.is_approval_gate
                            ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'
                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {stage.is_approval_gate ? 'Submit for Review' : 'Complete Stage'}
                      </button>
                    )}

                    {/* Direct Assign Button */}
                    {(isAdmin || hasPermission('tasks.assign')) && (
                      <button
                        onClick={() => setReassigningStageId(isReassigning ? null : stage.id)}
                        className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        {stage.assignee_name ? 'Reassign' : 'Assign Direct'}
                      </button>
                    )}

                    {/* Rollback Stage Button */}
                    {['SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED'].includes(stage.status) &&
                      (isAdmin || hasPermission('production.rollback')) && (
                        <button
                          onClick={() => handleRollback(stage.id, stage.stage_type)}
                          title="Rollback stage to READY and reset downstream stages"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                  </div>
                </div>

                {/* Direct Assign Form Row (Collapsible) */}
                {isReassigning && (
                  <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2">
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none font-medium flex-1 max-w-xs"
                    >
                      <option value="">Select Employee...</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role_name})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleDirectAssign(stage.id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Confirm Assignment
                    </button>

                    <button
                      onClick={() => setReassigningStageId(null)}
                      className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Modal */}
      {activeReviewStage && (
        <ReviewCutModal
          stage={activeReviewStage}
          isOpen={Boolean(activeReviewStage)}
          onClose={() => setActiveReviewStage(null)}
          onSuccess={fetchTaskDetails}
        />
      )}

      {/* Complete Stage Modal */}
      {activeCompleteStage && (
        <CompleteStageModal
          stage={activeCompleteStage}
          isOpen={Boolean(activeCompleteStage)}
          onClose={() => setActiveCompleteStage(null)}
          onSuccess={fetchTaskDetails}
        />
      )}

      {/* Upload Proof Modal */}
      {activeUploadProofStage && (
        <UploadProofModal
          stage={activeUploadProofStage}
          isOpen={Boolean(activeUploadProofStage)}
          onClose={() => setActiveUploadProofStage(null)}
          onSuccess={fetchTaskDetails}
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


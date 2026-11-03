import React, { useState } from 'react';
import apiClient from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  ExternalLink,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';

export const ReviewCutModal = ({ stage, isOpen, onClose, onSuccess }) => {
  const [decision, setDecision] = useState('APPROVED');
  const [reworkComments, setReworkComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  if (!isOpen || !stage) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (decision === 'CHANGES_REQUESTED' && (!reworkComments || !reworkComments.trim())) {
      toast.error('Detailed rework instructions are mandatory when requesting revisions.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post(`/workflow/stages/${stage.stage_id || stage.id}/review`, {
        decision,
        rework_comments: reworkComments.trim() || null,
      });

      if (res.success) {
        toast.success(res.message);
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit review decision.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Review & Sign-Off</h2>
              <p className="text-xs text-slate-500 font-medium">
                Stage: {stage.stage_type} • {stage.task_title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 overflow-y-auto pr-1">
          {/* Submitter & Context Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                Submitted By
              </span>
              <span className="font-extrabold text-slate-800">
                {stage.submitter_name || stage.assignee_name || 'Assigned Worker'}
              </span>
            </div>
            {stage.latest_proof_url && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Attached Review Proof
                </span>
                <a
                  href={stage.latest_proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 underline"
                >
                  View Cut Asset <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Decision Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Decision
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecision('APPROVED')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  decision === 'APPROVED'
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2
                  className={`w-5 h-5 mt-0.5 shrink-0 ${
                    decision === 'APPROVED' ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                />
                <div>
                  <div className="font-bold text-xs text-slate-900">Approve Stage</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Unlocks next stage in the pipeline
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDecision('CHANGES_REQUESTED')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  decision === 'CHANGES_REQUESTED'
                    ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlertCircle
                  className={`w-5 h-5 mt-0.5 shrink-0 ${
                    decision === 'CHANGES_REQUESTED' ? 'text-rose-600' : 'text-slate-400'
                  }`}
                />
                <div>
                  <div className="font-bold text-xs text-slate-900">Request Revisions</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Sends back to editor with notes
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Comments Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>{decision === 'CHANGES_REQUESTED' ? 'Mandatory Rework Notes *' : 'Approval Feedback (Optional)'}</span>
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <textarea
              rows={4}
              value={reworkComments}
              onChange={(e) => setReworkComments(e.target.value)}
              placeholder={
                decision === 'CHANGES_REQUESTED'
                  ? 'Specify required revisions (e.g., audio sync at 01:23, color grade adjustments, missing graphics)...'
                  : 'Add any compliments or notes for the team...'
              }
              className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 border rounded-2xl focus:outline-none focus:ring-2 focus:bg-white transition-all font-medium ${
                decision === 'CHANGES_REQUESTED'
                  ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                  : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
              }`}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl transition-all shadow-sm ${
                decision === 'APPROVED'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
              }`}
            >
              {submitting
                ? 'Recording...'
                : decision === 'APPROVED'
                ? 'Confirm Approval'
                : 'Submit Rework Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

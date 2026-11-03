import React, { useState } from 'react';
import apiClient from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { X, CheckCircle, ShieldAlert, Sparkles, MessageSquare } from 'lucide-react';

export const CompleteStageModal = ({ stage, isOpen, onClose, onSuccess }) => {
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  if (!isOpen || !stage) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await apiClient.post(`/workflow/stages/${stage.stage_id || stage.id}/complete`, {
        comments: comments.trim() || null,
      });

      if (res.success) {
        toast.success(res.message);
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to complete stage.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                stage.is_approval_gate
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {stage.is_approval_gate ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {stage.is_approval_gate ? 'Submit for Review' : 'Complete Stage'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {stage.stage_type} • {stage.task_title}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {stage.is_approval_gate ? (
            <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200 text-xs text-purple-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Management Approval Gate
              </div>
              <p className="text-[11px] text-purple-700">
                This stage requires managerial sign-off. Once submitted, it will be placed in the
                manager's review queue. Ensure your cut link or proof is attached before submitting.
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Pipeline Auto-Unlock
              </div>
              <p className="text-[11px] text-emerald-700">
                Completing this stage will automatically unlock the next sequential stage for the
                responsible team role in the Available Work Pool.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Completion Notes / Hand-Off Summary</span>
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Any details on footage, cuts, or specific settings used..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-medium"
            />
          </div>

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
                stage.is_approval_gate
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
              }`}
            >
              {submitting
                ? 'Submitting...'
                : stage.is_approval_gate
                ? 'Submit Cut for Review'
                : 'Confirm Stage Completion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

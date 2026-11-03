import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ReviewCutModal } from '../components/workflow/ReviewCutModal';
import { StageProofsModal } from '../components/proofs/StageProofsModal';
import {
  ShieldCheck,
  CheckCircle,
  FileText,
  ExternalLink,
  Clock,
  User,
  AlertTriangle,
  PlaySquare,
  Sparkles,
  FileCheck2,
} from 'lucide-react';

export const PendingReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReviewStage, setActiveReviewStage] = useState(null);
  const [activeViewProofsStage, setActiveViewProofsStage] = useState(null);
  const toast = useToast();

  const fetchPendingReviews = async () => {
    try {
      const res = await apiClient.get('/workflow/pending-reviews');
      if (res.success) {
        setReviews(res.data || []);
      }
    } catch (err) {
      toast.error('Failed to load pending reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
              Quality Assurance & Sign-Off
            </span>
            <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">
              {reviews.length} Awaiting Decision
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Review Sign-Off Queue
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Evaluate submitted video cuts, thumbnail designs, and content proofs. Approve to advance to the next pipeline stage or return with rework notes.
          </p>
        </div>
      </div>

      {/* Review Queue List */}
      {loading ? (
        <div className="p-12">
          <LoadingSpinner text="Checking for cuts awaiting managerial review..." />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Review Queue is All Clear</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            There are no cuts currently waiting for sign-off. When editors or creators submit their approval-gated stages, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((cut) => (
            <div
              key={cut.stage_id}
              className="bg-white rounded-3xl p-5 border border-purple-200 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Details */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">
                    {cut.course_code}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-700 text-[10px] font-extrabold uppercase">
                    CUT: {cut.stage_type}
                  </span>
                  <StatusBadge status={cut.priority} />
                  <StatusBadge status={cut.status} />
                </div>

                <h3 className="text-base font-bold text-slate-900 truncate">
                  {cut.task_title}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Submitted by: <strong className="font-bold">{cut.submitter_name || 'Worker'}</strong>
                  </span>

                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    Submitted {new Date(cut.submitted_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  {cut.latest_proof_url && (
                    <a
                      href={cut.latest_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 font-bold hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View Cut Asset <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="shrink-0 flex items-center gap-2">
                {cut.proof_count > 0 && (
                  <button
                    onClick={() => setActiveViewProofsStage(cut)}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                    Deliverables ({cut.proof_count})
                  </button>
                )}

                <button
                  onClick={() => setActiveReviewStage(cut)}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-xs shadow-purple-500/20"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Review & Sign-Off
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review & Decision Modal */}
      {activeReviewStage && (
        <ReviewCutModal
          stage={activeReviewStage}
          isOpen={Boolean(activeReviewStage)}
          onClose={() => setActiveReviewStage(null)}
          onSuccess={fetchPendingReviews}
        />
      )}

      {/* View Proofs Modal */}
      {activeViewProofsStage && (
        <StageProofsModal
          stage={activeViewProofsStage}
          isOpen={Boolean(activeViewProofsStage)}
          onClose={() => setActiveViewProofsStage(null)}
        />
      )}
    </div>
  );
};


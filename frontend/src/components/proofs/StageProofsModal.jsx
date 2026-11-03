import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import {
  X,
  FileCheck2,
  ExternalLink,
  Trash2,
  Plus,
  Clock,
  User,
  Image as ImageIcon,
  Link2,
  FileText,
  Share2,
} from 'lucide-react';

export const StageProofsModal = ({ stage, isOpen, onClose, onUploadNew }) => {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { user, isAdmin } = useAuth();

  const stageId = stage?.stage_id || stage?.id;

  const fetchProofs = async () => {
    if (!stageId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/proofs/stage/${stageId}`);
      if (res.success) {
        setProofs(res.data || []);
      }
    } catch (err) {
      toast.error('Failed to load stage deliverables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && stageId) {
      fetchProofs();
    }
  }, [isOpen, stageId]);

  const handleDelete = async (proofId) => {
    const confirmed = window.confirm('Are you sure you want to delete this proof asset?');
    if (!confirmed) return;

    try {
      const res = await apiClient.delete(`/proofs/${proofId}`);
      if (res.success) {
        toast.success(res.message);
        fetchProofs();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete proof.');
    }
  };

  if (!isOpen || !stage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Stage Deliverables</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {proofs.length} Assets
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Stage: {stage.stage_type} • {stage.task_title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUploadNew?.(stage)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Upload Proof
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-3 pt-4 overflow-y-auto pr-1 flex-1">
          {loading ? (
            <div className="py-12">
              <LoadingSpinner text="Loading stage deliverables..." />
            </div>
          ) : proofs.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200/80">
              <FileCheck2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h3 className="text-xs font-bold text-slate-700">No Proofs Submitted Yet</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Upload a camera wrap photo, external cut link, or text note to record progress.
              </p>
            </div>
          ) : (
            proofs.map((proof) => {
              const isUploader = proof.uploaded_by === user?.id;
              const canDelete = isAdmin || isUploader;

              return (
                <div
                  key={proof.id}
                  className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-2.5 transition-all hover:bg-white hover:shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                        Rev {proof.revision_number}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 text-[10px] font-bold uppercase">
                        {proof.proof_type}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {proof.title || `${proof.proof_type} Deliverable`}
                      </h4>
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => handleDelete(proof.id)}
                        title="Delete proof"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Body Content according to type */}
                  {proof.proof_type === 'DIRECT_FILE' && proof.public_url && (
                    <div className="pt-1">
                      <a
                        href={proof.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group"
                      >
                        <img
                          src={proof.public_url}
                          alt={proof.title || 'Photo Proof'}
                          className="max-h-48 w-auto rounded-xl object-contain border border-slate-200 shadow-2xs group-hover:opacity-90 transition-opacity"
                        />
                      </a>
                    </div>
                  )}

                  {(proof.proof_type === 'CLOUD_DRIVE_URL' || proof.proof_type === 'SOCIAL_POST_URL') && (
                    <div className="pt-0.5">
                      <a
                        href={proof.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors border border-blue-200"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="truncate max-w-sm">Open {proof.public_url}</span>
                      </a>
                    </div>
                  )}

                  {proof.notes && (
                    <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 font-medium">
                      {proof.notes}
                    </p>
                  )}

                  {/* Metadata Footer */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-medium pt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {proof.uploader_name} ({proof.uploader_role})
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(proof.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import apiClient from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  X,
  UploadCloud,
  Link2,
  FileText,
  Image as ImageIcon,
  Share2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export const UploadProofModal = ({ stage, isOpen, onClose, onSuccess }) => {
  const [proofType, setProofType] = useState('CLOUD_DRIVE_URL'); // CLOUD_DRIVE_URL, DIRECT_FILE, TEXT_NOTE, SOCIAL_POST_URL
  const [title, setTitle] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [fileData, setFileData] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  if (!isOpen || !stage) return null;

  const stageId = stage.stage_id || stage.id;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files (JPEG, PNG, WebP) are supported for direct photo proof.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFileData(reader.result);
      setFilePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (proofType === 'CLOUD_DRIVE_URL' || proofType === 'SOCIAL_POST_URL') {
      if (!publicUrl || !publicUrl.trim()) {
        toast.error('Please enter a valid external link (Google Drive, Frame.io, or Live Post URL).');
        return;
      }
    } else if (proofType === 'DIRECT_FILE') {
      if (!fileData && !publicUrl) {
        toast.error('Please choose an image file or provide an image URL.');
        return;
      }
    } else if (proofType === 'TEXT_NOTE') {
      if (!notes || !notes.trim()) {
        toast.error('Please enter production notes or wrap summary.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        task_stage_id: stageId,
        proof_type: proofType,
        title: title.trim() || undefined,
        public_url: publicUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        file_data: fileData || undefined,
      };

      const res = await apiClient.post('/proofs', payload);
      if (res.success) {
        toast.success(res.message);
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit proof.');
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
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Record Proof of Work</h2>
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 overflow-y-auto pr-1">
          {/* Proof Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Deliverable Modality
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: 'CLOUD_DRIVE_URL', label: 'Cloud Drive', icon: Link2, desc: 'Google Drive / Frame.io' },
                { type: 'DIRECT_FILE', label: 'Wrap Photo', icon: ImageIcon, desc: 'Camera wrap still' },
                { type: 'TEXT_NOTE', label: 'Word Note', icon: FileText, desc: 'Summary / wrap note' },
                { type: 'SOCIAL_POST_URL', label: 'Social Post', icon: Share2, desc: 'Live published URL' },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = proofType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setProofType(item.type)}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] font-bold block">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Proof Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Title / Label (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g. ${stage.stage_type} Deliverable (Rough Cut v1)`}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-medium"
            />
          </div>

          {/* Mode-specific Fields */}
          {(proofType === 'CLOUD_DRIVE_URL' || proofType === 'SOCIAL_POST_URL') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {proofType === 'CLOUD_DRIVE_URL' ? 'External Review URL *' : 'Live Social Media URL *'}
              </label>
              <input
                type="url"
                required
                value={publicUrl}
                onChange={(e) => setPublicUrl(e.target.value)}
                placeholder={
                  proofType === 'CLOUD_DRIVE_URL'
                    ? 'https://drive.google.com/... or https://frame.io/...'
                    : 'https://youtube.com/watch?v=... or https://instagram.com/reel/...'
                }
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-medium"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Videos are streamed directly from cloud storage, preserving high bitrates without database storage overhead.
              </p>
            </div>
          )}

          {proofType === 'DIRECT_FILE' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Upload Photo / Screenshot *
              </label>
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 text-center bg-slate-50 transition-colors">
                {filePreview ? (
                  <div className="space-y-2">
                    <img
                      src={filePreview}
                      alt="Proof Preview"
                      className="max-h-40 mx-auto rounded-xl object-contain shadow-xs border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFileData(null);
                        setFilePreview(null);
                      }}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      Remove Photo
                    </button>
                  </div>
                ) : (
                  <div>
                    <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                    <label className="cursor-pointer">
                      <span className="text-xs font-bold text-blue-600 hover:underline">
                        Choose photo file
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">JPEG, PNG or WebP up to 10MB</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes / Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {proofType === 'TEXT_NOTE' ? 'Production Notes & Summary *' : 'Delivery Notes (Optional)'}
            </label>
            <textarea
              rows={3}
              required={proofType === 'TEXT_NOTE'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                proofType === 'TEXT_NOTE'
                  ? 'Enter shoot wrap details, equipment hand-off status, or sign-off notes...'
                  : 'Add any specific notes or timestamps for the reviewer...'
              }
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-medium"
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
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shadow-blue-500/20"
            >
              {submitting ? 'Recording Proof...' : 'Record Proof Deliverable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

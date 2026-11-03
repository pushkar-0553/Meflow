import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { X, Share2, ExternalLink, Video, CheckCircle, Image as ImageIcon } from 'lucide-react';

export const RecordPublicationModal = ({ isOpen, onClose, onSuccess }) => {
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [platform, setPlatform] = useState('YOUTUBE');
  const [postUrl, setPostUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [screenshotProofUrl, setScreenshotProofUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      // Fetch tasks that are ready for publishing
      apiClient.get('/tasks?status=IN_PROGRESS').then((res) => {
        if (res.success) {
          setTasks(res.data || []);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTaskId) {
      toast.error('Please select the production task.');
      return;
    }
    if (!postUrl || !postUrl.trim()) {
      toast.error('Please enter the live post URL.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/publishing', {
        task_id: parseInt(selectedTaskId, 10),
        platform,
        post_url: postUrl.trim(),
        caption: caption.trim() || null,
        screenshot_proof_url: screenshotProofUrl.trim() || null,
      });

      if (res.success) {
        toast.success(res.message);
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to record publication.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Record Live Publication</h2>
              <p className="text-xs text-slate-500 font-medium">Final Stage: Social Distribution & Archiving</p>
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
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Production Task *
            </label>
            <select
              required
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            >
              <option value="">Choose task to publish...</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.course_code}] {t.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Social Platform *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['YOUTUBE', 'INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'X_TWITTER', 'WEBSITE'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`py-2 px-3 rounded-xl border text-center text-xs font-bold transition-all ${
                    platform === p
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Live Post URL *
            </label>
            <input
              type="url"
              required
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://instagram.com/reel/..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Post Caption / Copy (Optional)
            </label>
            <textarea
              rows={2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Copy used for post..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
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
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shadow-emerald-500/20"
            >
              {submitting ? 'Recording...' : 'Publish & Complete Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


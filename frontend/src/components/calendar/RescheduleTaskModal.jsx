import React, { useState } from 'react';
import apiClient from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { X, Calendar, Clock, MapPin } from 'lucide-react';

export const RescheduleTaskModal = ({ task, isOpen, onClose, onSuccess }) => {
  const [scheduledStart, setScheduledStart] = useState(
    task?.scheduled_start
      ? new Date(task.scheduled_start).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [durationMinutes, setDurationMinutes] = useState(task?.expected_duration_minutes || 120);
  const [location, setLocation] = useState(task?.location || 'Studio Set A');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  if (!isOpen || !task) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await apiClient.patch(`/calendar/tasks/${task.task_id || task.id}/reschedule`, {
        scheduled_start: new Date(scheduledStart).toISOString(),
        expected_duration_minutes: parseInt(durationMinutes, 10),
        location: location.trim(),
      });

      if (res.success) {
        toast.success(res.message);
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reschedule task.');
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
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Reschedule Production</h2>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[260px]">
                {task.task_title || task.title}
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
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              New Start Date & Time *
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                required
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Duration (Mins)
              </label>
              <input
                type="number"
                min="15"
                step="15"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Set Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Studio A, Green Screen"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-medium"
              />
            </div>
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
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shadow-amber-500/20"
            >
              {submitting ? 'Updating Schedule...' : 'Save & Notify Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

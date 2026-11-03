import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';
import { RescheduleTaskModal } from '../components/calendar/RescheduleTaskModal';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Sparkles,
} from 'lucide-react';

export const MasterCalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeRescheduleTask, setActiveRescheduleTask] = useState(null);
  const { user, isAdmin, hasPermission } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/calendar/events?mode=all');
      if (res.success) {
        setEvents(res.data || []);
      }
    } catch (err) {
      toast.error('Failed to load master calendar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const canManage = isAdmin || hasPermission('calendar.manage');

  // Filter events for the current month
  const currentMonthYear = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
              Studio & Production Timeline
            </span>
            <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
              {events.length} Scheduled Operations
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Master Production Calendar
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Coordinate studio shoot schedules, camera allocations, and review target dates across the department.
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-extrabold text-slate-800 min-w-[140px] text-center">
            {currentMonthYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Events List / Timeline Grid */}
      {loading ? (
        <div className="p-12">
          <LoadingSpinner text="Synchronizing production calendar schedule..." />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
          <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No Scheduled Productions</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Create production tasks with scheduled shoot dates to see them populate here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((evt) => {
            const startDate = evt.scheduled_start ? new Date(evt.scheduled_start) : null;

            return (
              <div
                key={evt.task_id}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">
                      {evt.course_code}
                    </span>
                    <StatusBadge status={evt.priority} />
                  </div>

                  <h3
                    onClick={() => navigate(`/admin/tasks/${evt.task_id}`)}
                    className="text-sm font-extrabold text-slate-900 hover:text-blue-600 cursor-pointer transition-colors line-clamp-1"
                  >
                    {evt.task_title}
                  </h3>

                  <div className="space-y-1.5 pt-1 text-xs text-slate-600 font-medium">
                    {startDate && (
                      <div className="flex items-center gap-2 text-slate-800 font-bold">
                        <CalendarIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>
                          {startDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          •{' '}
                          {startDate.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{evt.location || 'Main Studio Set'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{evt.expected_duration_minutes || 120} mins expected</span>
                    </div>

                    {evt.assignee_name && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Assigned: <strong className="font-bold">{evt.assignee_name}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase">
                    Stage: {evt.stage_type || 'PLANNING'}
                  </span>

                  {canManage && (
                    <button
                      onClick={() => setActiveRescheduleTask(evt)}
                      className="px-3 py-1 text-xs font-bold text-amber-700 hover:bg-amber-50 rounded-xl transition-colors border border-amber-200"
                    >
                      Reschedule
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reschedule Modal */}
      {activeRescheduleTask && (
        <RescheduleTaskModal
          task={activeRescheduleTask}
          isOpen={Boolean(activeRescheduleTask)}
          onClose={() => setActiveRescheduleTask(null)}
          onSuccess={fetchEvents}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const PersonalCalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchMySchedule = async () => {
    try {
      const res = await apiClient.get('/calendar/events?mode=personal');
      if (res.success) {
        setEvents(res.data || []);
      }
    } catch (err) {
      toast.error('Failed to load your personal calendar schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySchedule();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              My Scheduled Timeline
            </span>
            <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
              {events.length} Assigned Slots
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            My Production Schedule
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Keep track of upcoming shoots, recording blocks, and editorial delivery deadlines assigned to you.
          </p>
        </div>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="p-12">
          <LoadingSpinner text="Retrieving your upcoming calendar events..." />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
          <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No Upcoming Shoots Scheduled</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            When tasks are assigned to you with scheduled start times, they will be listed here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((evt) => {
            const startDate = evt.scheduled_start ? new Date(evt.scheduled_start) : null;

            return (
              <div
                key={evt.task_id}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">
                      {evt.course_code}
                    </span>
                    <StatusBadge status={evt.priority} />
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 line-clamp-1">
                    {evt.task_title}
                  </h3>

                  <div className="space-y-1.5 pt-1 text-xs text-slate-600 font-medium">
                    {startDate && (
                      <div className="flex items-center gap-2 text-slate-800 font-bold">
                        <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
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
                      <span>{evt.location || 'Studio Set'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{evt.expected_duration_minutes || 120} mins block</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>Current Stage:</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-extrabold uppercase text-[10px]">
                    {evt.stage_type || 'PRE-PRODUCTION'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  Film,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Share2,
  Users,
  Shield,
  Phone,
  Mail,
  ExternalLink,
  Flame,
  Check,
} from 'lucide-react';

export const SharedReportPage = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const timerRef = useRef(null);

  const fetchSharedReport = async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await apiClient.get(`/reports/share/${token}`);
      if (res.success && res.data) {
        setData(res.data);
        setError(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load shared report. It may have expired or been revoked.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setCountdown(30);
    }
  };

  useEffect(() => {
    fetchSharedReport();
  }, [token]);

  // Auto-refresh countdown interval (every 30 seconds)
  useEffect(() => {
    if (!autoRefresh || error) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchSharedReport(true);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [autoRefresh, error, token]);

  if (loading) {
    return <LoadingSpinner text="Synchronizing live shared report from database..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F8F7] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Report Unavailable</h2>
          <p className="text-xs text-slate-500">{error}</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors"
          >
            Go to VCUBE MediaFlow Login
          </Link>
        </div>
      </div>
    );
  }

  const {
    reportName,
    reportType,
    summary = {},
    byEmployee = [],
    assignments = [],
    lastUpdatedAt,
    expiresAt,
    includeContactDetails,
  } = data || {};

  return (
    <div className="min-h-screen bg-[#F8F8F7] text-slate-900">
      {/* Top Brand Bar */}
      <header className="bg-white border-b border-[#EAEAEA] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="VCUBE MediaFlow" className="h-8 object-contain" />
            <div className="hidden sm:block h-5 w-px bg-slate-200" />
            <span className="hidden sm:inline text-xs font-bold text-slate-500 uppercase tracking-wider">
              Live Shared Report
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{autoRefresh ? `Auto-updating (${countdown}s)` : 'Auto-update paused'}</span>
            </button>

            <button
              onClick={() => fetchSharedReport(false)}
              disabled={refreshing}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-neutral-900 to-stone-900 text-white rounded-3xl p-6 shadow-xl border border-neutral-800 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  {reportType} LIVE REPORT
                </span>
                <span className="text-xs text-neutral-400">•</span>
                <span className="text-xs text-neutral-300">
                  Last synchronized:{' '}
                  <strong className="text-white">
                    {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : 'Just now'}
                  </strong>
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">{reportName}</h1>
              <p className="text-xs text-neutral-400 mt-1">
                Data reflects live team assignments, video stages, and completions. Refresh to view updates.
              </p>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-neutral-400 block">Link Status</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1">
                <Check className="w-3.5 h-3.5" />
                Active & Live
              </span>
              {expiresAt && (
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  Expires {new Date(expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPI Counters */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            title="Total Assigned"
            value={summary.totalAssignments || 0}
            subtitle="Pipeline tasks"
            icon={Film}
            variant="orange"
          />
          <StatCard
            title="Completed"
            value={summary.completed || 0}
            subtitle="Signed off"
            icon={CheckCircle2}
            variant="emerald"
          />
          <StatCard
            title="In Progress"
            value={summary.inProgress || 0}
            subtitle="Currently active"
            icon={Clock}
            variant="blue"
          />
          <StatCard
            title="Pending"
            value={summary.pending || 0}
            subtitle="Waiting for pickup"
            icon={Clock}
            variant="amber"
          />
          <StatCard
            title="Delayed"
            value={summary.overdue || 0}
            subtitle="Past deadline"
            icon={AlertTriangle}
            variant="rose"
          />
          <StatCard
            title="Completion"
            value={`${summary.completionPercentage || 0}%`}
            subtitle={`${summary.activeEmployeesCount || 0} staff members`}
            icon={Users}
            variant="purple"
          />
        </div>

        {/* Employee Performance Overview */}
        {byEmployee && byEmployee.length > 0 && (
          <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight">
              Workforce Team Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {byEmployee.map((emp) => (
                <div
                  key={emp.employee_id}
                  className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{emp.employee_name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {emp.employee_code} • {emp.employee_role}
                      </span>
                    </div>
                    <span className="text-xs font-black text-vcube-orange px-2 py-0.5 rounded-lg bg-orange-50 border border-orange-200">
                      {emp.completion_percentage}%
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-center pt-2 border-t border-slate-100 text-[11px]">
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 font-bold block">Assigned</span>
                      <strong className="text-slate-800">{emp.total_assigned}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 font-bold block">Done</span>
                      <strong className="text-emerald-600">{emp.completed}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 font-bold block">Pending</span>
                      <strong className="text-amber-600">{emp.pending + emp.in_progress}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 font-bold block">Delayed</span>
                      <strong className="text-rose-600">{emp.delayed}</strong>
                    </div>
                  </div>

                  {includeContactDetails && emp.employee_phone && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <a
                        href={`tel:${emp.employee_phone}`}
                        className="text-emerald-700 font-bold flex items-center gap-1 hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call {emp.employee_phone}</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Assignment Table */}
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4">
          <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight">
            Assignment Details ({assignments.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Employee</th>
                  <th className="py-3 px-3.5">Video / Assignment</th>
                  <th className="py-3 px-3.5">Course</th>
                  <th className="py-3 px-3.5">Stage</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Started</th>
                  <th className="py-3 px-3.5">Completed</th>
                  {includeContactDetails && <th className="py-3 px-3.5 text-right">Contact</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {assignments.map((row) => (
                  <tr key={row.assignment_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900">{row.employee_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {row.employee_code} • {row.employee_role}
                      </div>
                    </td>

                    <td className="py-3 px-3.5 max-w-[200px]">
                      <span className="text-[10px] font-mono font-bold text-vcube-orange block">
                        {row.project_code}
                      </span>
                      <span className="font-bold text-slate-900 line-clamp-1">{row.video_title}</span>
                    </td>

                    <td className="py-3 px-3.5 font-bold text-slate-600">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] uppercase">
                        {row.course_name}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 font-bold text-slate-800">
                      {row.stage_name}
                    </td>

                    <td className="py-3 px-3.5">
                      <StatusBadge status={row.status} />
                    </td>

                    <td className="py-3 px-3.5 text-slate-600">
                      {row.started_at
                        ? new Date(row.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '-'}
                    </td>

                    <td className="py-3 px-3.5 text-slate-600">
                      {row.completed_at
                        ? new Date(row.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '-'}
                    </td>

                    {includeContactDetails && (
                      <td className="py-3 px-3.5 text-right">
                        {row.employee_phone ? (
                          <a
                            href={`tel:${row.employee_phone}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold text-[11px] transition-colors"
                          >
                            <Phone className="w-3 h-3" /> Call
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400">Unavailable</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-8 text-center text-xs text-slate-400 border-t border-slate-200/80 mt-12">
        <p className="font-bold text-slate-700">VCUBE MediaFlow</p>
        <p className="text-[11px] mt-0.5">Digital Marketing Workflow & Video Production Management System</p>
      </footer>
    </div>
  );
};


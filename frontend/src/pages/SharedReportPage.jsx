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
  ChevronDown,
  ChevronUp,
  BarChart3,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';

export const SharedReportPage = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedEmployees, setExpandedEmployees] = useState(new Set());

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

  const toggleEmployeeExpand = (empId) => {
    setExpandedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

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
    monthlyTrends = [],
    stageBreakdown = [],
    startDate,
    endDate,
    year,
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
                {startDate && endDate && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/10 text-neutral-300 border border-white/10">
                    {startDate} → {endDate}
                  </span>
                )}
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
                Data reflects live team assignments, video stages, and completions directly from TiDB database. Refresh to view updates.
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

        {/* ANNUAL VIEW: Month-by-Month Production Progression */}
        {reportType === 'ANNUAL' && monthlyTrends && monthlyTrends.length > 0 && (
          <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-vcube-orange" />
                <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight">
                  Annual Month-by-Month Production Progression ({year || 2026})
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-bold">12-Month Cadence</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {monthlyTrends.map((m) => {
                const completionPct = m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0;
                const hasActivity = m.total > 0;
                return (
                  <div
                    key={m.monthIndex}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      hasActivity
                        ? 'bg-gradient-to-br from-orange-50/50 via-white to-amber-50/30 border-orange-200/90 shadow-2xs'
                        : 'bg-slate-50/60 border-slate-200/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-800">{m.monthName}</span>
                      {hasActivity && (
                        <span className="text-[10px] font-black text-vcube-orange px-1.5 py-0.5 rounded bg-orange-100">
                          {completionPct}%
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Assigned</span>
                        <strong className="text-slate-800 font-bold">{m.total}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-emerald-600 font-medium">Done</span>
                        <strong className="text-emerald-700 font-bold">{m.completed}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-amber-600 font-medium">Pending</span>
                        <strong className="text-amber-700 font-bold">{m.pending}</strong>
                      </div>
                    </div>

                    {hasActivity && (
                      <div className="mt-2.5 w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-vcube-orange to-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${completionPct}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STAGE BREAKDOWN (If present) */}
        {stageBreakdown && stageBreakdown.length > 0 && (
          <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-vcube-orange" />
              <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight">
                Production Pipeline Stage Distribution
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {stageBreakdown.map((s) => (
                <div
                  key={s.stage}
                  className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/50 shadow-2xs space-y-2"
                >
                  <span className="text-xs font-bold text-slate-800 block truncate">{s.stage}</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-black text-slate-900">{s.total}</span>
                    <span className="text-[10px] text-slate-400 font-bold">tasks</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] pt-2 border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-400 block">Done</span>
                      <strong className="text-emerald-600">{s.completed}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Active</span>
                      <strong className="text-amber-600">{s.in_progress + s.pending}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Employee Performance Overview */}
        {byEmployee && byEmployee.length > 0 && (
          <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight">
                Workforce Team Summary
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any team member to expand their individual video assignments.
              </p>
            </div>

            <div className="space-y-3">
              {byEmployee.map((emp) => {
                const isExpanded = expandedEmployees.has(emp.employee_id);
                return (
                  <div
                    key={emp.employee_id}
                    className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden transition-all shadow-2xs"
                  >
                    {/* Summary row */}
                    <div
                      onClick={() => toggleEmployeeExpand(emp.employee_id)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-orange-100 text-vcube-orange font-black flex items-center justify-center shrink-0">
                          {emp.employee_name?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{emp.employee_name}</h3>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                              {emp.employee_code}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            {emp.employee_role} • {emp.videos_count} unique videos
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <div className="text-center">
                          <span className="text-[10px] text-slate-400 uppercase block font-bold">Assigned</span>
                          <span className="text-sm font-black text-slate-800">{emp.total_assigned}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] text-slate-400 uppercase block font-bold">Done</span>
                          <span className="text-sm font-black text-emerald-600">{emp.completed}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] text-slate-400 uppercase block font-bold">Pending</span>
                          <span className="text-sm font-black text-amber-600">{emp.pending + emp.in_progress}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] text-slate-400 uppercase block font-bold">Delayed</span>
                          <span className="text-sm font-black text-rose-600">{emp.delayed}</span>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <span className="text-[10px] text-slate-400 uppercase block font-bold">Rate</span>
                          <span className="text-xs font-black text-vcube-orange px-2 py-0.5 rounded-lg bg-orange-50 border border-orange-200">
                            {emp.completion_percentage}%
                          </span>
                        </div>
                        {includeContactDetails && emp.employee_phone && (
                          <a
                            href={`tel:${emp.employee_phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title={`Call ${emp.employee_phone}`}
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        <div className="text-slate-400">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded individual assignments */}
                    {isExpanded && emp.assignments && (
                      <div className="p-4 bg-slate-50/70 border-t border-slate-200/80 space-y-2">
                        <div className="text-xs font-bold text-slate-700 mb-2">Individual Video Assignments:</div>
                        <div className="space-y-2">
                          {emp.assignments.map((asg) => (
                            <div
                              key={asg.assignment_id}
                              className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-bold text-vcube-orange">
                                    {asg.project_code}
                                  </span>
                                  <span className="text-[10px] uppercase font-bold text-slate-500">
                                    {asg.course_name}
                                  </span>
                                  <StatusBadge status={asg.status} />
                                </div>
                                <h4 className="text-xs font-bold text-slate-900 mt-0.5">{asg.video_title}</h4>
                                <p className="text-[11px] text-slate-500">
                                  Stage: <strong className="text-slate-700">{asg.stage_name}</strong>
                                  {asg.duration_minutes ? ` • ${asg.duration_minutes} mins logged` : ''}
                                </p>
                              </div>

                              <div className="text-right text-[11px] text-slate-500">
                                {asg.completed_at ? (
                                  <span className="text-emerald-700 font-bold">
                                    Completed: {new Date(asg.completed_at).toLocaleDateString()}
                                  </span>
                                ) : asg.started_at ? (
                                  <span>Started: {new Date(asg.started_at).toLocaleDateString()}</span>
                                ) : (
                                  <span>Scheduled: {asg.scheduled_date ? new Date(asg.scheduled_date).toLocaleDateString() : 'N/A'}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Assignment Table */}
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight">
              Assignment Details ({assignments.length})
            </h2>
          </div>

          {assignments.length === 0 ? (
            <div className="p-12 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
              <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No video production assignments recorded for this period.
            </div>
          ) : (
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
          )}
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

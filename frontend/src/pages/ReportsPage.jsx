import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ShareReportModal } from '../components/reports/ShareReportModal';
import {
  Calendar,
  FileSpreadsheet,
  Share2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Film,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Flame,
  Phone,
  BarChart3,
  CalendarDays,
  Sparkles,
} from 'lucide-react';

export const ReportsPage = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('daily'); // 'daily', 'weekly', 'monthly', 'annual', 'eod'
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);

  // Filters
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('time');
  const [sortOrder, setSortOrder] = useState('desc');

  // Filter option lists
  const [employeesList, setEmployeesList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);

  // Expanded employee cards on mobile / weekly views
  const [expandedEmployees, setExpandedEmployees] = useState(new Set());

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Load filter options
  useEffect(() => {
    const fetchFilterMeta = async () => {
      try {
        const [usersRes, rolesRes, coursesRes] = await Promise.all([
          apiClient.get('/users?status=ACTIVE'),
          apiClient.get('/roles'),
          apiClient.get('/courses'),
        ]);
        if (usersRes.success) setEmployeesList(usersRes.data || []);
        if (rolesRes.success) setRolesList(rolesRes.data || []);
        if (coursesRes.success) setCoursesList(coursesRes.data || []);
      } catch (err) {
        console.warn('Failed to fetch filter metadata:', err);
      }
    };
    fetchFilterMeta();
  }, []);

  // Fetch report data
  const fetchReport = async () => {
    setLoading(true);
    try {
      let endpoint = '/reports/daily';
      const params = {
        employee_id: selectedEmployee || undefined,
        role_id: selectedRole || undefined,
        course_id: selectedCourse || undefined,
        stage: selectedStage !== 'ALL' ? selectedStage : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        search: search.trim() || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (activeTab === 'daily') {
        endpoint = '/reports/daily';
        params.date = selectedDate;
      } else if (activeTab === 'weekly') {
        endpoint = '/reports/weekly';
        // Compute Monday of the week of selectedDate
        const d = new Date(selectedDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(d.setDate(diff));
        const sun = new Date(d.setDate(diff + 6));
        params.start_date = mon.toISOString().slice(0, 10);
        params.end_date = sun.toISOString().slice(0, 10);
      } else if (activeTab === 'monthly') {
        endpoint = '/reports/monthly';
        params.year = selectedYear;
        params.month = selectedMonth;
      } else if (activeTab === 'annual') {
        endpoint = '/reports/annual';
        params.year = selectedYear;
      } else if (activeTab === 'eod') {
        endpoint = '/reports/eod';
        params.date = selectedDate;
      }

      const res = await apiClient.get(endpoint, { params });
      if (res.success) {
        setReportData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [
    activeTab,
    selectedDate,
    selectedYear,
    selectedMonth,
    selectedEmployee,
    selectedRole,
    selectedCourse,
    selectedStage,
    selectedStatus,
    sortBy,
    sortOrder,
  ]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReport();
  };

  const handleClearFilters = () => {
    setSelectedEmployee('');
    setSelectedRole('');
    setSelectedCourse('');
    setSelectedStage('ALL');
    setSelectedStatus('ALL');
    setSearch('');
    setSelectedDate(todayStr);
  };

  const toggleEmployeeExpand = (empId) => {
    setExpandedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  // Export current table view as CSV
  const handleExportCSV = () => {
    const assignments = reportData?.assignments || [];
    if (assignments.length === 0) {
      toast.info('No data available to export.');
      return;
    }

    const headers = [
      'Employee Name',
      'Employee Code',
      'Role',
      'Video Project',
      'Course',
      'Production Stage',
      'Status',
      'Started At',
      'Completed At',
      'Duration (Mins)',
      'Remarks',
    ];

    const rows = assignments.map((a) => [
      `"${a.employee_name || ''}"`,
      `"${a.employee_code || ''}"`,
      `"${a.employee_role || ''}"`,
      `"${a.video_title || ''}"`,
      `"${a.course_name || ''}"`,
      `"${a.stage_name || ''}"`,
      `"${a.status || ''}"`,
      `"${a.started_at ? new Date(a.started_at).toLocaleString() : ''}"`,
      `"${a.completed_at ? new Date(a.completed_at).toLocaleString() : ''}"`,
      a.duration_minutes || '',
      `"${(a.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vcube_${activeTab}_report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported to CSV!');
  };

  const summary = reportData?.summary || {};

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Production & Workforce Reports
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-orange-50 text-vcube-orange border border-orange-200">
              Live Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track daily completions, weekly velocity, monthly stage bottlenecks, and EOD work summaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-vcube-orange to-orange-500 hover:from-orange-600 hover:to-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 active:scale-[0.98] cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Report</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={fetchReport}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            title="Refresh Live Data"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Mobile scrollable) */}
      <div className="flex items-center gap-1 border-b border-slate-200/80 overflow-x-auto no-scrollbar pb-px">
        {[
          { id: 'daily', label: 'Daily Report', icon: Clock },
          { id: 'weekly', label: 'Weekly Report', icon: CalendarDays },
          { id: 'monthly', label: 'Monthly Report', icon: BarChart3 },
          { id: 'annual', label: 'Annual Report', icon: Calendar },
          { id: 'eod', label: 'End-of-Day (EOD)', icon: Flame },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors border-b-2 -mb-px cursor-pointer ${
                activeTab === tab.id
                  ? 'border-vcube-orange text-vcube-orange bg-orange-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Assigned"
          value={summary.totalAssignments || 0}
          subtitle="Work items"
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
          subtitle="Active execution"
          icon={Clock}
          variant="blue"
        />
        <StatCard
          title="Pending"
          value={summary.pending || 0}
          subtitle="Awaiting start"
          icon={Clock}
          variant="amber"
        />
        <StatCard
          title="Delayed"
          value={summary.overdue || 0}
          subtitle="Past target time"
          icon={AlertTriangle}
          variant="rose"
        />
        <StatCard
          title="Completion Rate"
          value={`${summary.completionPercentage || 0}%`}
          subtitle={`${summary.activeEmployeesCount || 0} active staff`}
          icon={Users}
          variant="purple"
        />
      </div>

      {/* Filter Row */}
      <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          {/* Date Picker depending on tab */}
          {(activeTab === 'daily' || activeTab === 'weekly' || activeTab === 'eod') && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Calendar className="w-4 h-4 text-vcube-orange shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
              />
            </div>
          )}

          {activeTab === 'monthly' && (
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December',
                ].map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'annual' && (
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name or video title..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </form>
        </div>

        {/* Multi-criteria dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          {/* Employee dropdown */}
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="">All Employees</option>
            {employeesList.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.role_name || emp.role?.name})
              </option>
            ))}
          </select>

          {/* Role dropdown */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="">All Roles</option>
            {rolesList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Course dropdown */}
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="">All Courses</option>
            {coursesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stage dropdown */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="ALL">All Stages</option>
            <option value="CONTENT_WRITING">Content Writing</option>
            <option value="CINEMATOGRAPHY">Cinematography</option>
            <option value="FOOTAGE_HANDOVER">Footage Handover</option>
            <option value="VIDEO_EDITING">Video Editing</option>
            <option value="THUMBNAIL_PREP">Thumbnail Design</option>
            <option value="PUBLISHING">Publishing</option>
          </select>

          {/* Status dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue / Delayed</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="time">Sort by Time</option>
            <option value="employee">Sort by Employee</option>
            <option value="status">Sort by Status</option>
            <option value="video">Sort by Video</option>
          </select>

          <button
            onClick={handleClearFilters}
            className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 font-bold ml-auto cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Main Report Presentation Area */}
      {loading ? (
        <LoadingSpinner text="Computing synchronized report metrics..." />
      ) : (
        <div className="space-y-6">
          {/* TAB: EOD MANAGEMENT OVERVIEW (If activeTab === 'eod' and user is manager) */}
          {activeTab === 'eod' && reportData?.managementView && (
            <div className="p-5 rounded-3xl bg-neutral-900 text-white border border-neutral-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    Executive EOD Overview
                  </span>
                  <h3 className="text-base font-black tracking-tight mt-1">
                    Whole-Team Daily Wrap for {selectedDate}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 bg-neutral-800 rounded-2xl border border-neutral-700/80">
                  <span className="text-[10px] uppercase text-neutral-400 font-bold block">Finished Today</span>
                  <span className="text-xl font-black text-emerald-400">
                    {reportData.managementView.employeesCompletedCount}
                  </span>
                  <span className="text-[11px] text-neutral-400 block mt-0.5">Staff completed</span>
                </div>

                <div className="p-3 bg-neutral-800 rounded-2xl border border-neutral-700/80">
                  <span className="text-[10px] uppercase text-neutral-400 font-bold block">Still Pending</span>
                  <span className="text-xl font-black text-amber-400">
                    {reportData.managementView.employeesPendingCount}
                  </span>
                  <span className="text-[11px] text-neutral-400 block mt-0.5">Staff with work</span>
                </div>

                <div className="p-3 bg-neutral-800 rounded-2xl border border-neutral-700/80">
                  <span className="text-[10px] uppercase text-neutral-400 font-bold block">Overdue Staff</span>
                  <span className="text-xl font-black text-rose-400">
                    {reportData.managementView.employeesDelayedCount}
                  </span>
                  <span className="text-[11px] text-neutral-400 block mt-0.5">Delayed work</span>
                </div>

                <div className="p-3 bg-neutral-800 rounded-2xl border border-neutral-700/80">
                  <span className="text-[10px] uppercase text-neutral-400 font-bold block">Videos Finished</span>
                  <span className="text-xl font-black text-white">
                    {reportData.managementView.videosCompletedToday}
                  </span>
                  <span className="text-[11px] text-neutral-400 block mt-0.5">Passed final signoff</span>
                </div>

                <div className="p-3 bg-neutral-800 rounded-2xl border border-neutral-700/80">
                  <span className="text-[10px] uppercase text-neutral-400 font-bold block">Live Published</span>
                  <span className="text-xl font-black text-vcube-orange">
                    {reportData.managementView.videosPublishedToday}
                  </span>
                  <span className="text-[11px] text-neutral-400 block mt-0.5">On social platforms</span>
                </div>
              </div>
            </div>
          )}

          {/* Employee-Wise Summary Table / Accordions (Especially in Weekly, Monthly, Annual views) */}
          {(activeTab === 'weekly' || activeTab === 'monthly' || activeTab === 'annual') && (
            <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight">
                    Employee Workforce Performance Breakdown
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any team member to expand their individual video assignments.
                  </p>
                </div>
              </div>

              {(!reportData?.byEmployee || reportData.byEmployee.length === 0) ? (
                <div className="p-8 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                  No employee work recorded for this selected period.
                </div>
              ) : (
                <div className="space-y-3">
                  {reportData.byEmployee.map((emp) => {
                    const isExpanded = expandedEmployees.has(emp.employee_id);
                    return (
                      <div
                        key={emp.employee_id}
                        className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden transition-all shadow-2xs"
                      >
                        {/* Employee summary row */}
                        <div
                          onClick={() => toggleEmployeeExpand(emp.employee_id)}
                          className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/80 cursor-pointer transition-colors"
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
                              <span className="text-xs font-black text-vcube-orange px-2 py-0.5 rounded-lg bg-orange-50 border border-orange-200/80">
                                {emp.completion_percentage}%
                              </span>
                            </div>
                            <div className="text-slate-400">
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                          </div>
                        </div>

                        {/* Expandable assignment details */}
                        {isExpanded && (
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

                                  <div className="flex items-center gap-2 shrink-0">
                                    {asg.source_type === 'VIDEO_PROJECT' && (
                                      <button
                                        onClick={() => navigate(`/projects/${asg.project_id}`)}
                                        className="px-3 py-1.5 bg-neutral-900 hover:bg-vcube-orange text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                      >
                                        <span>Workspace</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
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
              )}
            </div>
          )}

          {/* Detailed Assignment Table (Daily, EOD, or Full View) */}
          <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight">
                  Detailed Assignment Ledger ({reportData?.assignments?.length || 0})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Granular task execution logs across scripts, shoots, cuts, reviews, and distribution.
                </p>
              </div>
            </div>

            {(!reportData?.assignments || reportData.assignments.length === 0) ? (
              <div className="p-12 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No assignments found matching the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3.5">Employee</th>
                      <th className="py-3 px-3.5">Video / Task</th>
                      <th className="py-3 px-3.5">Course</th>
                      <th className="py-3 px-3.5">Stage</th>
                      <th className="py-3 px-3.5">Status</th>
                      <th className="py-3 px-3.5">Started</th>
                      <th className="py-3 px-3.5">Completed</th>
                      <th className="py-3 px-3.5">Duration</th>
                      <th className="py-3 px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {reportData.assignments.map((row) => (
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

                        <td className="py-3 px-3.5 text-slate-600 font-mono">
                          {row.duration_minutes ? `${row.duration_minutes}m` : '-'}
                        </td>

                        <td className="py-3 px-3.5 text-right">
                          {row.source_type === 'VIDEO_PROJECT' ? (
                            <button
                              onClick={() => navigate(`/projects/${row.project_id}`)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-vcube-orange hover:text-white text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Workspace
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/admin/tasks/${row.project_id}`)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Task
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Report Modal */}
      {shareModalOpen && (() => {
        let confStartDate = selectedDate;
        let confEndDate = selectedDate;
        let title = `Daily Production Report (${selectedDate})`;

        if (activeTab === 'annual') {
          confStartDate = `${selectedYear}-01-01`;
          confEndDate = `${selectedYear}-12-31`;
          title = `Annual Production Report - ${selectedYear}`;
        } else if (activeTab === 'monthly') {
          const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
          ];
          const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
          confStartDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
          confEndDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
          title = `Monthly Production Report - ${monthNames[selectedMonth - 1]} ${selectedYear}`;
        } else if (activeTab === 'weekly') {
          const d = new Date(selectedDate);
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1);
          const mon = new Date(d.setDate(diff)).toISOString().slice(0, 10);
          const sun = new Date(d.setDate(diff + 6)).toISOString().slice(0, 10);
          confStartDate = mon;
          confEndDate = sun;
          title = `Weekly Production Report (${mon} to ${sun})`;
        } else if (activeTab === 'eod') {
          title = `End-of-Day (EOD) Summary (${selectedDate})`;
        }

        return (
          <ShareReportModal
            isOpen={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            reportType={activeTab.toUpperCase()}
            reportConfig={{
              startDate: confStartDate,
              endDate: confEndDate,
              year: selectedYear,
              month: selectedMonth,
              employeeId: selectedEmployee,
              roleId: selectedRole,
              courseId: selectedCourse,
              stage: selectedStage,
              status: selectedStatus,
              search,
            }}
            reportTitle={title}
          />
        );
      })()}
    </div>
  );
};


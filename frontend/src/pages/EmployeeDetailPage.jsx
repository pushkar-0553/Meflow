import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';
import { StatCard } from '../components/common/StatCard';
import {
  ArrowLeft,
  Phone,
  Mail,
  Briefcase,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Film,
  Edit2,
  Save,
  X,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';

export const EmployeeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { user, isAdmin } = useAuth();
  const inAdminConsole = location.pathname.startsWith('/admin');

  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit fields
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [reportingManagerId, setReportingManagerId] = useState('');
  const [managersList, setManagersList] = useState([]);

  const fetchEmployee = async () => {
    try {
      const [empRes, dirRes] = await Promise.all([
        apiClient.get(`/employees/${id}`),
        apiClient.get('/employees/directory'),
      ]);

      if (empRes.success && empRes.data) {
        setEmployeeData(empRes.data);
        const p = empRes.data.profile;
        setPhone(p.phone || '');
        setDepartment(p.department || 'Operations');
        setEmployeeId(p.employee_id || '');
        setReportingManagerId(p.reporting_manager_id || '');
      }

      if (dirRes.success && Array.isArray(dirRes.data?.filterMeta?.managers)) {
        setManagersList(dirRes.data.filterMeta.managers);
      }
    } catch (err) {
      toast.error('Failed to load employee details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiClient.patch(`/employees/${id}`, {
        phone: phone.trim() || null,
        department: department.trim() || 'Operations',
        employee_id: employeeId.trim() || null,
        reporting_manager_id: reportingManagerId ? parseInt(reportingManagerId, 10) : null,
      });

      if (res.success) {
        toast.success(res.message || 'Employee profile updated successfully.');
        setEditing(false);
        fetchEmployee();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update employee details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Synchronizing employee profile..." />;
  }

  if (!employeeData?.profile) {
    return (
      <div className="p-8 text-center space-y-3">
        <h2 className="text-base font-bold text-slate-800">Employee record not found</h2>
        <button
          onClick={() => navigate(inAdminConsole ? '/admin/directory' : '/employees')}
          className="text-xs font-bold text-vcube-orange hover:underline"
        >
          &larr; Return to directory
        </button>
      </div>
    );
  }

  const { profile, summary = {}, activeAssignments = [], recentCompleted = [] } = employeeData;
  const isManagerOrAdmin = Boolean(
    isAdmin ||
    user?.role_code === 'DM_HEAD' ||
    user?.role_code === 'PRODUCTION_MGR'
  );
  const canEdit = isManagerOrAdmin || user?.id === profile.id;

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6 max-w-7xl mx-auto">
      {/* Top back button */}
      <div>
        <button
          onClick={() => navigate(inAdminConsole ? '/admin/directory' : '/employees')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Employee Directory</span>
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs relative overflow-hidden space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 text-vcube-orange font-black text-2xl flex items-center justify-center shrink-0 border border-orange-200 shadow-xs">
              {profile.profile_image_url ? (
                <img
                  src={profile.profile_image_url}
                  alt={profile.name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                profile.name?.charAt(0) || 'U'
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  {profile.name}
                </h1>
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {profile.employee_id}
                </span>
                <StatusBadge status={profile.status} />
              </div>

              <p className="text-xs font-bold text-vcube-orange mt-0.5">
                {profile.role_name} • <span className="text-slate-600 font-medium">{profile.department}</span>
              </p>
            </div>
          </div>

          {/* Contact actions */}
          <div className="flex flex-wrap items-center gap-2">
            {profile.phone ? (
              <a
                href={`tel:${profile.phone}`}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Call {profile.phone}</span>
              </a>
            ) : (
              <span className="px-3 py-2 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl">
                Phone Unavailable
              </span>
            )}

            <a
              href={`mailto:${profile.email}`}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-slate-500" />
              <span>Email</span>
            </a>

            {canEdit && (
              <button
                onClick={() => setEditing(!editing)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                title="Edit Employee Information"
              >
                <Edit2 className="w-4 h-4 text-slate-600" />
              </button>
            )}
          </div>
        </div>

        {/* Edit Form if editing */}
        {editing && (
          <form
            onSubmit={handleSaveProfile}
            className="p-4 bg-orange-50/50 rounded-2xl border border-orange-200 space-y-4 animate-in fade-in"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-vcube-orange">
              Edit Employee Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +919876543210"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={!isManagerOrAdmin}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Employee ID Code</label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  disabled={!isManagerOrAdmin}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-60 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reporting Manager</label>
                <select
                  value={reportingManagerId}
                  onChange={(e) => setReportingManagerId(e.target.value)}
                  disabled={!isManagerOrAdmin}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-60 cursor-pointer"
                >
                  <option value="">None / System Admin</option>
                  {managersList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 bg-gradient-to-r from-vcube-orange to-orange-500 hover:from-orange-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Profile metadata bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-4 border-t border-slate-100">
          <div>
            <span className="text-slate-400 font-medium block">Email Address</span>
            <strong className="text-slate-800 break-all">{profile.email}</strong>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Phone Contact</span>
            <strong className="text-slate-800">{profile.phone || 'Not registered'}</strong>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Reporting Manager</span>
            <strong className="text-slate-800">{profile.reporting_manager_name || 'System Administrator'}</strong>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Account Created</span>
            <strong className="text-slate-800">{new Date(profile.created_at).toLocaleDateString()}</strong>
          </div>
        </div>
      </div>

      {/* Productivity Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Total Assigned"
          value={summary.totalAssignments || 0}
          subtitle="All-time work"
          icon={Film}
          variant="orange"
        />
        <StatCard
          title="Completed"
          value={summary.completed || 0}
          subtitle="Signed off tasks"
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
          title="Completion Rate"
          value={`${summary.completionPercentage || 0}%`}
          subtitle="Success velocity"
          icon={Users}
          variant="purple"
        />
      </div>

      {/* Current Active Assignments */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight">
          Current Active Assignments ({activeAssignments.length})
        </h2>

        {activeAssignments.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 font-medium">
            No active assignments pending for this employee right now.
          </div>
        ) : (
          <div className="space-y-3">
            {activeAssignments.map((asg) => (
              <div
                key={asg.assignment_id}
                className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-orange-200 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-vcube-orange">
                      {asg.project_code}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {asg.course_name}
                    </span>
                    <StatusBadge status={asg.status} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{asg.video_title}</h3>
                  <p className="text-xs text-slate-500">
                    Stage: <strong className="text-slate-700">{asg.stage_name}</strong>
                    {asg.remarks ? ` • ${asg.remarks}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {asg.source_type === 'VIDEO_PROJECT' && (
                    <button
                      onClick={() => navigate(inAdminConsole ? `/admin/projects/${asg.project_id}` : `/projects/${asg.project_id}`)}
                      className="px-3.5 py-2 bg-neutral-900 hover:bg-vcube-orange text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Completed Assignments */}
      {recentCompleted.length > 0 && (
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-xs space-y-4">
          <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight">
            Recent Completed Work ({recentCompleted.length})
          </h2>

          <div className="divide-y divide-slate-100">
            {recentCompleted.map((asg) => (
              <div key={asg.assignment_id} className="py-3 flex items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-bold text-slate-900">{asg.video_title}</div>
                  <div className="text-[11px] text-slate-400">
                    {asg.stage_name} • Finished {asg.completed_at ? new Date(asg.completed_at).toLocaleDateString() : 'Recently'}
                  </div>
                </div>
                <StatusBadge status="COMPLETED" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


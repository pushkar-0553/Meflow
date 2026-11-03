import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatCard } from '../components/common/StatCard';
import {
  Briefcase,
  AlertOctagon,
  Users,
  CheckCircle2,
  TrendingUp,
  UserCheck,
  ChevronRight,
  Sparkles,
  Clock,
  Layers,
} from 'lucide-react';

export const WorkloadHubPage = () => {
  const [team, setTeam] = useState([]);
  const [rolesBreakdown, setRolesBreakdown] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchWorkloadData = async () => {
    setLoading(true);
    try {
      const [teamRes, rolesRes] = await Promise.all([
        apiClient.get('/workload/team'),
        apiClient.get('/workload/role-breakdown'),
      ]);

      if (teamRes.success) {
        setTeam(teamRes.data || []);
        setMeta(teamRes.meta || null);
      }
      if (rolesRes.success) {
        setRolesBreakdown(rolesRes.data || []);
      }
    } catch (err) {
      toast.error('Failed to load team capacity metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkloadData();
  }, []);

  const getCapacityBadge = (status) => {
    switch (status) {
      case 'OVERLOADED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 uppercase">
            Overloaded (5+)
          </span>
        );
      case 'HEAVY':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase">
            Heavy (4–5)
          </span>
        );
      case 'OPTIMAL':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
            Optimal (1–3)
          </span>
        );
      case 'IDLE':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 uppercase">
            Idle (0)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Department Operations & Balance
            </span>
            <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
              {team.length} Active Staff
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Team Capacity & Workload Hub
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Detect pipeline bottlenecks in real-time. Identify overloaded editors, unassigned work pools, and idle capacity.
          </p>
        </div>
      </div>

      {/* Capacity KPI Stats */}
      {meta && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Active Workload"
            value={meta.totalActiveTasks}
            subtitle="Assignments in flight"
            icon={Briefcase}
            variant="blue"
          />
          <StatCard
            title="Avg per Member"
            value={meta.avgTasksPerWorker}
            subtitle="Target: 2.0 – 3.0"
            icon={TrendingUp}
            variant="slate"
          />
          <StatCard
            title="Overloaded Staff"
            value={meta.overloadedCount}
            subtitle="Critical bottleneck risk"
            icon={AlertOctagon}
            variant="rose"
          />
          <StatCard
            title="Available Staff"
            value={meta.idleCount}
            subtitle="Ready for new tasks"
            icon={UserCheck}
            variant="emerald"
          />
        </div>
      )}

      {/* Role Breakdown Progress Cards */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Workload by Department Role</h2>
          <p className="text-xs text-slate-500">Distribution of active stages and unassigned pools per functional role.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rolesBreakdown.map((role) => (
            <div
              key={role.role_id}
              className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-900">{role.role_name}</span>
                <span className="text-[10px] font-bold text-slate-500">{role.member_count} members</span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-600 font-medium">In Production:</span>
                <strong className="font-extrabold text-blue-700">{role.active_stages_count} stages</strong>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Unclaimed Pool:</span>
                <strong className="font-extrabold text-amber-700">{role.unclaimed_pool_count} ready</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employee Capacity Ledger Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Employee Capacity Directory</h2>
          <p className="text-xs text-slate-500">Real-time breakdown of current assignments and execution metrics.</p>
        </div>

        {loading ? (
          <div className="p-8">
            <LoadingSpinner text="Analyzing team workload allocation..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Active Tasks</th>
                  <th className="py-3 px-4">Load Status</th>
                  <th className="py-3 px-4">Delayed</th>
                  <th className="py-3 px-4">Completed</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {team.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div>{emp.name}</div>
                      <div className="text-[11px] font-normal text-slate-400">{emp.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{emp.role_name}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-black text-slate-900 text-sm">
                        {emp.active_tasks_count}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">{getCapacityBadge(emp.capacity_status)}</td>
                    <td className="py-3.5 px-4">
                      {emp.delayed_tasks_count > 0 ? (
                        <span className="text-rose-600 font-extrabold flex items-center gap-1">
                          <AlertOctagon className="w-3.5 h-3.5" />
                          {emp.delayed_tasks_count} Delayed
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-bold">{emp.completed_tasks_count}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigate(`/admin/users/${emp.id}`)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

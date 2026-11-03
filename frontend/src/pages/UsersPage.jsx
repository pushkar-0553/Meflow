import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { InviteEmployeeModal } from '../components/users/InviteEmployeeModal';
import { EditUserModal } from '../components/users/EditUserModal';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  Send,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Trash2,
  Edit2,
  Sliders,
} from 'lucide-react';

export const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const toast = useToast();
  const navigate = useNavigate();

  const fetchUsersAndRoles = async () => {
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (selectedRole) params.role_id = selectedRole;
      if (selectedStatus) params.status = selectedStatus;

      const [usersRes, rolesRes] = await Promise.all([
        apiClient.get('/users', { params }),
        apiClient.get('/roles'),
      ]);

      if (usersRes.success) setUsers(usersRes.data || []);
      if (rolesRes.success) setRoles(rolesRes.data || []);
    } catch (err) {
      toast.error('Failed to load employee directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, [searchTerm, selectedRole, selectedStatus]);

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const actionText = nextStatus === 'SUSPENDED' ? 'suspend' : 'activate';

    const confirmed = window.confirm(`Are you sure you want to ${actionText} employee '${user.name}'?`);
    if (!confirmed) return;

    try {
      const res = await apiClient.patch(`/users/${user.id}/status`, { status: nextStatus });
      if (res.success) {
        toast.success(res.message);
        fetchUsersAndRoles();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update account status.');
    }
  };

  const handleResendInvite = async (user) => {
    try {
      const res = await apiClient.post(`/users/${user.id}/resend-invite`);
      if (res.success) {
        toast.success(`Invitation re-dispatched to ${user.email} via Resend!`);
        if (res.data?.inviteUrl) {
          navigator.clipboard.writeText(res.data.inviteUrl);
          toast.info('New onboarding link copied to clipboard.');
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to resend invitation.');
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete account '${user.name}'? This is only possible if they have zero task records.`
    );
    if (!confirmed) return;

    try {
      const res = await apiClient.delete(`/users/${user.id}`);
      if (res.success) {
        toast.success(res.message);
        fetchUsersAndRoles();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete account.');
    }
  };

  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const invitedCount = users.filter((u) => u.status === 'INVITED').length;
  const suspendedCount = users.filter((u) => u.status === 'SUSPENDED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Workforce Operations
            </span>
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
              {users.length} Total Team Members
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Employee Directory & Roles
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Manage employee assignments, trigger Resend invitations, and configure user-specific permission overrides.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setInviteModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite Employee
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{users.length}</div>
            <div className="text-xs font-medium text-slate-500">Total Staff</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{activeCount}</div>
            <div className="text-xs font-medium text-slate-500">Active Staff</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{invitedCount}</div>
            <div className="text-xs font-medium text-slate-500">Pending Setup</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{suspendedCount}</div>
            <div className="text-xs font-medium text-slate-500">Suspended</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by employee name or email..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-700"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INVITED">Invited</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12">
            <LoadingSpinner text="Loading workforce roster..." />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm font-medium">
            No employees found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Employee</th>
                  <th className="py-3.5 px-4">Role & Dept</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Active Tasks</th>
                  <th className="py-3.5 px-4">Last Login</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* User Identity */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center font-bold text-blue-800 text-xs shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            {user.name}
                            {user.is_system_admin && (
                              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 font-medium text-xs mt-0.5">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role & Dept */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-800">{user.role_name}</div>
                      <div className="text-[11px] font-medium text-slate-400">{user.department}</div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <StatusBadge status={user.status} />
                    </td>

                    {/* Active Tasks */}
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-block font-extrabold px-2 py-0.5 rounded-full text-xs ${
                          user.active_task_count > 0
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {user.active_task_count} tasks
                      </span>
                    </td>

                    {/* Last Login */}
                    <td className="py-4 px-4 text-slate-500 font-medium">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never logged in'}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Manage Overrides & View Detail */}
                        <button
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                          title="Manage Permissions & Overrides"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                        >
                          <Sliders className="w-4 h-4" />
                          <span className="hidden lg:inline">Permissions</span>
                        </button>

                        {/* Edit Profile */}
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setEditModalOpen(true);
                          }}
                          title="Edit Profile"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Resend Invite if INVITED */}
                        {user.status === 'INVITED' && (
                          <button
                            onClick={() => handleResendInvite(user)}
                            title="Resend Invitation Email via Resend"
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}

                        {/* Toggle Suspend / Active */}
                        {!user.is_system_admin && (
                          <button
                            onClick={() => handleToggleStatus(user)}
                            title={user.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              user.status === 'ACTIVE'
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <AlertOctagon className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete Account */}
                        {!user.is_system_admin && user.active_task_count === 0 && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            title="Delete Account"
                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <InviteEmployeeModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onUserInvited={() => fetchUsersAndRoles()}
      />

      <EditUserModal
        isOpen={editModalOpen}
        user={editingUser}
        roles={roles}
        onClose={() => setEditModalOpen(false)}
        onUserUpdated={() => fetchUsersAndRoles()}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { RoleModal } from '../components/rbac/RoleModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  ShieldCheck,
  PlusCircle,
  Edit2,
  Copy,
  Trash2,
  Users,
  Key,
  ShieldAlert,
  Search,
} from 'lucide-react';

export const RolesPage = () => {
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeModalRole, setActiveModalRole] = useState(null); // null = create, object = edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toast = useToast();

  const fetchRolesAndPermissions = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiClient.get('/roles'),
        apiClient.get('/permissions'),
      ]);

      if (rolesRes.success) setRoles(rolesRes.data || []);
      if (permsRes.success) setAllPermissions(permsRes.data?.all || []);
    } catch (err) {
      toast.error('Failed to load roles and permissions data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const handleOpenCreate = () => {
    setActiveModalRole(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role) => {
    setActiveModalRole(role);
    setIsModalOpen(true);
  };

  const handleDuplicate = async (role) => {
    try {
      const res = await apiClient.post(`/roles/${role.id}/duplicate`);
      if (res.success) {
        toast.success(res.message);
        fetchRolesAndPermissions();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to clone role.');
    }
  };

  const handleDelete = async (role) => {
    if (role.is_system_role || role.is_system_admin) {
      toast.error('System roles cannot be deleted.');
      return;
    }

    if (role.user_count > 0) {
      toast.error(`Cannot delete role: ${role.user_count} employee(s) are currently assigned to it.`);
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete role '${role.name}'? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const res = await apiClient.delete(`/roles/${role.id}`);
      if (res.success) {
        toast.success(res.message);
        fetchRolesAndPermissions();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete role.');
    }
  };

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <LoadingSpinner text="Loading role matrix and permissions..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Access Control & Governance
            </span>
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
              {roles.length} Dynamic Roles
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Role & Permission Matrix
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Configure default permission blueprints. Employees inherit role defaults, with individual overrides supported.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Create Role
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search roles by title, code or duty..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
          />
        </div>
      </div>

      {/* Roles Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRoles.map((role) => (
          <div
            key={role.id}
            className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{role.name}</h3>
                    {role.is_system_admin && (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                        Master Admin
                      </span>
                    )}
                    {role.is_system_role && !role.is_system_admin && (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        System Default
                      </span>
                    )}
                  </div>
                  <code className="text-[11px] font-mono text-slate-400 font-bold block mt-0.5">
                    {role.code}
                  </code>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicate(role)}
                    title="Clone Role"
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(role)}
                    title="Edit Role Matrix"
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {!role.is_system_role && !role.is_system_admin && (
                    <button
                      onClick={() => handleDelete(role)}
                      title="Delete Role"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-500 font-medium line-clamp-2 min-h-[32px]">
                {role.description || 'No description provided.'}
              </p>
            </div>

            {/* Metrics Badges Footer */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <Users className="w-4 h-4 text-slate-400" />
                <span>{role.user_count} Active Staff</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100">
                <Key className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {role.is_system_admin ? 'Master Set (44)' : `${role.permission_count} Perms`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Role Create / Edit Modal */}
      <RoleModal
        isOpen={isModalOpen}
        role={activeModalRole}
        allPermissions={allPermissions}
        onClose={() => setIsModalOpen(false)}
        onSave={() => fetchRolesAndPermissions()}
      />
    </div>
  );
};

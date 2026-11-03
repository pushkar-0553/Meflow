import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { PermissionMatrix } from './PermissionMatrix';
import { X, Shield, Save } from 'lucide-react';

export const RoleModal = ({ isOpen, role = null, allPermissions = [], onClose, onSave }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const isEdit = Boolean(role && role.id);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setCode('');
      setDescription('');
      setSelectedPermissionIds([]);
      return;
    }

    if (role) {
      setName(role.name || '');
      setCode(role.code || '');
      setDescription(role.description || '');
      // If editing, load full role details with permissions
      const loadRolePerms = async () => {
        try {
          const res = await apiClient.get(`/roles/${role.id}`);
          if (res.success && res.data) {
            setSelectedPermissionIds(res.data.permission_ids || []);
          }
        } catch (err) {
          toast.error('Failed to load role permissions.');
        }
      };
      loadRolePerms();
    } else {
      setName('');
      setCode('');
      setDescription('');
      setSelectedPermissionIds([]);
    }
  }, [isOpen, role]);

  if (!isOpen) return null;

  // Auto-generate Code suggestion from Name on create
  const handleNameChange = (val) => {
    setName(val);
    if (!isEdit) {
      const generatedCode = val
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      setCode(generatedCode);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || (!isEdit && !code)) {
      toast.error('Please enter role name and unique code.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        const res = await apiClient.put(`/roles/${role.id}`, {
          name,
          description,
          permission_ids: selectedPermissionIds,
        });
        if (res.success) {
          toast.success(`Role '${name}' updated successfully.`);
          onSave(res.data);
          onClose();
        }
      } else {
        const res = await apiClient.post('/roles', {
          name,
          code,
          description,
          permission_ids: selectedPermissionIds,
        });
        if (res.success) {
          toast.success(`Role '${name}' created successfully.`);
          onSave(res.data);
          onClose();
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save role.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEdit ? `Edit Role: ${role.name}` : 'Create New Organizational Role'}
              </h2>
              <p className="text-xs text-slate-500">
                Configure default permissions template for employees assigned to this role
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Role Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Lead Colorist"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Role Code {isEdit ? '(Immutable)' : '*'}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. LEAD_COLORIST"
                disabled={isEdit}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Primary responsibilities and workflow role..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
            />
          </div>

          {/* Grouped Permission Matrix */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Default Permission Matrix ({selectedPermissionIds.length} granted)
            </label>
            <PermissionMatrix
              permissions={allPermissions}
              selectedIds={selectedPermissionIds}
              onChange={setSelectedPermissionIds}
              disabled={role?.is_system_admin}
            />
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {role?.is_system_admin
                ? 'System Admin role holds master permissions by design.'
                : 'Role permissions act as defaults; users can have personal overrides.'}
            </span>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || role?.is_system_admin}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {submitting ? 'Saving Role...' : isEdit ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

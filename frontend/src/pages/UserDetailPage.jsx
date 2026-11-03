import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  ArrowLeft,
  User,
  Shield,
  Key,
  Sliders,
  Check,
  X,
  Minus,
  Plus,
  Save,
  Search,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export const UserDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [employee, setEmployee] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [userOverrides, setUserOverrides] = useState(new Map()); // permission_id -> 'ALLOW' | 'DENY'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadUserData = async () => {
    try {
      const [userRes, permRes, catalogRes] = await Promise.all([
        apiClient.get(`/users/${id}`),
        apiClient.get(`/permissions/users/${id}`),
        apiClient.get('/permissions'),
      ]);

      if (userRes.success) setEmployee(userRes.data);
      if (permRes.success && permRes.data) {
        setRolePermissions(permRes.data.rolePermissions || []);
        // Map user overrides
        const overrideMap = new Map();
        (permRes.data.userOverrides || []).forEach((o) => {
          overrideMap.set(o.permission_id, o.effect);
        });
        setUserOverrides(overrideMap);
      }
      if (catalogRes.success) {
        setAllPermissions(catalogRes.data?.all || []);
      }
    } catch (err) {
      toast.error('Failed to load employee permission blueprint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [id]);

  // Set of permission IDs granted by the base role
  const roleGrantedPermIds = useMemo(() => {
    return new Set(rolePermissions.map((p) => p.id));
  }, [rolePermissions]);

  // Handle setting an override for a permission
  const handleSetOverride = (permId, effect) => {
    // effect: 'DEFAULT' (clears override), 'ALLOW', or 'DENY'
    const updated = new Map(userOverrides);
    if (effect === 'DEFAULT') {
      updated.delete(permId);
    } else {
      updated.set(permId, effect);
    }
    setUserOverrides(updated);
  };

  // Calculate live effective permissions
  const effectiveResult = useMemo(() => {
    if (employee?.is_system_admin) {
      return {
        effectiveCount: allPermissions.length,
        effectiveKeys: new Set(allPermissions.map((p) => p.key)),
      };
    }

    const effective = new Set();

    allPermissions.forEach((perm) => {
      const isRoleGranted = roleGrantedPermIds.has(perm.id);
      const override = userOverrides.get(perm.id);

      if (override === 'ALLOW') {
        effective.add(perm.key);
      } else if (override === 'DENY') {
        // Explicitly denied
      } else if (isRoleGranted) {
        effective.add(perm.key);
      }
    });

    return {
      effectiveCount: effective.size,
      effectiveKeys: effective,
    };
  }, [employee, allPermissions, roleGrantedPermIds, userOverrides]);

  const handleSaveOverrides = async () => {
    setSaving(true);
    try {
      const payload = [];
      userOverrides.forEach((effect, permission_id) => {
        payload.push({ permission_id, effect });
      });

      const res = await apiClient.put(`/permissions/users/${id}`, {
        overrides: payload,
      });

      if (res.success) {
        toast.success('User-specific permission overrides saved successfully.');
        loadUserData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save permission overrides.');
    } finally {
      setSaving(false);
    }
  };

  // Group all permissions by Category for clean inspection
  const groupedCategories = useMemo(() => {
    const map = {};
    const term = searchTerm.toLowerCase();

    allPermissions.forEach((perm) => {
      if (
        !term ||
        perm.name.toLowerCase().includes(term) ||
        perm.key.toLowerCase().includes(term)
      ) {
        if (!map[perm.category]) map[perm.category] = [];
        map[perm.category].push(perm);
      }
    });
    return map;
  }, [allPermissions, searchTerm]);

  if (loading) {
    return <LoadingSpinner text="Loading employee permissions matrix..." />;
  }

  if (!employee) {
    return (
      <div className="p-8 text-center text-slate-500">
        Employee record not found.{' '}
        <button onClick={() => navigate('/admin/users')} className="text-blue-600 underline">
          Return to directory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation Back Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/users')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Employee Directory
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveOverrides}
            disabled={saving || employee.is_system_admin}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Overrides...' : 'Save Overrides'}
          </button>
        </div>
      </div>

      {/* Employee Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            {employee.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-slate-900">{employee.name}</h1>
              <StatusBadge status={employee.status} />
              {employee.is_system_admin && (
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-extrabold uppercase">
                  Master Admin
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {employee.email} • {employee.department} • Phone: {employee.phone || 'Not provided'}
            </p>
          </div>
        </div>

        {/* Live Calculation Pill Badges */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center min-w-[100px]">
            <div className="text-lg font-black text-slate-800">{rolePermissions.length}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Role Defaults
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-center min-w-[100px]">
            <div className="text-lg font-black text-blue-700">{userOverrides.size}</div>
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
              Overrides
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center min-w-[120px]">
            <div className="text-lg font-black text-emerald-700">
              {effectiveResult.effectiveCount}
            </div>
            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              Effective Total
            </div>
          </div>
        </div>
      </div>

      {/* Permission Studio Explainer */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-500/20 text-blue-300 rounded-xl">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm block">User-Specific Permission Overrides Studio</span>
            <span className="text-xs text-slate-300">
              Assigned Role: <strong className="text-blue-400">{employee.role_name}</strong>. Add individual ALLOW or DENY rules without changing the role template for other employees.
            </span>
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search permissions..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-800 text-white border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Three-Tier Permission Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {Object.entries(groupedCategories).map(([category, perms]) => (
            <div key={category} className="p-5">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>{category}</span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {perms.length} capabilities
                </span>
              </h2>

              <div className="space-y-2">
                {perms.map((perm) => {
                  const isRoleGranted = roleGrantedPermIds.has(perm.id);
                  const override = userOverrides.get(perm.id); // 'ALLOW', 'DENY', or undefined
                  const isEffective = effectiveResult.effectiveKeys.has(perm.key);

                  return (
                    <div
                      key={perm.id}
                      className="p-3 rounded-2xl bg-slate-50/60 border border-slate-200/70 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Left: Permission Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{perm.name}</span>
                          <code className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {perm.key}
                          </code>
                        </div>
                        {perm.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{perm.description}</p>
                        )}
                      </div>

                      {/* Middle: Role Baseline State */}
                      <div className="flex items-center gap-2 sm:w-44 shrink-0">
                        <span className="text-[11px] font-semibold text-slate-400">Role Default:</span>
                        {isRoleGranted ? (
                          <span className="text-[11px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Check className="w-3 h-3 text-blue-600" /> Granted
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            Not Granted
                          </span>
                        )}
                      </div>

                      {/* Right: Override Control Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Default Button */}
                        <button
                          type="button"
                          onClick={() => handleSetOverride(perm.id, 'DEFAULT')}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                            !override
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Default
                        </button>

                        {/* ALLOW Button */}
                        <button
                          type="button"
                          onClick={() => handleSetOverride(perm.id, 'ALLOW')}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg border flex items-center gap-1 transition-all ${
                            override === 'ALLOW'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          <Plus className="w-3 h-3" /> ALLOW
                        </button>

                        {/* DENY Button */}
                        <button
                          type="button"
                          onClick={() => handleSetOverride(perm.id, 'DENY')}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg border flex items-center gap-1 transition-all ${
                            override === 'DENY'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                          }`}
                        >
                          <Minus className="w-3 h-3" /> DENY
                        </button>
                      </div>

                      {/* Far Right: Effective State Pill */}
                      <div className="w-20 text-right shrink-0">
                        {isEffective ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                            <Check className="w-3 h-3" /> ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-md">
                            <X className="w-3 h-3" /> OFF
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


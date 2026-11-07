import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';
import { InviteEmployeeModal } from '../components/users/InviteEmployeeModal';
import {
  Users,
  Search,
  Filter,
  Phone,
  Mail,
  UserCheck,
  Briefcase,
  UserPlus,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Clock,
  Shield,
  Layers,
  PhoneOff,
} from 'lucide-react';

export const EmployeeDirectoryPage = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');

  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const fetchDirectory = async () => {
    setLoading(true);
    try {
      const params = {
        search: search.trim() || undefined,
        role_id: selectedRole || undefined,
        department: selectedDepartment !== 'ALL' ? selectedDepartment : undefined,
        reporting_manager_id: selectedManager || undefined,
        status: selectedStatus,
      };

      const [dirRes, rolesRes] = await Promise.all([
        apiClient.get('/employees/directory', { params }),
        apiClient.get('/roles'),
      ]);

      if (dirRes.success && dirRes.data) {
        setEmployees(dirRes.data.employees || []);
        if (dirRes.data.filterMeta) {
          setDepartments(dirRes.data.filterMeta.departments || []);
          setManagers(dirRes.data.filterMeta.managers || []);
        }
      }

      if (rolesRes.success) {
        setRoles(rolesRes.data || []);
      }
    } catch (err) {
      toast.error('Failed to load employee workforce directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, [selectedRole, selectedDepartment, selectedManager, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDirectory();
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedRole('');
    setSelectedDepartment('ALL');
    setSelectedManager('');
    setSelectedStatus('ACTIVE');
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Employee Workforce Directory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-orange-50 text-vcube-orange border border-orange-200">
              {employees.length} Team Members
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse colleagues across Content Writing, Cinematography, Video Editing, and SEO. Quick calling enabled.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setInviteModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-vcube-orange to-orange-500 hover:from-orange-600 hover:to-orange-500 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 active:scale-[0.98] cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite New Employee</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, employee ID, phone number, or email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 cursor-pointer"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Reporting Manager */}
          <select
            value={selectedManager}
            onChange={(e) => setSelectedManager(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 cursor-pointer"
          >
            <option value="">All Managers</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                Manager: {m.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 cursor-pointer"
          >
            <option value="ACTIVE">Active Staff</option>
            <option value="INVITED">Invited / Pending</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="ALL">All Statuses</option>
          </select>

          {(search || selectedRole || selectedDepartment !== 'ALL' || selectedManager || selectedStatus !== 'ACTIVE') && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <LoadingSpinner text="Synchronizing employee workforce catalog..." />
      ) : employees.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <Users className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">No Employees Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search criteria or clearing active filters.
          </p>
          <button
            onClick={handleClearFilters}
            className="mt-2 text-xs text-vcube-orange font-bold hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => {
            const hasPhone = Boolean(emp.phone && emp.phone.trim());

            return (
              <div
                key={emp.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-orange-200 transition-all duration-200 p-5 flex flex-col justify-between gap-4 group"
              >
                {/* Employee Card Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 text-vcube-orange font-black text-base flex items-center justify-center shrink-0 border border-orange-200/60 shadow-2xs">
                        {emp.profile_image_url ? (
                          <img
                            src={emp.profile_image_url}
                            alt={emp.name}
                            className="w-full h-full object-cover rounded-2xl"
                          />
                        ) : (
                          emp.name?.charAt(0) || 'U'
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-vcube-orange transition-colors">
                          {emp.name}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                            {emp.employee_id}
                          </span>
                          <span className="text-[11px] font-bold text-vcube-orange">
                            {emp.role_name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <StatusBadge status={emp.status} />
                  </div>

                  {/* Metadata fields */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Department:</span>
                      <strong className="text-slate-700">{emp.department || 'Operations'}</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Reporting Manager:</span>
                      <span className="text-slate-700 font-semibold truncate max-w-[150px]">
                        {emp.reporting_manager_name || 'System Admin'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Active Workload:</span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                        {emp.active_assignments_count || 0} active assignments
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons (Direct Calling & Details) */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  {/* Direct Calling Button (Part 5.1) */}
                  {hasPhone ? (
                    <a
                      href={`tel:${emp.phone}`}
                      className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs border border-emerald-200/80 cursor-pointer min-h-[38px]"
                      title={`Call ${emp.name} directly`}
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Call {emp.phone}</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="flex-1 py-2 px-3 bg-slate-50 text-slate-400 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 cursor-not-allowed opacity-60 min-h-[38px]"
                      title="Phone number unavailable"
                    >
                      <PhoneOff className="w-3.5 h-3.5 text-slate-400" />
                      <span>No Phone</span>
                    </button>
                  )}

                  {/* Email action */}
                  <a
                    href={`mailto:${emp.email}`}
                    className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors flex items-center justify-center min-h-[38px] min-w-[38px]"
                    title={`Email ${emp.email}`}
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-600" />
                  </a>

                  {/* View Details Profile action */}
                  <button
                    onClick={() => navigate(`/employees/${emp.id}`)}
                    className="p-2 bg-neutral-900 hover:bg-vcube-orange text-white rounded-xl transition-colors flex items-center justify-center min-h-[38px] min-w-[38px] cursor-pointer"
                    title="View Employee Profile & Tasks"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Employee Modal */}
      {inviteModalOpen && (
        <InviteEmployeeModal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          onSuccess={fetchDirectory}
        />
      )}
    </div>
  );
};


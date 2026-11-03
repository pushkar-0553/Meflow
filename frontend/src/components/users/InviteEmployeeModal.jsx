import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { X, UserPlus, Mail, Shield, Building, Phone, Copy, Check, Send } from 'lucide-react';

export const InviteEmployeeModal = ({ isOpen, onClose, onUserInvited }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [department, setDepartment] = useState('Production');
  const [phone, setPhone] = useState('');
  const [roles, setRoles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) {
      setInviteResult(null);
      setName('');
      setEmail('');
      setPhone('');
      return;
    }

    const fetchRoles = async () => {
      try {
        const res = await apiClient.get('/roles');
        if (res.success && res.data) {
          setRoles(res.data);
          if (res.data.length > 0 && !roleId) {
            // Default to non-admin role if possible
            const defaultRole = res.data.find(r => !r.is_system_admin) || res.data[0];
            setRoleId(defaultRole.id);
          }
        }
      } catch (err) {
        toast.error('Failed to load organizational roles.');
      }
    };

    fetchRoles();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedRoleId = parseInt(roleId, 10);
    if (!name.trim() || !email.trim() || isNaN(parsedRoleId) || parsedRoleId <= 0) {
      toast.error('Please enter a name, valid email, and select a role.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post('/auth/invite', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role_id: parsedRoleId,
        department,
        phone: phone ? phone.trim() : null,
      });

      if (res.success) {
        if (res.data?.emailDispatched) {
          toast.success(`Invitation sent to ${email} via Resend!`);
        } else {
          toast.success(`Employee created! Copy the onboarding link below.`);
        }
        setInviteResult(res.data);
        if (onUserInvited) onUserInvited(res.data.user);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteResult?.inviteUrl) {
      navigator.clipboard.writeText(inviteResult.inviteUrl);
      setCopied(true);
      toast.info('Invitation link copied to clipboard.');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Invite New Employee</h2>
              <p className="text-xs text-slate-500">Send a single-use setup link via Resend HTTPS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {inviteResult ? (
            /* Success State with Copyable Link */
            <div className="space-y-5 text-center py-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <Send className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {inviteResult.emailDispatched ? 'Invitation Dispatched!' : 'Employee Account Created!'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {inviteResult.emailDispatched ? (
                    <>
                      An invitation email has been sent to{' '}
                      <strong className="text-slate-800">{inviteResult.user.email}</strong> via{' '}
                      <span className="font-semibold text-blue-600 uppercase">Resend</span>.
                    </>
                  ) : (
                    <>
                      Single-use onboarding token generated for{' '}
                      <strong className="text-slate-800">{inviteResult.user.email}</strong>. Copy the link below to share with the employee.
                    </>
                  )}
                </p>
              </div>

              {/* Direct Link Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Direct Onboarding URL (48-Hour Validity)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteResult.inviteUrl}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInviteResult(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Invite Another
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Invite Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="employee@vcube.com"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Target Role *
                  </label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.is_system_admin ? '(Admin)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  >
                    <option value="Production">Production</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Post-Production">Post-Production</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    'Sending Invitation...'
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};


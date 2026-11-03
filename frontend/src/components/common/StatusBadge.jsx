import React from 'react';

const STATUS_CONFIGS = {
  // Task Global Statuses
  SCHEDULED: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'Scheduled' },
  AVAILABLE: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Available' },
  ASSIGNED: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', label: 'Assigned' },
  IN_PROGRESS: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'In Progress' },
  UNDER_REVIEW: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Under Review' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Completed' },
  CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', label: 'Cancelled' },
  DELAYED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Delayed' },

  // Stage Statuses
  PENDING: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', label: 'Pending' },
  READY: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Ready for Pickup' },
  SUBMITTED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Submitted' },
  CHANGES_REQUESTED: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Changes Requested' },
  APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Approved' },
  SKIPPED: { bg: 'bg-slate-100', text: 'text-slate-400', border: 'border-slate-200', label: 'Skipped' },

  // User Account Statuses
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Active' },
  INVITED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Invited' },
  SUSPENDED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Suspended' },

  // Priorities
  LOW: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', label: 'Low' },
  MEDIUM: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Medium' },
  HIGH: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'High' },
  URGENT: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Urgent' },
};

export const StatusBadge = ({ status, className = '' }) => {
  const normalized = (status || '').toUpperCase();
  const config = STATUS_CONFIGS[normalized] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    label: status || 'Unknown',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {config.label}
    </span>
  );
};

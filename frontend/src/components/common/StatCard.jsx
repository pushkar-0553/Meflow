import React from 'react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue',
  trend = null,
  onClick = null,
}) => {
  const variantStyles = {
    blue: {
      bg: 'bg-blue-50/50',
      text: 'text-blue-700',
      iconBg: 'bg-blue-100 text-blue-700',
      border: 'border-blue-100',
    },
    emerald: {
      bg: 'bg-emerald-50/50',
      text: 'text-emerald-700',
      iconBg: 'bg-emerald-100 text-emerald-700',
      border: 'border-emerald-100',
    },
    amber: {
      bg: 'bg-amber-50/50',
      text: 'text-amber-700',
      iconBg: 'bg-amber-100 text-amber-700',
      border: 'border-amber-100',
    },
    purple: {
      bg: 'bg-purple-50/50',
      text: 'text-purple-700',
      iconBg: 'bg-purple-100 text-purple-700',
      border: 'border-purple-100',
    },
    rose: {
      bg: 'bg-rose-50/50',
      text: 'text-rose-700',
      iconBg: 'bg-rose-100 text-rose-700',
      border: 'border-rose-100',
    },
    slate: {
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      iconBg: 'bg-slate-200 text-slate-700',
      border: 'border-slate-200',
    },
  };

  const style = variantStyles[variant] || variantStyles.blue;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border ${style.border} shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-blue-300' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${style.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div>
        <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</div>
        {subtitle && (
          <div className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

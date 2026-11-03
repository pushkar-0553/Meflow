import React from 'react';

export const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6 text-slate-500">
      <div
        className={`${sizeClasses[size] || sizeClasses.md} rounded-full border-blue-600 border-t-transparent animate-spin`}
      />
      {text && <span className="text-sm font-medium animate-pulse">{text}</span>}
    </div>
  );
};

export const CardSkeleton = () => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm animate-pulse">
    <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
    <div className="h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-slate-100 rounded w-2/3"></div>
  </div>
);

import React from 'react';
import { ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl font-black text-blue-600 mb-2">404</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Page Not Found</h1>
        <p className="text-sm text-slate-500 mb-6">
          The operations screen you are looking for does not exist or has been moved.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Dashboard
        </a>
      </div>
    </div>
  );
};

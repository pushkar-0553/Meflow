import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import { LoginPage } from './pages/LoginPage';
import { SetPasswordPage } from './pages/SetPasswordPage';
import { AdminLayout } from './components/layout/AdminLayout';
import { EmployeeLayout } from './components/layout/EmployeeLayout';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { EmployeeDashboardPage } from './pages/EmployeeDashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Smart Home Redirector based on User Role
const HomeRedirect = () => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;
};

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />

            {/* Smart Root Redirect */}
            <Route path="/" element={<HomeRedirect />} />

            {/* Admin Management Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="tasks" element={<div className="p-8 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200">Phase 5: Tasks & Production Pipeline Modules</div>} />
              <Route path="users" element={<div className="p-8 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200">Phase 4: Employee Management & Permission Matrix</div>} />
              <Route path="roles" element={<div className="p-8 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200">Phase 3: Role Management & Dynamic Permissions</div>} />
              <Route path="workload" element={<div className="p-8 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200">Phase 10: Team Capacity & Workload Hub</div>} />
              <Route path="calendar" element={<div className="p-8 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200">Phase 9: Production Calendar</div>} />
              <Route path="publishing" element={<div className="p-8 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200">Phase 6: Published Social Media Content Archive</div>} />
              <Route path="audit" element={<div className="p-8 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200">Phase 11: System Audit Ledger</div>} />
            </Route>

            {/* Employee Workspace Routes */}
            <Route element={<EmployeeLayout />}>
              <Route path="/dashboard" element={<EmployeeDashboardPage />} />
              <Route path="/available-work" element={<div className="p-8 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200">Phase 5: Available Work Self-Claim Feed</div>} />
              <Route path="/my-bucket" element={<div className="p-8 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200">Phase 5: My Bucket & Execution Pipeline</div>} />
              <Route path="/my-calendar" element={<div className="p-8 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-200">Phase 9: Personal Work Schedule</div>} />
            </Route>

            {/* 404 Catch-all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;

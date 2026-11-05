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
import { RolesPage } from './pages/RolesPage';
import { UsersPage } from './pages/UsersPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { TasksPage } from './pages/TasksPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { AvailableWorkPage } from './pages/AvailableWorkPage';
import { MyBucketPage } from './pages/MyBucketPage';
import { PendingReviewsPage } from './pages/PendingReviewsPage';
import { MasterCalendarPage } from './pages/MasterCalendarPage';
import { PersonalCalendarPage } from './pages/PersonalCalendarPage';
import { WorkloadHubPage } from './pages/WorkloadHubPage';
import { PublishingArchivePage } from './pages/PublishingArchivePage';
import { AuditLedgerPage } from './pages/AuditLedgerPage';
import { DraftsPage } from './pages/DraftsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
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
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
              <Route path="drafts" element={<DraftsPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />
              <Route path="reviews" element={<PendingReviewsPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="tasks/:id" element={<TaskDetailPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="users/:id" element={<UserDetailPage />} />
              <Route path="roles" element={<RolesPage />} />
              <Route path="workload" element={<WorkloadHubPage />} />
              <Route path="calendar" element={<MasterCalendarPage />} />
              <Route path="publishing" element={<PublishingArchivePage />} />
              <Route path="audit" element={<AuditLedgerPage />} />
            </Route>

            {/* Employee Workspace Routes */}
            <Route element={<EmployeeLayout />}>
              <Route path="/dashboard" element={<EmployeeDashboardPage />} />
              <Route path="/drafts" element={<DraftsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/available-work" element={<AvailableWorkPage />} />
              <Route path="/my-bucket" element={<MyBucketPage />} />
              <Route path="/my-calendar" element={<PersonalCalendarPage />} />
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


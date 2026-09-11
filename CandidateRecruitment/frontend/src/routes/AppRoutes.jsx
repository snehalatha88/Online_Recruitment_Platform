import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { useAuth } from '../context/AuthContext';

// Auth Page
import { LoginPage } from '../pages/auth/LoginPage';

// Admin Pages
import { AdminLayout } from '../pages/admin/AdminLayout';
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { CandidatesPage } from '../pages/admin/CandidatesPage';
import { ExamsPage } from '../pages/admin/ExamsPage';
import { QuestionsPage } from '../pages/admin/QuestionsPage';
import { AssignmentsPage } from '../pages/admin/AssignmentsPage';
import { ResultsPage } from '../pages/admin/ResultsPage';
import { ResultDetailPage } from '../pages/admin/ResultDetailPage';
import { AuditLogsPage } from '../pages/admin/AuditLogsPage';

// Candidate Pages
import { CandidateLayout } from '../pages/candidate/CandidateLayout';
import { CandidateDashboard } from '../pages/candidate/CandidateDashboard';
import { ExamTakingPage } from '../pages/candidate/ExamTakingPage';
import { SubmissionSuccessPage } from '../pages/candidate/SubmissionSuccessPage';

export const AppRoutes = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            user?.role === 'ROLE_ADMIN' ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <Navigate to="/candidate/dashboard" replace />
            )
          ) : (
            <LoginPage />
          )
        }
      />

      {/* Root Redirection */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            user?.role === 'ROLE_ADMIN' ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <Navigate to="/candidate/dashboard" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Admin Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute requiredRole="ROLE_ADMIN" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="candidates" element={<CandidatesPage />} />
            <Route path="exams" element={<ExamsPage />} />
            <Route path="questions" element={<QuestionsPage />} />
            <Route path="assignments" element={<AssignmentsPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="results/:attemptId" element={<ResultDetailPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
          </Route>
        </Route>
      </Route>

      {/* Candidate Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute requiredRole="ROLE_CANDIDATE" />}>
          <Route path="/candidate" element={<CandidateLayout />}>
            <Route index element={<Navigate to="/candidate/dashboard" replace />} />
            <Route path="dashboard" element={<CandidateDashboard />} />
            <Route path="submitted" element={<SubmissionSuccessPage />} />
          </Route>
          {/* Distraction-free full assessment view */}
          <Route path="/candidate/exam/:attemptId" element={<ExamTakingPage />} />
        </Route>
      </Route>

      {/* 404 Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

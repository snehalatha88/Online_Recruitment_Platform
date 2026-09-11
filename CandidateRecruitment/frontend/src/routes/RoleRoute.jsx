import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/common/Spinner';

export const RoleRoute = ({ requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spinner text="Verifying authorization..." />;
  }

  if (!user || user.role !== requiredRole) {
    if (user?.role === 'ROLE_ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user?.role === 'ROLE_CANDIDATE') {
      return <Navigate to="/candidate/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

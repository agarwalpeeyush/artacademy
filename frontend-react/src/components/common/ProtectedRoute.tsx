import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, roles, user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // The bootstrap admin can reach exactly one page: the create-principal form. Any other route
  // (including the rest of the principal console) redirects there.
  if (user?.bootstrap && location.pathname !== '/principal/create-principal') {
    return <Navigate to="/principal/create-principal" replace />;
  }

  if (requiredRole && !roles.includes(requiredRole)) {
    const defaultPath = roles.includes('ROLE_PRINCIPAL')
      ? '/principal/dashboard'
      : roles.includes('ROLE_TEACHER')
      ? '/teacher/dashboard'
      : roles.includes('ROLE_PARENT')
      ? '/parent/dashboard'
      : '/student/dashboard';
    return <Navigate to={defaultPath} replace />;
  }

  return children;
};

export default ProtectedRoute;

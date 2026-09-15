import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { defaultWorkspace } from '../../utils/workspaces';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, roles } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ADMIN provisions Principals from the Principal console (D8), so it may enter the
  // principal route tree even without ROLE_PRINCIPAL.
  const adminInPrincipalConsole =
    requiredRole === 'ROLE_PRINCIPAL' && roles.includes('ROLE_ADMIN');

  if (requiredRole && !roles.includes(requiredRole) && !adminInPrincipalConsole) {
    const fallback = defaultWorkspace(roles);
    return <Navigate to={fallback?.home ?? '/login'} replace />;
  }

  return children;
};

export default ProtectedRoute;

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getStoredRole, isLoggedIn } from '../../services/authService';

const normalizeRole = (role) => String(role || '').trim().toUpperCase();

const portalLoginPathForLocation = (pathname) => {
  const path = String(pathname || '');
  if (path.startsWith('/admin')) return '/admin/login';
  if (path.startsWith('/doctor')) return '/doctor/login';
  return '/patient/login';
};

const ProtectedRoute = ({ allowedRoles, children }) => {
  const location = useLocation();
  const next = `${location.pathname}${location.search || ''}`;

  if (!isLoggedIn()) {
    const loginPath = portalLoginPathForLocation(location.pathname);
    return <Navigate to={`${loginPath}?next=${encodeURIComponent(next)}`} replace state={{ from: next }} />;
  }

  const required = Array.isArray(allowedRoles) ? allowedRoles.map(normalizeRole) : [];
  if (required.length > 0) {
    const currentRole = normalizeRole(getStoredRole());
    const isAllowed = required.includes(currentRole);

    if (!isAllowed) {
      return <Navigate to={`/forbidden?from=${encodeURIComponent(next)}`} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

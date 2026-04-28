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
      // Fallback: if the required role includes PATIENT and the stored role
      // is missing/doesn't match, allow access when the user is logged in and
      // the requested patient id matches the authenticated patient id stored
      // in localStorage. This helps when role hasn't been written yet but
      // the session clearly belongs to the same patient.
      let fallbackAllowed = false;
      try {
        if (required.includes('PATIENT') && isLoggedIn()) {
          const m = String(next || '').match(/^\/patient\/([^\/]+)/);
          const targetId = m && m[1] ? decodeURIComponent(m[1]) : null;
          const storedPid = localStorage.getItem('elixra.patientId') || localStorage.getItem('patientId') || '';
          if (targetId && storedPid && String(targetId) === String(storedPid)) {
            fallbackAllowed = true;
          }
        }
      } catch (e) {
        fallbackAllowed = false;
      }

      if (fallbackAllowed) {
        return children;
      }
      try {
        // Visible debug: log role mismatch and relevant localStorage keys
        // eslint-disable-next-line no-console
        console.log('[ProtectedRoute] access denied ->', {
          location: next,
          required,
          currentRole,
          isLoggedIn: isLoggedIn(),
          storedRoleRaw: localStorage.getItem('elixra.userRole'),
          accessToken: localStorage.getItem('accessToken') ? 'present' : 'missing',
          allKeys: Object.keys(localStorage).slice(0, 50),
        });
      } catch (e) {
        // ignore logging errors
      }
      return <Navigate to={`/forbidden?from=${encodeURIComponent(next)}`} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

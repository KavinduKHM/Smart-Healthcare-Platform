import axios from 'axios';

const AUTH_BASE_URL = process.env.REACT_APP_AUTH_URL || 'http://localhost:8081';

const AUTH_API = axios.create({
  baseURL: `${AUTH_BASE_URL.replace(/\/$/, '')}/api/auth`,
  headers: { 'Content-Type': 'application/json' },
});

const roleFromAuthorities = (roles) => {
  const list = Array.isArray(roles)
    ? roles
    : typeof roles === 'string'
      ? [roles]
      : Array.from(roles || []);
  const normalized = list.map((r) => String(r || '').trim().toUpperCase()).filter(Boolean);

  if (normalized.includes('ROLE_ADMIN') || normalized.includes('ADMIN')) return 'ADMIN';
  if (normalized.includes('ROLE_DOCTOR') || normalized.includes('DOCTOR')) return 'DOCTOR';
  if (normalized.includes('ROLE_PATIENT') || normalized.includes('PATIENT')) return 'PATIENT';
  return '';
};

export const login = async ({ usernameOrEmail, password }) => {
  const response = await AUTH_API.post('/login', { usernameOrEmail, password });
  return response.data;
};

export const register = async ({ username, email, password, firstName, lastName, phoneNumber, role }) => {
  const payload = {
    username,
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    role,
  };

  const response = await AUTH_API.post('/register', payload);
  return response.data;
};

export const saveAuthSession = (authResponse) => {
  if (!authResponse) return;

  const accessToken = authResponse.accessToken || '';
  const refreshToken = authResponse.refreshToken || '';
  const username = authResponse.username || '';
  const userId = authResponse.userId;
  // Determine roles from common response shapes: `roles`, `authorities` (strings),
  // or `authorities` as objects [{ authority: 'ROLE_PATIENT' }].
  // Try common fields that backends may return for roles: `roles`, `role`,
  // `userRole`, or `authorities` (strings or objects).
  let rolesCandidate = authResponse.roles || authResponse.role || authResponse.userRole || null;
  if (!rolesCandidate && Array.isArray(authResponse.authorities)) {
    const first = authResponse.authorities[0];
    if (typeof first === 'string') {
      rolesCandidate = authResponse.authorities;
    } else if (typeof first === 'object' && first !== null) {
      rolesCandidate = authResponse.authorities.map((a) => a.authority || a.role || a.name || a);
    }
  }

  // Ensure rolesCandidate is an array or string-friendly list for debugging
  const rawRolesForStorage = rolesCandidate;

  const role = roleFromAuthorities(rolesCandidate);

  try {
    // Debug: show the incoming roles shape and the computed role
    // eslint-disable-next-line no-console
    console.debug('[auth] rolesCandidate:', rolesCandidate);
    // eslint-disable-next-line no-console
    console.debug('[auth] computed role:', role);
  } catch (e) {}

  if (accessToken) {
    localStorage.setItem('accessToken', accessToken);
    try {
      const preview = accessToken.length > 20 ? `${accessToken.substring(0,20)}...` : accessToken;
      // eslint-disable-next-line no-console
      console.debug('[auth] saved accessToken preview:', preview);
    } catch (e) {}
  }

  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }

  if (username) {
    localStorage.setItem('elixra.userName', username);
  }

  if (role) {
    localStorage.setItem('elixra.userRole', role);
  }

  try {
    // Persist the raw roles shape for debugging (if any)
    if (rawRolesForStorage) {
      localStorage.setItem('elixra.userRolesRaw', typeof rawRolesForStorage === 'string' ? rawRolesForStorage : JSON.stringify(rawRolesForStorage));
    }
  } catch (e) {}

  if (userId !== undefined && userId !== null) {
    localStorage.setItem('elixra.userId', String(userId));
    if (role === 'PATIENT') {
      localStorage.setItem('elixra.patientId', String(userId));
      localStorage.setItem('patientId', String(userId));
    }
    if (role === 'DOCTOR') {
      localStorage.setItem('elixra.doctorId', String(userId));
      localStorage.setItem('doctorId', String(userId));
    }
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('elixra.userName');
  localStorage.removeItem('elixra.userRole');
  localStorage.removeItem('elixra.userId');
  localStorage.removeItem('elixra.patientId');
  localStorage.removeItem('elixra.doctorId');
  localStorage.removeItem('patientId');
  localStorage.removeItem('doctorId');
};

export const getStoredRole = () => localStorage.getItem('elixra.userRole') || '';

export const getStoredToken = () => localStorage.getItem('accessToken') || '';

export const isLoggedIn = () => Boolean(getStoredToken());

import axios from 'axios';

const AUTH_BASE_URL = process.env.REACT_APP_AUTH_URL || 'http://localhost:8081';

const AUTH_API = axios.create({
  baseURL: `${AUTH_BASE_URL.replace(/\/$/, '')}/api/auth`,
  headers: { 'Content-Type': 'application/json' },
});

const roleFromAuthorities = (roles) => {
  const list = Array.isArray(roles) ? roles : Array.from(roles || []);
  const normalized = list.map((r) => String(r || '').trim().toUpperCase()).filter(Boolean);

  if (normalized.includes('ROLE_ADMIN')) return 'ADMIN';
  if (normalized.includes('ROLE_DOCTOR')) return 'DOCTOR';
  if (normalized.includes('ROLE_PATIENT')) return 'PATIENT';
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
  const role = roleFromAuthorities(authResponse.roles);

  if (accessToken) {
    localStorage.setItem('accessToken', accessToken);
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

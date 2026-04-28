// src/services/api.js
import axios from 'axios';
import { clearAuthSession } from './authService';

const getLoginPathForCurrentLocation = () => {
  const path = window.location.pathname || '/';
  if (path.startsWith('/admin')) return '/admin/login';
  if (path.startsWith('/doctor')) return '/doctor/login';
  return '/patient/login';
};

const redirectToLogin = () => {
  const next = `${window.location.pathname || '/'}${window.location.search || ''}`;
  const loginPath = getLoginPathForCurrentLocation();
  const url = `${loginPath}?next=${encodeURIComponent(next)}`;
  window.location.assign(url);
};

const redirectToForbidden = () => {
  const from = `${window.location.pathname || '/'}${window.location.search || ''}`;
  window.location.assign(`/forbidden?from=${encodeURIComponent(from)}`);
};

const withAuth = (client) => {
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;

      // Avoid redirect loops while already on a login page.
      const path = window.location.pathname || '';
      const isLoginPage = path.endsWith('/login');

      if (!isLoginPage && status === 401) {
        clearAuthSession();
        redirectToLogin();
      }

      if (!isLoginPage && status === 403) {
        try {
          // Log the failing request/response so developers can inspect why
          // the backend rejected the call before we navigate away.
          // eslint-disable-next-line no-console
          console.error('[API] 403 response detected; redirecting to /forbidden', {
            url: error?.config?.url,
            method: error?.config?.method,
            status: error?.response?.status,
            responseData: error?.response?.data,
          });
        } catch (e) {}
        redirectToForbidden();
      }

      return Promise.reject(error);
    }
  );

  return client;
};

// Backend service base URLs (adjust ports if needed)
export const PATIENT_API = axios.create({
  baseURL: 'http://localhost:8082/api/patients',
  headers: { 'Content-Type': 'application/json' }
});

withAuth(PATIENT_API);

// Debugging: log patient API requests and token presence
PATIENT_API.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('accessToken');
    const preview = token ? (token.length > 20 ? `${token.substring(0,20)}...` : token) : 'NO_TOKEN';
    // eslint-disable-next-line no-console
    console.debug('[PATIENT_API] request:', config.method, config.url, 'tokenPreview=', preview);
  } catch (e) {
    // ignore
  }
  return config;
}, (error) => Promise.reject(error));

PATIENT_API.interceptors.response.use((resp) => {
  try {
    // eslint-disable-next-line no-console
    console.debug('[PATIENT_API] response:', resp.status, resp.config?.url);
  } catch (e) {}
  return resp;
}, (error) => {
  try {
    // eslint-disable-next-line no-console
    console.debug('[PATIENT_API] response error:', error?.response?.status, error?.response?.config?.url);
  } catch (e) {}
  return Promise.reject(error);
});

export const DOCTOR_API = axios.create({
  baseURL: 'http://localhost:8083/api/doctors',
  headers: { 'Content-Type': 'application/json' }
});

withAuth(DOCTOR_API);

// Public doctor API (no auth interceptors) - used for listings that should be accessible to patients/public
export const DOCTOR_PUBLIC_API = axios.create({
  baseURL: 'http://localhost:8083/api/doctors',
  headers: { 'Content-Type': 'application/json' }
});

// If a token exists (user signed in) forward it, but do NOT add the response interceptor
// that would auto-redirect on 401/403 — we want listing to attempt authenticated access
DOCTOR_PUBLIC_API.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const APPOINTMENT_API = axios.create({
  baseURL: 'http://localhost:8084/api/appointments',
  headers: { 'Content-Type': 'application/json' }
});

withAuth(APPOINTMENT_API);

export const AI_SYMPTOM_CHECKER_API = axios.create({
  baseURL: 'http://localhost:8086/api/ai/symptom-checker',
  headers: { 'Content-Type': 'application/json' }
});

withAuth(AI_SYMPTOM_CHECKER_API);

export const TELEMEDICINE_API = axios.create({
  baseURL: 'http://localhost:8085/api/video',
  headers: { 'Content-Type': 'application/json' }
});

withAuth(TELEMEDICINE_API);

// For file uploads (multipart), we'll use a separate instance without default content-type
export const PATIENT_UPLOAD_API = axios.create({
  baseURL: 'http://localhost:8082/api/patients'
});

withAuth(PATIENT_UPLOAD_API);
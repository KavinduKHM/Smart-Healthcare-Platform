import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { clearAuthSession, getStoredRole, login, saveAuthSession } from '../../services/authService';
import './LoginPage.css';

const normalizePortal = (portal) => {
  const value = String(portal || '').trim().toLowerCase();
  if (value === 'doctor') return 'doctor';
  if (value === 'admin') return 'admin';
  return 'patient';
};

const getDefaultRedirect = (portal, userId) => {
  if (portal === 'admin') return '/admin';
  if (portal === 'doctor') return userId ? `/doctor/${encodeURIComponent(userId)}/appointments` : '/doctor/login';
  return userId ? `/patient/${encodeURIComponent(userId)}/appointments` : '/patient';
};

const getSignupPath = (portal) => {
  if (portal === 'admin') return '/admin/signup';
  if (portal === 'doctor') return '/doctor/signup';
  return '/patient/signup';
};

const isRoleAllowedForPortal = (portal, role) => {
  const normalized = String(role || '').trim().toUpperCase();
  if (!normalized) return false;
  if (portal === 'admin') return normalized === 'ADMIN';
  if (portal === 'doctor') return normalized === 'DOCTOR' || normalized === 'ADMIN';
  return normalized === 'PATIENT' || normalized === 'ADMIN';
};

const LoginPage = ({ portal: portalProp }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const portal = useMemo(() => normalizePortal(portalProp), [portalProp]);

  const [form, setForm] = useState({ usernameOrEmail: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const title = portal === 'admin' ? 'Admin Login' : portal === 'doctor' ? 'Doctor Login' : 'Patient Login';
  const subtitle = portal === 'admin'
    ? 'Sign in to review doctor verification and user management.'
    : portal === 'doctor'
      ? 'Sign in to manage appointments, prescriptions, and your profile.'
      : 'Sign in to book appointments and manage your medical records.';

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const usernameOrEmail = String(form.usernameOrEmail || '').trim();
    const password = String(form.password || '');

    if (!usernameOrEmail || !password) {
      setError('Please enter your username/email and password.');
      return;
    }

    setBusy(true);
    try {
      clearAuthSession();
      const authResponse = await login({ usernameOrEmail, password });
      saveAuthSession(authResponse);

      const storedRole = getStoredRole();
      if (!isRoleAllowedForPortal(portal, storedRole)) {
        clearAuthSession();
        setError('Your account is not allowed to sign in here.');
        return;
      }

      const next = searchParams.get('next');
      const safeNext = next && next.startsWith('/') ? next : '';

      const userId = authResponse?.userId;
      const redirectTo = safeNext || getDefaultRedirect(portal, userId);

      navigate(redirectTo, {
        replace: true,
        state: { flashMessage: { type: 'success', text: `Welcome back, ${authResponse?.username || 'user'}!` } },
      });
    } catch (err) {
      const status = err?.response?.status;

      if (status === 401) {
        setError('Invalid username/email or password.');
      } else if (status === 403) {
        setError('Your account is not allowed to sign in here.');
      } else {
        setError(err?.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    // Requirement: remove any currently logged-in user when opening login.
    clearAuthSession();
  }, [portal]);

  const backTarget = location?.state?.from || '/';

  return (
    <div className="loginRoot">
      <section className="loginCard" aria-label={title}>
        <div className="loginCardHeader">
          <h1 className="loginTitle">{title}</h1>
          <p className="loginSubtitle muted">{subtitle}</p>
        </div>

        {error ? (
          <div className="loginError" role="alert">
            {error}
          </div>
        ) : null}

        <form className="loginForm" onSubmit={handleSubmit}>
          <label className="loginField">
            <span className="loginLabel">Username or Email</span>
            <input
              name="usernameOrEmail"
              value={form.usernameOrEmail}
              onChange={handleChange}
              autoComplete="username"
              placeholder="e.g. pat1234 or pat1234@example.com"
              inputMode="email"
            />
          </label>

          <label className="loginField">
            <span className="loginLabel">Password</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              placeholder="Your password"
            />
          </label>

          <button type="submit" disabled={busy} className="loginSubmit">
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="loginLinks">
          <Link to={backTarget} className="loginLink">Back</Link>
          <span className="loginDivider" aria-hidden="true">•</span>
          <Link to="/" className="loginLink">Home</Link>
          <span className="loginDivider" aria-hidden="true">•</span>
          <Link to={getSignupPath(portal)} className="loginLink">Sign up</Link>
        </div>

        <div className="loginRoleLinks">
          <p className="muted">Sign in as:</p>
          <div className="loginRoleButtonRow">
            <Link className={`loginRoleButton ${portal === 'patient' ? 'active' : ''}`} to="/patient/login">Patient</Link>
            <Link className={`loginRoleButton ${portal === 'doctor' ? 'active' : ''}`} to="/doctor/login">Doctor</Link>
            <Link className={`loginRoleButton ${portal === 'admin' ? 'active' : ''}`} to="/admin/login">Admin</Link>
          </div>
        </div>
      </section>

      
    </div>
  );
};

export default LoginPage;

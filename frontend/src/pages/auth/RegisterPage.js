import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearAuthSession, register } from '../../services/authService';
import './RegisterPage.css';

const normalizePortal = (portal) => {
  const value = String(portal || '').trim().toLowerCase();
  if (value === 'doctor') return 'doctor';
  if (value === 'admin') return 'admin';
  return 'patient';
};

const roleForPortal = (portal) => {
  if (portal === 'admin') return 'ADMIN';
  if (portal === 'doctor') return 'DOCTOR';
  return 'PATIENT';
};

const loginPathForPortal = (portal) => {
  if (portal === 'admin') return '/admin/login';
  if (portal === 'doctor') return '/doctor/login';
  return '/patient/login';
};

const RegisterPage = ({ portal: portalProp }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const portal = useMemo(() => normalizePortal(portalProp), [portalProp]);
  const role = useMemo(() => roleForPortal(portal), [portal]);

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    specialty: '',
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const title = portal === 'admin' ? 'Admin Sign Up' : portal === 'doctor' ? 'Doctor Sign Up' : 'Patient Sign Up';
  const subtitle = portal === 'admin'
    ? 'Create an admin account for local testing.'
    : portal === 'doctor'
      ? 'Create your account to access the doctor portal.'
      : 'Create your account to access the patient portal.';

  useEffect(() => {
    // Requirement: remove any currently logged-in user when opening sign up.
    clearAuthSession();
  }, [portal]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const payload = {
      username: String(form.username || '').trim(),
      email: String(form.email || '').trim(),
      password: String(form.password || ''),
      firstName: String(form.firstName || '').trim(),
      lastName: String(form.lastName || '').trim(),
      phoneNumber: String(form.phoneNumber || '').trim(),
      role,
      specialty: portal === 'doctor' ? String(form.specialty || '').trim() : undefined,
    };

    if (!payload.username || !payload.email || !payload.password || !payload.firstName || !payload.lastName || !payload.phoneNumber || (portal === 'doctor' && !payload.specialty)) {
      setError('Please fill in all fields.');
      return;
    }

    setBusy(true);
    try {
      clearAuthSession();
      await register(payload);
      setSuccess('Account created. Please sign in.');
      navigate(loginPathForPortal(portal), { replace: true, state: { from: location?.state?.from || '/' } });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 400) {
        const message = err?.response?.data?.message;
        setError(message || 'Registration failed. Please check your details.');
      } else {
        setError(err?.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const backTarget = location?.state?.from || '/';

  return (
    <div className="registerRoot">
      <section className="registerCard" aria-label={title}>
        <div className="registerCardHeader">
          <h1 className="registerTitle">{title}</h1>
          <p className="registerSubtitle muted">{subtitle}</p>
          <p className="registerRolePill" aria-label="Selected role">Role: {role}</p>
        </div>

        {error ? (
          <div className="registerError" role="alert">{error}</div>
        ) : null}
        {success ? (
          <div className="registerSuccess" role="status">{success}</div>
        ) : null}

        <form className="registerForm" onSubmit={handleSubmit}>
          <label className="registerField">
            <span className="registerLabel">Username</span>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              placeholder="e.g. pat1234"
            />
          </label>

          <label className="registerField">
            <span className="registerLabel">Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="e.g. pat1234@example.com"
              inputMode="email"
            />
          </label>

          <label className="registerField">
            <span className="registerLabel">Password</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              placeholder="Choose a password"
            />
          </label>

          <div className="registerTwoCol">
            <label className="registerField">
              <span className="registerLabel">First name</span>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                autoComplete="given-name"
                placeholder="First name"
              />
            </label>

            <label className="registerField">
              <span className="registerLabel">Last name</span>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                autoComplete="family-name"
                placeholder="Last name"
              />
            </label>
          </div>

          <label className="registerField">
            <span className="registerLabel">Phone number</span>
            <input
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={handleChange}
              autoComplete="tel"
              placeholder="10-digit phone number"
              inputMode="tel"
            />
          </label>

          {portal === 'doctor' && (
            <label className="registerField">
              <span className="registerLabel">Specialty</span>
              <input
                name="specialty"
                value={form.specialty}
                onChange={handleChange}
                placeholder="e.g. Cardiologist"
              />
            </label>
          )}

          <button type="submit" disabled={busy} className="registerSubmit">
            {busy ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="registerLinks">
          <Link to={backTarget} className="registerLink">Back</Link>
          <span className="registerDivider" aria-hidden="true">•</span>
          <Link to={loginPathForPortal(portal)} className="registerLink">Sign in</Link>
          <span className="registerDivider" aria-hidden="true">•</span>
          <Link to="/" className="registerLink">Home</Link>
        </div>
      </section>
    </div>
  );
};

export default RegisterPage;

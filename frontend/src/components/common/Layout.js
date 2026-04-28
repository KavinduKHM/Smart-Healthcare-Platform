import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { clearAuthSession, isLoggedIn } from '../../services/authService';
import './Layout.css';

const getStoredUser = () => ({
  userName: localStorage.getItem('elixra.userName') || '',
  userRole: localStorage.getItem('elixra.userRole') || '',
  patientId: localStorage.getItem('patientId') || localStorage.getItem('elixra.patientId') || '',
  doctorId: localStorage.getItem('doctorId') || localStorage.getItem('elixra.doctorId') || '',
});

const getDashboardPath = (user) => {
  const role = String(user.userRole || '').trim().toLowerCase();
  const patientId = String(user.patientId || '').trim();
  const doctorId = String(user.doctorId || '').trim();

  if (role === 'patient') {
    return patientId ? `/patient/${encodeURIComponent(patientId)}/appointments` : '/patient';
  }

  if (role === 'doctor') {
    return doctorId ? `/doctor/${encodeURIComponent(doctorId)}/appointments` : '/doctor';
  }

  if (role === 'admin') {
    return '/admin';
  }

  return '/';
};

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location?.pathname || '';

  const isPortalShellRoute = /^\/(patient|doctor)\/[^/]+(\/?|$)/.test(pathname) && pathname !== '/patient/register';
  const containerClassName = isPortalShellRoute ? 'portalContainer' : 'container';

  const [user, setUser] = useState(getStoredUser);
  const [menuOpen, setMenuOpen] = useState(false);

  const loggedIn = useMemo(() => isLoggedIn(), [user]);

  const headerLabel = useMemo(() => {
    const name = String(user.userName || '').trim() || 'Guest';
    const role = String(user.userRole || '').trim();
    return role ? `${name} (${role})` : name;
  }, [user]);

  const dashboardPath = useMemo(() => getDashboardPath(user), [user]);

  useEffect(() => {
    const refresh = () => setUser(getStoredUser());
    refresh();
    const onStorage = (event) => {
      if (
        event.key === 'elixra.userName' ||
        event.key === 'elixra.userRole' ||
        event.key === 'patientId' ||
        event.key === 'doctorId' ||
        event.key === 'elixra.patientId' ||
        event.key === 'elixra.doctorId'
      ) {
        refresh();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [pathname]);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const isPublicPage = !isPortalShellRoute;

  return (
    <div className="hc-layout">

      {/* Main navigation */}
      <header className="hc-header" role="banner">
        <div className={`container hc-header-inner`}>
          <Link to="/" className="hc-brand" aria-label="ELIXRA home">
            <div className="hc-brand-mark" aria-hidden="true">
              <img
                src="/Untitled%20design%20(5).png"
                alt="ELIXRA"
                className="hc-logo-img"
              />
            </div>
          </Link>

          <nav className="hc-nav" aria-label="Primary">
            <NavLink to="/" end className={({ isActive }) => `hc-nav-link ${isActive ? 'hc-nav-link--active' : ''}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Home
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => `hc-nav-link ${isActive ? 'hc-nav-link--active' : ''}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              About Us
            </NavLink>
            <NavLink to="/services" className={({ isActive }) => `hc-nav-link ${isActive ? 'hc-nav-link--active' : ''}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Our Services
            </NavLink>
            <NavLink to="/contact" className={({ isActive }) => `hc-nav-link ${isActive ? 'hc-nav-link--active' : ''}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.18 9.81a19.79 19.79 0 01-3.07-8.72A2 2 0 012.09 1h3a2 2 0 012 1.72"/></svg>
              Contact Us
            </NavLink>
          </nav>

          <div className="hc-header-actions">
            {loggedIn ? (
              <>
                <button
                  type="button"
                  className="hc-user-chip"
                  onClick={() => navigate(dashboardPath)}
                  aria-label={`Open ${headerLabel} dashboard`}
                  title={headerLabel}
                >
                  <span className="hc-avatar" aria-hidden="true">
                    {(user.userName || 'G').trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="hc-user-name">{headerLabel}</span>
                </button>
                <button
                  type="button"
                  className="hc-btn hc-btn--outline"
                  onClick={() => {
                    clearAuthSession();
                    setUser(getStoredUser());
                    navigate('/', { replace: true });
                  }}
                  aria-label="Logout"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/patient/login" className="hc-btn hc-btn--ghost">Log in</Link>
                <Link to="/patient/signup" className="hc-btn hc-btn--primary">Sign up</Link>
              </>
            )}

            <button
              type="button"
              className="hc-hamburger"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <nav className="hc-mobile-nav" aria-label="Mobile navigation">
            <NavLink to="/" end className="hc-mobile-nav-link" onClick={() => setMenuOpen(false)}>🏠 Home</NavLink>
            <NavLink to="/about" className="hc-mobile-nav-link" onClick={() => setMenuOpen(false)}>ℹ️ About Us</NavLink>
            <NavLink to="/services" className="hc-mobile-nav-link" onClick={() => setMenuOpen(false)}>✅ Our Services</NavLink>
            <NavLink to="/contact" className="hc-mobile-nav-link" onClick={() => setMenuOpen(false)}>📞 Contact Us</NavLink>
            {!loggedIn && (
              <div className="hc-mobile-nav-actions">
                <Link to="/patient/login" className="hc-btn hc-btn--ghost hc-btn--sm" onClick={() => setMenuOpen(false)}>Log in</Link>
                <Link to="/patient/signup" className="hc-btn hc-btn--primary hc-btn--sm" onClick={() => setMenuOpen(false)}>Sign up</Link>
              </div>
            )}
          </nav>
        )}
      </header>

      <main className={`hc-main ${isPortalShellRoute ? 'portalMain' : ''}`}>
        {isPortalShellRoute ? (
          <div className={containerClassName}>{children}</div>
        ) : (
          children
        )}
      </main>

      {/* Footer - render full footer on every page */}
      <footer className="hc-footer" role="contentinfo">
        <div className="container hc-footer-inner">
          <div className="hc-footer-col hc-footer-brand-col">
            <div className="hc-footer-brand">
              <div className="hc-brand-mark" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <span className="hc-footer-brand-title">ELIXRA</span>
            </div>
            <p className="hc-footer-tagline">Home Health Care</p>
            <p className="hc-footer-desc">
              Dedicated to providing compassionate, high-quality home health care services to our community.
            </p>
            <p className="hc-footer-copy">© {new Date().getFullYear()} ELIXRA. All rights reserved.</p>
            <p className="hc-footer-copy">
              <a className="hc-footer-link" href="/privacy">View Our Disclaimer</a>
            </p>
          </div>

          <div className="hc-footer-col">
            <h4 className="hc-footer-heading">Contact Details</h4>
            <ul className="hc-footer-list">
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.18 9.81a19.79 19.79 0 01-3.07-8.72A2 2 0 012.09 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6z"/></svg>
                Phone Number: (321) 456-7890
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.18 9.81a19.79 19.79 0 01-3.07-8.72A2 2 0 012.09 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6z"/></svg>
                Fax Number: (321) 456-7891
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                info@elixra.health
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                476 Sunrise Blvd, Suite 12<br />City Name, State 12345
              </li>
            </ul>
          </div>

          <div className="hc-footer-col">
            <h4 className="hc-footer-heading">Site Navigations</h4>
            <div className="hc-footer-nav-grid">
              <div>
                <Link to="/" className="hc-footer-nav-link">HOME</Link>
                <Link to="/patient" className="hc-footer-nav-link">PATIENT</Link>
                <Link to="/doctor" className="hc-footer-nav-link">DOCTOR</Link>
                <Link to="/admin" className="hc-footer-nav-link">ADMIN</Link>
              </div>
              <div>
                <Link to="/patient/signup" className="hc-footer-nav-link">SIGN UP</Link>
                <Link to="/patient/login" className="hc-footer-nav-link">LOGIN</Link>
                <Link to="/privacy" className="hc-footer-nav-link">PRIVACY</Link>
                <Link to="/terms" className="hc-footer-nav-link">TERMS</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="hc-footer-bottom">
          <div className="container">
            <p>Designed &amp; Developed by ELIXRA Health Team. Providing quality home health care services.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { getDoctorProfile, getDoctorProfileByUserId } from '../../services/doctorService';

const DoctorShell = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [resolvedDoctorId, setResolvedDoctorId] = useState(null);

  const doctorIdNum = useMemo(() => Number(doctorId), [doctorId]);

  const doctorDisplayName = useMemo(() => {
    const name = String(profile?.name || '').trim();
    if (name) return name;
    const first = String(profile?.firstName || '').trim();
    const last = String(profile?.lastName || '').trim();
    const full = [first, last].filter(Boolean).join(' ').trim();
    return full || 'Doctor';
  }, [profile]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!Number.isFinite(doctorIdNum) || doctorIdNum <= 0) {
        setLoadError('Invalid doctor id');
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        const res = await getDoctorProfile(doctorIdNum);
        if (!isMounted) return;
        setProfile(res.data);
        setResolvedDoctorId(Number(res?.data?.id) || doctorIdNum);
      } catch (err) {
        try {
          // Fallback: URL may contain auth userId instead of doctor profile id.
          const byUserRes = await getDoctorProfileByUserId(doctorIdNum);
          if (!isMounted) return;
          const data = byUserRes?.data;
          const canonicalDoctorId = Number(data?.id);
          setProfile(data);
          setResolvedDoctorId(Number.isFinite(canonicalDoctorId) && canonicalDoctorId > 0 ? canonicalDoctorId : doctorIdNum);
        } catch (fallbackErr) {
          console.error(fallbackErr);
          if (!isMounted) return;
          const status = fallbackErr?.response?.status || err?.response?.status;
          setLoadError(status === 404 ? 'Doctor not found' : 'Failed to load doctor data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [doctorIdNum]);

  useEffect(() => {
    if (!Number.isFinite(resolvedDoctorId) || resolvedDoctorId <= 0) return;
    if (resolvedDoctorId === doctorIdNum) return;

    // Normalize route to canonical doctor profile id.
    navigate(`/doctor/${encodeURIComponent(resolvedDoctorId)}/appointments`, { replace: true });
  }, [resolvedDoctorId, doctorIdNum, navigate]);

  useEffect(() => {
    const name = String(doctorDisplayName || '').trim();
    if (name) {
      localStorage.setItem('elixra.userName', name);
      localStorage.setItem('elixra.userRole', 'Doctor');
    }

    const effectiveDoctorId = Number.isFinite(resolvedDoctorId) && resolvedDoctorId > 0
      ? resolvedDoctorId
      : doctorIdNum;

    if (Number.isFinite(effectiveDoctorId) && effectiveDoctorId > 0) {
      localStorage.setItem('doctorId', String(effectiveDoctorId));
      localStorage.setItem('elixra.doctorId', String(effectiveDoctorId));
    }
  }, [doctorDisplayName, doctorIdNum, resolvedDoctorId]);

  const effectiveDoctorId = useMemo(() => {
    if (Number.isFinite(resolvedDoctorId) && resolvedDoctorId > 0) return resolvedDoctorId;
    return doctorIdNum;
  }, [resolvedDoctorId, doctorIdNum]);

  const outletContext = useMemo(
    () => ({ doctorId: effectiveDoctorId, profile, setProfile }),
    [effectiveDoctorId, profile]
  );

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <h3 className="sidebarTitle">{doctorDisplayName}</h3>
          <div className="sidebarMeta">ID: {effectiveDoctorId || doctorId}</div>
        </div>
        <nav className="sidebarNav">
          <NavLink
            to="appointments"
            end
            className={({ isActive }) => `sidebarLink ${isActive ? 'sidebarLinkActive' : ''}`}
          >
            Appointments
          </NavLink>
          <NavLink
            to="prescriptions"
            className={({ isActive }) => `sidebarLink ${isActive ? 'sidebarLinkActive' : ''}`}
          >
            Prescriptions
          </NavLink>
          <NavLink
            to="profile"
            className={({ isActive }) => `sidebarLink ${isActive ? 'sidebarLinkActive' : ''}`}
          >
            Profile
          </NavLink>
        </nav>
        <div style={{ marginTop: '1rem' }}>
          <Link
            to="/doctor"
            style={{ color: 'white' }}
            onClick={() => {
              localStorage.removeItem('elixra.userName');
              localStorage.removeItem('elixra.userRole');
            }}
          >
            Switch doctor
          </Link>
        </div>
      </aside>

      <section className="content">
        {loading && <p>Loading doctor data...</p>}
        {!loading && loadError && (
          <div>
            <p style={{ color: 'red' }}>{loadError}</p>
            <Link to="/doctor">Go back</Link>
          </div>
        )}
        {!loading && !loadError && <Outlet context={outletContext} />}
      </section>
    </div>
  );
};

export default DoctorShell;

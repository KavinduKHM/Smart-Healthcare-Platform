import React, { useEffect, useState } from 'react';
import { getAvailableSlots, bookAppointment, createPaymentIntentForAppointment } from '../services/appointmentService';
import { listAllDoctors, getDoctorAvailability } from '../services/doctorService';
import { getPatientProfile } from '../services/patientService';
import './DoctorShowcasePage.css';
import StripePayment from '../components/common/StripePayment';

const DoctorShowcasePage = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  const [bookingModal, setBookingModal] = useState({ open: false, doctor: null, slot: null, step: 1, appointmentId: null, clientSecret: '' });
  const [form, setForm] = useState({ fullName: '', notes: '', phone: '', symptoms: '' });

  const pad2 = (n) => String(n).padStart(2, '0');
  const toMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const parts = String(timeStr).split(':');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    return (h * 60) + m;
  };
  const fromMinutes = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${pad2(h)}:${pad2(m)}:00`;
  };
  const buildSlotsFromAvailability = (availList) => {
    if (!Array.isArray(availList)) return [];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;

    const slots = [];
    availList.forEach((a) => {
      if (!a || !a.availableDate) return;
      const dateStr = typeof a.availableDate === 'string'
        ? a.availableDate
        : String(a.availableDate).slice(0, 10);
      if (dateStr < todayStr) return;
      if (a.status && String(a.status).toUpperCase() !== 'AVAILABLE') return;

      const duration = Number(a.slotDuration || 30);
      const startMin = toMinutes(a.startTime);
      const endMin = toMinutes(a.endTime);
      if (!duration || endMin <= startMin) return;

      for (let m = startMin; m + duration <= endMin; m += duration) {
        slots.push(`${dateStr}T${fromMinutes(m)}`);
      }
    });

    return slots.sort();
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    listAllDoctors()
      .then((res) => {
        if (!mounted) return;
        const data = res?.data || [];
        // doctor service may return either an array or a paged object { content: [] }
        setDoctors(Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []));
      })
      .catch((err) => {
        console.error('Failed to load doctors', err);
      })
      .finally(() => setLoading(false));
    return () => { mounted = false; };
  }, []);

  // support quick-prefill via query params (e.g. ?prefillDoctorId=123)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const did = params.get('prefillDoctorId');
      if (did) {
        // attempt to fetch slots for the given doctor id
        setTimeout(() => showSlots({ id: Number(did) }), 250);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const showSlots = async (doctor) => {
    if (!doctor || !doctor.id) return;
    setSelectedDoctorId(doctor.id);
    setActiveTab(doctor.id);
    setSlots([]);
    setSlotsLoading(true);
    try {
      const availResp = await getDoctorAvailability(doctor.id);
      const availList = availResp?.data || [];
      const expandedSlots = buildSlotsFromAvailability(availList);
      setSlots(expandedSlots);
    } catch (err) {
      console.error(err);
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const openBooking = async (doctor, slot) => {
    const defaultForm = { fullName: localStorage.getItem('patientName') || '', notes: '', phone: localStorage.getItem('patientPhone') || '', symptoms: '' };
    const patientId = localStorage.getItem('patientId') || localStorage.getItem('elixra.patientId');
    if (patientId) {
      try {
        const profileRes = await getPatientProfile(Number(patientId));
        const profile = profileRes?.data || {};
        const nameParts = [profile.firstName, profile.middleName, profile.lastName].filter(Boolean);
        const fullName = nameParts.length > 0 ? nameParts.join(' ') : (profile.fullName || profile.name || defaultForm.fullName);
        const phone = profile.phoneNumber || profile.phone || defaultForm.phone;
        setForm({ fullName, notes: '', phone, symptoms: '' });
      } catch (e) {
        setForm(defaultForm);
      }
    } else {
      setForm(defaultForm);
    }
    setBookingModal({ open: true, doctor, slot, step: 1, appointmentId: null, clientSecret: '' });
  };

  const closeBooking = () => {
    setBookingModal({ open: false, doctor: null, slot: null, step: 1, appointmentId: null, clientSecret: '' });
  };

  const submitBooking = async () => {
    const patientId = localStorage.getItem('patientId');
    if (!patientId) return alert('You must be signed in as a patient to book.');
    const doctorId = bookingModal.doctor?.id;
    const slot = bookingModal.slot;
    if (!doctorId || !slot) return alert('Missing doctor or slot');

    const payload = {
      patientId: Number(patientId),
      doctorId: Number(doctorId),
      appointmentTime: slot,
      notes: form.notes || '',
      symptoms: form.symptoms || '',
      patientName: form.fullName || ''
    };

    try {
      const res = await bookAppointment(payload);
      const appointment = res?.data || res;
      const appointmentId = appointment?.id || appointment?.appointmentId || null;
      if (!appointmentId) return alert('Booking succeeded but appointment id missing');
      // move to payment step
      let clientSecret = appointment?.clientSecret || '';
      if (!clientSecret) {
        const pi = await createPaymentIntentForAppointment(appointmentId);
        clientSecret = pi?.data?.clientSecret || '';
      }
      setBookingModal((b) => ({ ...b, step: 2, appointmentId, clientSecret }));
    } catch (err) {
      console.error('Booking/payment error', err, err?.response?.data);
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || '';

      if (status === 400 && serverMsg && serverMsg.toLowerCase().includes('payment already processed')) {
        alert('Payment already processed for this appointment. Redirecting to your appointments.');
        const pid = localStorage.getItem('patientId');
        window.location.href = pid ? `/patient/${encodeURIComponent(pid)}/appointments` : '/appointments';
        return;
      }

      // Some older appointment-service builds returned 503 for payment errors (duplicate payment).
      // Handle the case where server returned a 503 but included a duplicate-payment message in the body.
      if ((status === 503 || !status) && serverMsg && serverMsg.toLowerCase().includes('payment already processed')) {
        alert('Payment already processed for this appointment. Redirecting to your appointments.');
        const pid = localStorage.getItem('patientId');
        window.location.href = pid ? `/patient/${encodeURIComponent(pid)}/appointments` : '/appointments';
        return;
      }

      if (status === 503) {
        alert('Payment service is temporarily unavailable. Please try again later or check your appointments page.');
        return;
      }

      alert('Failed to book appointment: ' + (serverMsg || status || 'Unknown error'));
    }
  };

  const onPaymentSuccess = () => {
    const patientId = localStorage.getItem('patientId');
    closeBooking();
    if (patientId) {
      window.location.href = `/patient/${encodeURIComponent(patientId)}/appointments`;
    } else {
      window.location.href = '/appointments';
    }
  };

  return (
    <div className="doctors-showcase-page container">
      <header className="doctors-showcase-head">
        <h1>Find a Doctor</h1>
        <p>Browse all doctors and their available slots. Select a slot to book.</p>
      </header>
      <div className="doctors-tabs">
        {loading && <p>Loading doctors…</p>}
        {!loading && doctors.length === 0 && <p>No doctors found.</p>}

        <div className="doctors-tab-list">
          {doctors.map((d) => (
            <button
              key={d.id || d.userId}
              className={`doctors-tab ${activeTab === d.id ? 'doctors-tab--active' : ''}`}
              onClick={() => {
                setActiveTab(d.id);
                showSlots(d);
              }}
            >
              <div className="doctors-tab-name">Dr. {d.fullName || `${d.firstName || ''} ${d.lastName || ''}`}</div>
              <div className="doctors-tab-meta">{d.specialty || d.primarySpecialty || 'General'}</div>
            </button>
          ))}
        </div>

        <div className="doctors-tab-content">
          {doctors.filter((d) => d.id === activeTab).map((d) => (
            <div key={d.id} className="doctor-details">
              <div className="doctor-main">
                <div>
                  <h2>Dr. {d.fullName || `${d.firstName || ''} ${d.lastName || ''}`}</h2>
                  <div className="doctor-specialty">{d.specialty || d.primarySpecialty || 'General'}</div>
                  {d.qualifications && <div className="doctor-quals">{d.qualifications}</div>}
                  {d.bio && <p className="doctor-bio">{d.bio}</p>}
                  <div className="doctor-contact">{d.clinicAddress || d.contact || ''}</div>
                  <div className="doctor-emails">
                    <strong>Email:</strong>{' '}
                    {d.email || d.contactEmail || (Array.isArray(d.emails) ? d.emails.join(', ') : (d.emails || '—'))}
                  </div>
                  <div className="doctor-fee">
                    <strong>Consultation fee:</strong>{' '}
                    {typeof d.consultationFee !== 'undefined' ? (d.consultationFee) : (d.fee ?? '—')}
                  </div>
                </div>
                <div className="doctor-actions">
                  <button className="hc-btn hc-btn--ghost" onClick={() => showSlots(d)}>Show available slots</button>
                </div>
              </div>

              <div className="doctor-slots">
                {slotsLoading && <div>Loading slots…</div>}
                {!slotsLoading && slots.length === 0 && <div>No available slots.</div>}
                {!slotsLoading && slots.length > 0 && (() => {
                  const grouped = slots.reduce((acc, s) => {
                    const dateKey = String(s).split('T')[0];
                    acc[dateKey] = acc[dateKey] || [];
                    acc[dateKey].push(s);
                    return acc;
                  }, {});
                  const dates = Object.keys(grouped).sort();
                  return dates.map((dateKey) => (
                    <div key={dateKey} className="slots-day">
                      <div className="slots-day-title">{dateKey}</div>
                      <div className="slots-grid">
                        {grouped[dateKey].map((s) => (
                          <button key={s} className="slot-pill" onClick={() => openBooking(d, s)}>
                            {new Date(s).toLocaleTimeString()}
                          </button>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {bookingModal.open && (
        <div className="booking-overlay">
          <div className="booking-modal">
            {bookingModal.step === 1 && (
              <div>
                <h2>Confirm appointment with Dr. {bookingModal.doctor?.fullName || bookingModal.doctor?.name}</h2>
                <p>Slot: {new Date(bookingModal.slot).toLocaleString()}</p>
                <div className="booking-form">
                  <label>Full name</label>
                  <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
                  <label>Phone</label>
                  <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                  <label>Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                  <label>Symptoms</label>
                  <textarea value={form.symptoms} onChange={(e) => setForm((f) => ({ ...f, symptoms: e.target.value }))} />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="hc-btn hc-btn--ghost" onClick={closeBooking}>Cancel</button>
                    <button className="hc-btn hc-btn--primary" onClick={submitBooking}>Proceed to Payment</button>
                  </div>
                </div>
              </div>
            )}

            {bookingModal.step === 2 && (
              <div>
                <h2>Payment for Appointment</h2>
                <p>Complete payment to confirm your appointment.</p>
                <div style={{ marginTop: '1rem' }}>
                  <StripePayment
                    appointmentId={bookingModal.appointmentId}
                    amount={bookingModal.appointmentId ? 'Pay' : 'Pay'}
                    clientSecret={bookingModal.clientSecret}
                    onSuccess={onPaymentSuccess}
                    onError={(e) => alert('Payment failed: ' + e)}
                  />
                  <div style={{ marginTop: '0.8rem' }}>
                    <button className="hc-btn hc-btn--ghost" onClick={closeBooking}>Close</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorShowcasePage;

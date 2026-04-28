import React from 'react';
import { useOutletContext } from 'react-router-dom';
import PatientAppointments from '../../components/patient/PatientAppointments';
import BookAppointment from '../../components/patient/BookAppointment';
import AISymptomCheckerChatbot from '../../components/patient/AISymptomCheckerChatbot';
import './PatientAppointmentsBookPage.css';

const PatientAppointmentsBookPage = () => {
  const { patientId, profile } = useOutletContext();
  // read optional prefill query params from AI quick-book action
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const specialty = params.get('prefillSpecialty');
      const doctorName = params.get('prefillDoctorName');
      const doctorId = params.get('prefillDoctorId');
      if (specialty || doctorName || doctorId) {
        const target = document.getElementById('quick-booking-section');
        if (target) {
          setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
        }
        // Pass params through global state by attaching to window so BookAppointment can pick them up on mount
        window.__PREFILL_BOOKING__ = { specialty, doctorName, doctorId };
      }
    } catch (e) {
      // ignore
    }
  }, []);

  return (
    <div className="appointments-theme">
      <header className="appointments-theme-head">
        <div>
          <h1>Your Appointments</h1>
          <p>Manage your clinical visits and digital sessions.</p>
        </div>
        <button
          type="button"
          className="appointments-theme-cta"
          onClick={() => {
            // Redirect to the doctors showcase page where booking now lives
            window.location.href = '/doctors';
          }}
        >
          Book New Appointment
        </button>
      </header>

      <div className="appointments-theme-layout">
        <section className="appointments-theme-main" data-fade-card="left">
          <PatientAppointments patientId={patientId} />
        </section>

        <aside className="appointments-theme-side" data-fade-card="right">
          <div id="quick-booking-section">
            <BookAppointment patientId={patientId} profile={profile} />
          </div>
          <div className="appointments-chat-wrap">
            <AISymptomCheckerChatbot />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PatientAppointmentsBookPage;

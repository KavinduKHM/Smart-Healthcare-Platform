import React from 'react';
import { useOutletContext } from 'react-router-dom';
import PatientAppointments from '../../components/patient/PatientAppointments';
import AISymptomCheckerChatbot from '../../components/patient/AISymptomCheckerChatbot';
import './PatientAppointmentsBookPage.css';

const PatientAppointmentsPage = () => {
  const { patientId } = useOutletContext();

  return (
    <div className="appointments-theme">
      <header className="appointments-theme-head">
        <div>
          <h1>Your Appointments</h1>
          <p>Manage your clinical visits and digital sessions.</p>
        </div>
      </header>

      <div className="appointments-theme-layout">
        <section className="appointments-theme-main" data-fade-card="left">
          <PatientAppointments patientId={patientId} />
        </section>

        <aside className="appointments-theme-side" data-fade-card="right">
          <div className="appointments-chat-wrap">
            <AISymptomCheckerChatbot />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PatientAppointmentsPage;

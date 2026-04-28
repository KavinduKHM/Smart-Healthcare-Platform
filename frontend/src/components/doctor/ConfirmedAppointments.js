// src/components/doctor/ConfirmedAppointments.js
import React, { useEffect, useState } from 'react';
import { getDoctorAppointments } from '../../services/appointmentService';
import { getPatientMedicalHistory, getPatientDocuments } from '../../services/patientService';
import { PATIENT_API } from '../../services/api';

// Use fetch with the stored auth token to open protected files in a new tab
const openDocumentInNewTab = async (doc) => {
  try {
    const url = doc.fileUrl || doc.url || doc.downloadUrl || '';
    if (!url) throw new Error('No file URL available');

    // Use the configured axios instance so the Authorization header interceptor is applied
    const response = await PATIENT_API.get(url, { responseType: 'blob' });
    const blob = response.data;
    const blobUrl = window.URL.createObjectURL(blob);
    window.open(blobUrl, '_blank', 'noopener');
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
  } catch (err) {
    console.error('openDocumentInNewTab error', err);
    // If 401, likely missing/invalid token. Try opening the URL directly as a fallback.
    if (doc.fileUrl) window.open(doc.fileUrl, '_blank', 'noopener');
    else alert('Unable to open document');
  }
};

const ConfirmedAppointments = ({ doctorId }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patientInfo, setPatientInfo] = useState({
    open: false,
    loading: false,
    patientId: null,
    patientName: '',
    history: [],
    documents: [],
    error: ''
  });

  const loadConfirmed = async () => {
    try {
      const res = await getDoctorAppointments(doctorId, 0, 100);
      const data = res?.data;
      const list = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
      const confirmed = list.filter((apt) => String(apt.status).toUpperCase() === 'CONFIRMED');
      confirmed.sort((a, b) => new Date(a.appointmentTime) - new Date(b.appointmentTime));
      setAppointments(confirmed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfirmed();
  }, [doctorId]);

  const openPatientInfo = async (apt) => {
    if (!apt?.patientId) return;
    setPatientInfo({
      open: true,
      loading: true,
      patientId: apt.patientId,
      patientName: apt.patientName || '',
      history: [],
      documents: [],
      error: ''
    });
    try {
      const [historyRes, docsRes] = await Promise.all([
        getPatientMedicalHistory(apt.patientId),
        getPatientDocuments(apt.patientId)
      ]);
      const history = Array.isArray(historyRes?.data) ? historyRes.data : [];
      const documents = Array.isArray(docsRes?.data) ? docsRes.data : [];
      setPatientInfo((prev) => ({ ...prev, history, documents }));
    } catch (err) {
      console.error(err);
      setPatientInfo((prev) => ({ ...prev, error: 'Unable to load patient history or documents.' }));
    } finally {
      setPatientInfo((prev) => ({ ...prev, loading: false }));
    }
  };

  const closePatientInfo = () => {
    setPatientInfo({
      open: false,
      loading: false,
      patientId: null,
      patientName: '',
      history: [],
      documents: [],
      error: ''
    });
  };

  if (loading) return <p className="doctor-empty">Loading confirmed appointments...</p>;

  return (
    <div className="doctor-ui-card doctor-confirmed">
      <div className="doctor-ui-card-header">
        <div>
          <h2 className="doctor-ui-card-title">Confirmed Appointments</h2>
          <p className="doctor-ui-card-subtitle">Appointments that are confirmed and ready to consult.</p>
        </div>
      </div>

      {appointments.length === 0 ? (
        <p className="doctor-empty">No confirmed appointments.</p>
      ) : (
        <div className="doctor-requests-stack">
          {appointments.map((apt) => (
            <article key={apt.id} className="doctor-request-card">
              <span className="doctor-request-status">{apt.status}</span>
              <p className="doctor-request-meta"><strong>Patient:</strong> {apt.patientName} (ID: {apt.patientId})</p>
              <p className="doctor-request-meta"><strong>Time:</strong> {new Date(apt.appointmentTime).toLocaleString()}</p>
              <p className="doctor-request-meta"><strong>Symptoms:</strong> {apt.symptoms || 'Not provided'}</p>
              {apt.notes && <p className="doctor-request-meta"><strong>Notes:</strong> {apt.notes}</p>}
              {apt.paymentStatus && (
                <p className="doctor-request-meta"><strong>Payment:</strong> {apt.paymentStatus}</p>
              )}
              <div className="doctor-action-row">
                <button
                  type="button"
                  className="doctor-ui-btn doctor-ui-btn-secondary"
                  onClick={() => openPatientInfo(apt)}
                >
                  View Patient History & Documents
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {patientInfo.open && (
        <div className="doctor-modal-overlay" role="dialog" aria-modal="true">
          <div className="doctor-modal">
            <div className="doctor-modal-head">
              <div>
                <h3>Patient Details</h3>
                <p className="doctor-modal-sub">
                  {patientInfo.patientName || 'Patient'} (ID: {patientInfo.patientId})
                </p>
              </div>
              <button type="button" className="doctor-ui-btn doctor-ui-btn-secondary" onClick={closePatientInfo}>Close</button>
            </div>

            {patientInfo.loading && <p className="doctor-empty">Loading patient data...</p>}
            {!patientInfo.loading && patientInfo.error && <p className="doctor-empty">{patientInfo.error}</p>}

            {!patientInfo.loading && !patientInfo.error && (
              <div className="doctor-modal-content">
                <section>
                  <h4 className="doctor-modal-title">Medical History</h4>
                  {patientInfo.history.length === 0 ? (
                    <p className="doctor-empty">No medical history records.</p>
                  ) : (
                    <div className="doctor-modal-list">
                      {patientInfo.history.map((h) => (
                        <article key={h.id} className="doctor-modal-item">
                          <div className="doctor-modal-item-title">{h.title || 'Untitled'}</div>
                          <div className="doctor-modal-item-meta">
                            {(h.historyType || 'N/A').replaceAll('_', ' ')} • {h.eventDate || 'No date'}
                          </div>
                          <div className="doctor-modal-item-desc">{h.description || 'No description provided.'}</div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <h4 className="doctor-modal-title">Medical Documents</h4>
                  {patientInfo.documents.length === 0 ? (
                    <p className="doctor-empty">No documents uploaded.</p>
                  ) : (
                    <div className="doctor-modal-list">
                      {patientInfo.documents.map((doc) => (
                        <article key={doc.id} className="doctor-modal-item">
                          <div className="doctor-modal-item-title">
                            {doc.fileUrl ? (
                              <button
                                type="button"
                                className="doctor-link-btn"
                                onClick={() => openDocumentInNewTab(doc)}
                              >
                                {doc.fileName || 'Document'}
                              </button>
                            ) : (doc.fileName || 'Document')}
                          </div>
                          <div className="doctor-modal-item-meta">
                            {(doc.documentType || 'OTHER').replaceAll('_', ' ')}
                          </div>
                          <div className="doctor-modal-item-desc">{doc.description || 'No description provided.'}</div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmedAppointments;

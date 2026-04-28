// src/components/patient/PatientAppointments.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createPaymentIntentForAppointment,
  getAppointmentsForPatient,
  submitAppointmentReview
} from '../../services/appointmentService';
import { getDoctorProfile } from '../../services/doctorService';
import { getSessionsByAppointment } from '../../services/telemedicineService';
import StripePayment from '../common/StripePayment';
import SockJS from 'sockjs-client';
import { Client as StompClient } from '@stomp/stompjs';

const wsUrl = 'http://localhost:8085/ws';

const PatientAppointments = ({ patientId }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [doctorNameById, setDoctorNameById] = useState({});
  const [sessionActiveByAppointmentId, setSessionActiveByAppointmentId] = useState({});
  const [sessionAlert, setSessionAlert] = useState(null);

  const [openReviewAppointmentId, setOpenReviewAppointmentId] = useState(null);
  const [reviewDraftByAppointmentId, setReviewDraftByAppointmentId] = useState({});
  const [submittedReviewByAppointmentId, setSubmittedReviewByAppointmentId] = useState({});
  const [reviewSubmittingAppointmentId, setReviewSubmittingAppointmentId] = useState(null);
  const [reviewError, setReviewError] = useState('');
  const [payTarget, setPayTarget] = useState(null);
  const [payClientSecret, setPayClientSecret] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payLoadingAppointmentId, setPayLoadingAppointmentId] = useState(null);
  const [payError, setPayError] = useState('');

  const stompRef = useRef(null);
  const subscriptionsRef = useRef(new Map());

  useEffect(() => {
    if (!patientId) return;

    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getAppointmentsForPatient(patientId, 0, 50);
        if (!isMounted) return;
        const payload = res?.data;
        const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.content) ? payload.content : []);
        setAppointments(list);
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        setError('Failed to load appointments');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [patientId]);

  const refreshAppointments = async () => {
    if (!patientId) return;
    try {
      const res = await getAppointmentsForPatient(patientId, 0, 50);
      const payload = res?.data;
      const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.content) ? payload.content : []);
      setAppointments(list);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePayNow = async (apt) => {
    const appointmentId = Number(apt?.id);
    if (!Number.isFinite(appointmentId)) return;

    setPayError('');
    setPayLoadingAppointmentId(appointmentId);
    setPayLoading(true);
    try {
      const res = await createPaymentIntentForAppointment(appointmentId);
      const data = res?.data || {};
      const secret = String(data?.clientSecret || '').trim();
      if (!secret) {
        setPayError('Unable to initialize payment for this appointment.');
        return;
      }

      setPayTarget(apt);
      setPayClientSecret(secret);
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      const backendMessage = err?.response?.data?.message || err?.response?.data?.error;
      setPayError(backendMessage || (status ? `Failed to initialize payment (${status})` : 'Failed to initialize payment'));
    } finally {
      setPayLoading(false);
      setPayLoadingAppointmentId(null);
    }
  };

  // Resolve doctor display names for appointments that only contain IDs / placeholders.
  useEffect(() => {
    const list = Array.isArray(appointments) ? appointments : [];
    const doctorIds = Array.from(
      new Set(
        list
          .map((apt) => apt?.doctorId)
          .filter((id) => id !== null && id !== undefined)
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id))
      )
    );

    const missing = doctorIds.filter((id) => !doctorNameById[id]);
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            try {
              const res = await getDoctorProfile(id);
              const data = res?.data;
              const name =
                (data?.fullName && String(data.fullName).trim()) ||
                [data?.firstName, data?.lastName].filter(Boolean).join(' ').trim() ||
                null;
              return [id, name];
            } catch {
              return [id, null];
            }
          })
        );

        if (cancelled) return;
        setDoctorNameById((prev) => {
          const next = { ...prev };
          for (const [id, name] of results) {
            if (name) next[id] = name;
          }
          return next;
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appointments, doctorNameById]);

  // Load telemedicine session status for confirmed appointments.
  useEffect(() => {
    const confirmedAppointments = (Array.isArray(appointments) ? appointments : []).filter(
      (apt) => String(apt?.status || '').toUpperCase() === 'CONFIRMED'
    );

    const apptIds = confirmedAppointments
      .map((apt) => Number(apt?.id))
      .filter((id) => Number.isFinite(id));

    if (apptIds.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          apptIds.map(async (appointmentId) => {
            try {
              const res = await getSessionsByAppointment(appointmentId);
              const sessions = Array.isArray(res?.data) ? res.data : [];
              const active = sessions.some((s) => String(s?.status || '').toUpperCase() === 'ACTIVE');
              const channelName = sessions?.[0]?.channelName;
              return { appointmentId, active, channelName };
            } catch {
              return { appointmentId, active: false, channelName: null };
            }
          })
        );

        if (cancelled) return;

        setSessionActiveByAppointmentId((prev) => {
          const next = { ...prev };
          for (const r of results) {
            next[r.appointmentId] = Boolean(r.active);
          }
          return next;
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appointments]);

  // Live updates: listen for "doctor started session" websocket events.
  useEffect(() => {
    const confirmedAppointments = (Array.isArray(appointments) ? appointments : []).filter(
      (apt) => String(apt?.status || '').toUpperCase() === 'CONFIRMED'
    );
    if (confirmedAppointments.length === 0) return;

    const activeSubscriptions = subscriptionsRef.current;

    const client = new StompClient({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 1500,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        // Subscribe once per channel
        confirmedAppointments.forEach((apt) => {
          const channelName = `appointment_${apt.id}`;
          const topic = `/topic/video.session.${channelName}`;
          if (activeSubscriptions.has(topic)) return;

          const sub = client.subscribe(topic, (frame) => {
            try {
              const payload = JSON.parse(frame.body);
              if (payload?.type !== 'SESSION_STARTED') return;

              setSessionActiveByAppointmentId((prev) => ({
                ...prev,
                [Number(apt.id)]: true,
              }));

              const dId = apt?.doctorId;
              const resolvedDoctor =
                (dId != null && doctorNameById?.[Number(dId)]) ||
                (apt?.doctorName && String(apt.doctorName).trim()) ||
                'Doctor';

              setSessionAlert({
                appointmentId: apt.id,
                message: `${resolvedDoctor} has joined the video session. You can join now.`,
              });
            } catch {
              // ignore
            }
          });

          activeSubscriptions.set(topic, sub);
        });
      },
    });

    stompRef.current = client;
    client.activate();

    return () => {
      try {
        activeSubscriptions.forEach((sub) => {
          try {
            sub?.unsubscribe?.();
          } catch {
            // ignore
          }
        });
        activeSubscriptions.clear();
      } catch {
        // ignore
      }

      try {
        client.deactivate();
      } catch {
        // ignore
      }
      stompRef.current = null;
    };
  }, [appointments, doctorNameById]);

  const { pending, confirmed, completed, other } = useMemo(() => {
    const list = Array.isArray(appointments) ? appointments : [];

    const pendingList = [];
    const confirmedList = [];
    const completedList = [];
    const otherList = [];

    for (const apt of list) {
      const status = String(apt.status).toUpperCase();
      if (status === 'CONFIRMED') {
        confirmedList.push(apt);
      } else if (status === 'COMPLETED') {
        completedList.push(apt);
      } else if (status === 'PENDING' || status === 'PENDING_PAYMENT' || status === 'RESCHEDULED') {
        pendingList.push(apt);
      } else {
        otherList.push(apt);
      }
    }

    return {
      pending: pendingList,
      confirmed: confirmedList,
      completed: completedList,
      other: otherList,
    };
  }, [appointments]);

  const joinVideo = (apt) => {
    const channelName = `appointment_${apt.id}`;
    const url = `/video-call/${encodeURIComponent(channelName)}/${encodeURIComponent(patientId)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderAppointmentCard = (apt, category) => {
    const doctorId = apt?.doctorId;
    const resolvedDoctorName =
      (doctorId != null && doctorNameById?.[Number(doctorId)]) ||
      (apt?.doctorName && String(apt.doctorName).trim()) ||
      (doctorId != null ? `Doctor ${doctorId}` : 'Doctor');

    const doctorName = resolvedDoctorName.replace(/^Dr\.?\s+/i, '');
    const specialty = apt.doctorSpecialty || apt.specialty || 'Specialist';
    const timeLabel = apt.appointmentTime ? new Date(apt.appointmentTime).toLocaleString() : '—';

    const apptId = Number(apt?.id);
    const sessionActive = Number.isFinite(apptId) ? Boolean(sessionActiveByAppointmentId?.[apptId]) : false;
    const joinDisabled = category === 'confirmed' ? !sessionActive : false;

    const existingSubmitted = Number.isFinite(apptId) && Number.isFinite(Number(apt?.rating)) && Number(apt.rating) >= 1 && Number(apt.rating) <= 5
      ? {
          rating: Number(apt.rating),
          review: String(apt?.reviewText || ''),
          createdAt: apt?.reviewCreatedAt || null,
        }
      : null;
    const submitted = Number.isFinite(apptId) ? (existingSubmitted || submittedReviewByAppointmentId?.[apptId]) : null;
    const draft = Number.isFinite(apptId)
      ? (reviewDraftByAppointmentId?.[apptId] ?? { rating: 0, review: '' })
      : { rating: 0, review: '' };

    const isReviewOpen = Number.isFinite(apptId) && openReviewAppointmentId === apptId;

    const setDraft = (patch) => {
      if (!Number.isFinite(apptId)) return;
      setReviewDraftByAppointmentId((prev) => ({
        ...prev,
        [apptId]: {
          rating: Number(prev?.[apptId]?.rating ?? 0),
          review: String(prev?.[apptId]?.review ?? ''),
          ...patch,
        },
      }));
    };

    const submitReview = async () => {
      if (!Number.isFinite(apptId)) return;
      const rating = Number(draft?.rating ?? 0);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        alert('Please choose a rating (1–5).');
        return;
      }

      setReviewError('');
      setReviewSubmittingAppointmentId(apptId);

      try {
        const payload = {
          patientId: Number(patientId),
          rating,
          reviewText: String(draft?.review ?? '').trim(),
        };

        const response = await submitAppointmentReview(apptId, payload);
        const updated = response?.data || {};

        setAppointments((prev) => prev.map((item) => (
          Number(item?.id) === apptId
            ? {
                ...item,
                rating: updated?.rating ?? rating,
                reviewText: updated?.reviewText ?? payload.reviewText,
                reviewCreatedAt: updated?.reviewCreatedAt ?? new Date().toISOString(),
              }
            : item
        )));

        setSubmittedReviewByAppointmentId((prev) => ({
          ...prev,
          [apptId]: {
            rating: updated?.rating ?? rating,
            review: updated?.reviewText ?? payload.reviewText,
            createdAt: updated?.reviewCreatedAt ?? new Date().toISOString(),
          },
        }));

        setOpenReviewAppointmentId(null);
        setSessionAlert({
          appointmentId: apt.id,
          message: 'Review submitted successfully.',
        });
      } catch (err) {
        const message = err?.response?.data?.message || err?.response?.data?.error || 'Failed to submit review';
        setReviewError(message);
      } finally {
        setReviewSubmittingAppointmentId(null);
      }
    };

    return (
      <article key={apt.id} className="apt-card">
        <div className="apt-avatar" aria-hidden="true">{doctorName.charAt(0).toUpperCase()}</div>
        <div className="apt-content">
          <h4>{`Dr. ${doctorName}`}</h4>
          <p className="apt-specialty">{specialty}</p>
          <p className="apt-time">{timeLabel}</p>
        </div>
        <div className="apt-actions">
          <span className={`apt-badge apt-badge-${category}`}>{String(apt.status || '').replace('_', ' ') || category}</span>
          {category === 'confirmed' ? (
            <div className="apt-action-stack">
              <button type="button" className="apt-join-btn" onClick={() => joinVideo(apt)} disabled={joinDisabled}>
                {joinDisabled ? 'Waiting for doctor' : 'Join Video Session'}
              </button>
            </div>
          ) : null}
          {category === 'completed' ? (
            <div className="apt-action-stack">
              <button
                type="button"
                className="apt-review-btn"
                onClick={() => {
                  setReviewError('');
                  setOpenReviewAppointmentId(isReviewOpen ? null : apptId);
                }}
                disabled={Boolean(submitted)}
              >
                {submitted ? 'Review submitted' : (isReviewOpen ? 'Close review' : 'Leave a review')}
              </button>
            </div>
          ) : null}
          {category === 'pending' && String(apt?.status || '').toUpperCase() === 'PENDING_PAYMENT' ? (
            <div className="apt-action-stack">
              <button
                type="button"
                className="apt-join-btn"
                onClick={() => handlePayNow(apt)}
                disabled={payLoading}
              >
                {payLoading && Number(payLoadingAppointmentId) === Number(apt?.id) ? 'Preparing payment...' : 'Pay now'}
              </button>
            </div>
          ) : null}
        </div>

        {category === 'completed' && isReviewOpen && !submitted ? (
          <div className="apt-review" aria-label="Submit review">
            <div className="apt-review-head">
              <strong>Rate your consultation</strong>
              <span className="apt-review-hint">Saved to your appointment history</span>
            </div>

            <div className="apt-review-stars" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={`apt-star ${Number(draft.rating) >= n ? 'apt-star-on' : ''}`}>
                  <input
                    type="radio"
                    name={`rating-${apptId}`}
                    value={n}
                    checked={Number(draft.rating) === n}
                    onChange={() => setDraft({ rating: n })}
                  />
                  <span aria-hidden="true">★</span>
                  <span className="apt-star-sr">{n}</span>
                </label>
              ))}
            </div>

            <textarea
              className="apt-review-text"
              value={draft.review}
              onChange={(e) => setDraft({ review: e.target.value })}
              placeholder="Write a short review (optional)…"
              rows={3}
            />

            <div className="apt-review-actions">
              <button type="button" onClick={submitReview} disabled={reviewSubmittingAppointmentId === apptId}>
                {reviewSubmittingAppointmentId === apptId ? 'Submitting...' : 'Submit review'}
              </button>
              <button type="button" className="apt-review-secondary" onClick={() => setOpenReviewAppointmentId(null)}>
                Cancel
              </button>
            </div>

            {reviewError ? <p className="appointments-error">{reviewError}</p> : null}
          </div>
        ) : null}
      </article>
    );
  };

  return (
    <div className="appointments-board">
      <h2 className="appointments-board-title">Appointments Timeline</h2>

      {sessionAlert ? (
        <div className="apt-session-alert" role="alert">
          <strong>Video session update:</strong> {sessionAlert.message}
        </div>
      ) : null}

      {payError ? (
        <p className="appointments-error">{payError}</p>
      ) : null}

      {reviewError && !openReviewAppointmentId ? (
        <p className="appointments-error">{reviewError}</p>
      ) : null}

      {payTarget && payClientSecret ? (
        <div className="quick-booking-payment" style={{ marginBottom: '1rem' }}>
          <h4>Complete Payment</h4>
          <p>Appointment ID: {payTarget.id}</p>
          <StripePayment
            appointmentId={payTarget.id}
            amount={'Amount due'}
            clientSecret={payClientSecret}
            onSuccess={async () => {
              setSessionAlert({
                appointmentId: payTarget.id,
                message: 'Payment successful. Appointment confirmed.',
              });
              setPayTarget(null);
              setPayClientSecret('');
              setPayError('');
              await refreshAppointments();
            }}
            onError={(err) => {
              setPayError(`Payment failed: ${err}`);
            }}
          />
          <button
            type="button"
            className="apt-review-secondary"
            style={{ marginTop: '0.75rem' }}
            onClick={() => {
              setPayTarget(null);
              setPayClientSecret('');
            }}
          >
            Cancel
          </button>
        </div>
      ) : null}

      {loading && <p className="appointments-empty">Loading appointments...</p>}
      {error && <p className="appointments-error">{error}</p>}

      {!loading && !error && appointments.length === 0 && (
        <p className="appointments-empty">No upcoming appointments.</p>
      )}

      {!loading && !error && appointments.length > 0 && pending.length === 0 && confirmed.length === 0 && completed.length === 0 && (
        <p className="appointments-empty">No pending, confirmed, or completed appointments.</p>
      )}

      {pending.length > 0 && (
        <div className="appointments-group">
          <h3 className="appointments-group-title appointments-group-title-pending">Pending</h3>
          <div className="appointments-stack">
            {pending.map((apt) => renderAppointmentCard(apt, 'pending'))}
          </div>
        </div>
      )}

      {confirmed.length > 0 && (
        <div className="appointments-group">
          <h3 className="appointments-group-title appointments-group-title-confirmed">Confirmed</h3>
          <div className="appointments-stack">
            {confirmed.map((apt) => renderAppointmentCard(apt, 'confirmed'))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div className="appointments-group">
          <h3 className="appointments-group-title appointments-group-title-other">Completed</h3>
          <div className="appointments-stack">
            {completed.map((apt) => renderAppointmentCard(apt, 'completed'))}
          </div>
        </div>
      )}

      {other.length > 0 && (
        <div className="appointments-group">
          <h3 className="appointments-group-title appointments-group-title-other">Other</h3>
          <div className="appointments-stack">
            {other.map((apt) => renderAppointmentCard(apt, 'other'))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientAppointments;

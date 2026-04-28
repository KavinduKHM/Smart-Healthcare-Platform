// src/services/appointmentService.js
import { APPOINTMENT_API } from './api';

// ========== Patient-facing functions ==========
export const searchDoctors = (specialty, date) =>
  APPOINTMENT_API.get('/doctors/search', {
    params: {
      specialty,
      date: date || undefined,
    },
  });

export const getAvailableSlots = (doctorId, date) => {
  // Default to today's date at start of day if no date provided
  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}T00:00:00`;
  };

  const dateParam = date || formatDate(new Date());
  return APPOINTMENT_API.get(`/doctors/${doctorId}/slots?date=${encodeURIComponent(dateParam)}`);
};

export const bookAppointment = (appointmentData) => 
  APPOINTMENT_API.post('', appointmentData);

export const getUpcomingAppointmentsForPatient = (patientId) =>
  APPOINTMENT_API.get(`/patient/${patientId}/upcoming`);

export const getAppointmentsForPatient = (patientId, page = 0, size = 50) =>
  APPOINTMENT_API.get(`/patient/${patientId}?page=${page}&size=${size}`);

export const createPaymentIntentForAppointment = (appointmentId) =>
  APPOINTMENT_API.post(`/${appointmentId}/payment-intent`);

export const submitAppointmentReview = (appointmentId, reviewData) =>
  APPOINTMENT_API.post(`/${appointmentId}/review`, reviewData);

export const getDoctorReviewAnalytics = () =>
  APPOINTMENT_API.get('/admin/reviews/analytics');

// ========== Doctor-facing functions ==========
export const getDoctorAppointments = (doctorId, page = 0, size = 20) => 
  APPOINTMENT_API.get(`/doctor/${doctorId}?page=${page}&size=${size}`);

export const getPendingAppointmentsForDoctor = (doctorId) => 
  APPOINTMENT_API.get(`/doctor/${doctorId}/pending`);

export const updateAppointmentStatus = (appointmentId, statusData) => 
  APPOINTMENT_API.patch(`/${appointmentId}/status`, statusData);

export const getUpcomingAppointmentsForDoctor = (doctorId) => 
  APPOINTMENT_API.get(`/doctor/${doctorId}/upcoming`);
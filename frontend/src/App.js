// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/common/Layout';
import HomePage from './pages/HomePage';
import VideoCallComponent from './components/telemedicine/VideoCall';
import PatientShell from './pages/patient/PatientShell';
import PatientRegister from './components/patient/PatientRegister';
import PatientAppointmentsBookPage from './pages/patient/PatientAppointmentsBookPage';
import PatientAppointmentsPage from './pages/patient/PatientAppointmentsPage';
import DoctorShowcasePage from './pages/DoctorShowcasePage';
import PatientPrescriptionsPage from './pages/patient/PatientPrescriptionsPage';
import PatientHistoryDocumentsPage from './pages/patient/PatientHistoryDocumentsPage';
import PatientProfilePage from './pages/patient/PatientProfilePage';
import DoctorShell from './pages/doctor/DoctorShell';
import DoctorAppointmentsPage from './pages/doctor/DoctorAppointmentsPage';
import DoctorPrescriptionsPage from './pages/doctor/DoctorPrescriptionsPage';
import DoctorProfilePage from './pages/doctor/DoctorProfilePage';
import DoctorRegistrationPage from './pages/doctor/DoctorRegistrationPage';
import AdminShell from './pages/admin/AdminShell';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagementPage from './pages/admin/UserManagement';
import AdminReviewsPage from './pages/admin/AdminReviewsPage';
import LoginPage from './pages/auth/LoginPage';
import ForbiddenPage from './pages/auth/ForbiddenPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RegisterPage from './pages/auth/RegisterPage';

const DoctorEntryRedirect = () => {
  const doctorId = String(localStorage.getItem('doctorId') || localStorage.getItem('elixra.doctorId') || '').trim();
  if (doctorId) {
    return <Navigate to={`/doctor/${encodeURIComponent(doctorId)}/appointments`} replace />;
  }
  return <Navigate to="/doctor/login" replace />;
};

const PatientEntryRedirect = () => {
  const patientId = String(
    localStorage.getItem('patientId') ||
    localStorage.getItem('elixra.patientId') ||
    localStorage.getItem('elixra.userId') ||
    ''
  ).trim();

  if (patientId) {
    return <Navigate to={`/patient/${encodeURIComponent(patientId)}/appointments`} replace />;
  }

  return <Navigate to="/patient/login" replace />;
};

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/patient/login" element={<LoginPage portal="patient" />} />
          <Route path="/doctor/login" element={<LoginPage portal="doctor" />} />
          <Route path="/admin/login" element={<LoginPage portal="admin" />} />

          <Route path="/patient/signup" element={<RegisterPage portal="patient" />} />
          <Route path="/doctor/signup" element={<RegisterPage portal="doctor" />} />
          <Route path="/admin/signup" element={<RegisterPage portal="admin" />} />

          <Route path="/forbidden" element={<ForbiddenPage />} />

          <Route path="/patient" element={<PatientEntryRedirect />} />
          <Route path="/patient/register" element={<PatientRegister />} />
          <Route
            path="/patient/:patientId"
            element={(
              <ProtectedRoute allowedRoles={["PATIENT", "ADMIN"]}>
                <PatientShell />
              </ProtectedRoute>
            )}
          >
            <Route index element={<Navigate to="appointments" replace />} />
            <Route path="appointments" element={<PatientAppointmentsPage />} />
            <Route path="prescriptions" element={<PatientPrescriptionsPage />} />
            <Route path="history-documents" element={<PatientHistoryDocumentsPage />} />
            <Route path="profile" element={<PatientProfilePage />} />
          </Route>

          <Route path="/doctor" element={<DoctorEntryRedirect />} />
          <Route path="/doctor/register" element={<DoctorRegistrationPage />} />
          <Route
            path="/doctor/:doctorId"
            element={(
              <ProtectedRoute allowedRoles={["DOCTOR", "ADMIN"]}>
                <DoctorShell />
              </ProtectedRoute>
            )}
          >
            <Route index element={<Navigate to="appointments" replace />} />
            <Route path="appointments" element={<DoctorAppointmentsPage />} />
            <Route path="prescriptions" element={<DoctorPrescriptionsPage />} />
            <Route path="profile" element={<DoctorProfilePage />} />
          </Route>

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminShell />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="user-management" element={<UserManagementPage />} />
            <Route path="reviews" element={<AdminReviewsPage />} />
          </Route>

          <Route path="/video-call/:channelName/:userAccount" element={<VideoCallComponent />} />
          <Route path="/doctors" element={<DoctorShowcasePage />} />
          <Route path="/" element={<HomePage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
package com.healthcare.appointment_service.repository;

public interface DoctorReviewAnalyticsProjection {
    Long getDoctorId();
    Long getReviewCount();
    Double getAverageRating();
}

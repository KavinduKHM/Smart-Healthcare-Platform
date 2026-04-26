package com.healthcare.appointment_service.repository;

public interface ReviewMonthlyTrendProjection {
    Integer getYear();
    Integer getMonth();
    Long getReviewCount();
    Double getAverageRating();
}

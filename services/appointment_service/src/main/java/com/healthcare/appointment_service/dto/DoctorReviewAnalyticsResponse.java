package com.healthcare.appointment_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorReviewAnalyticsResponse {

    private long totalReviews;
    private double overallAverageRating;
    private List<DoctorReviewMetric> doctors;
    private List<RatingDistributionItem> ratingDistribution;
    private List<MonthlyReviewTrendItem> monthlyTrend;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DoctorReviewMetric {
        private Long doctorId;
        private String doctorName;
        private String doctorSpecialty;
        private long reviewCount;
        private double averageRating;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RatingDistributionItem {
        private int rating;
        private long count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyReviewTrendItem {
        private String month;
        private long reviewCount;
        private double averageRating;
    }
}

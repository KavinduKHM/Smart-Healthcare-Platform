package com.healthcare.patient_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorReviewUpsertRequest {
    private Long patientId;
    private Long doctorId;
    private String doctorName;
    private String doctorSpecialty;
    private Long appointmentId;
    private Integer rating;
    private String reviewText;
    private LocalDateTime reviewCreatedAt;
}

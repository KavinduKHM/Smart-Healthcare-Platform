package com.healthcare.appointment_service.client;

import com.healthcare.appointment_service.dto.PatientDTO;
import com.healthcare.appointment_service.dto.ReviewUpsertRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

/**
 * Feign client for calling Patient Service.
 */
@FeignClient(name = "patient-service", url = "http://patient-service:8082", fallback = PatientServiceClientFallback.class)
public interface PatientServiceClient {

    /**
     * Get patient by ID
     */
    @GetMapping("/api/patients/{id}")
    PatientDTO getPatientById(@PathVariable("id") Long id);

    @PostMapping("/api/patients/_internal/reviews")
    void upsertReview(@RequestBody ReviewUpsertRequest request);
}
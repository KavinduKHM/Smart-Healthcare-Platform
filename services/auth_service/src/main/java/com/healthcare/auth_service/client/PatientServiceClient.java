package com.healthcare.auth_service.client;

import com.healthcare.auth_service.dto.PatientRegistrationRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "patient-service", url = "${PATIENT_SERVICE_URL:http://patient-service:8082}")
public interface PatientServiceClient {
    @PostMapping("/api/patients/register")
    void registerPatient(@RequestBody PatientRegistrationRequest request);
}

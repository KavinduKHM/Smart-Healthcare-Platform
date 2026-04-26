package com.healthcare.auth_service.client;

import com.healthcare.auth_service.dto.DoctorRegistrationRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "doctor-service", url = "${DOCTOR_SERVICE_URL:http://doctor-service:8083}")
public interface DoctorServiceClient {
    @PostMapping("/api/doctors/register")
    void registerDoctor(@RequestBody DoctorRegistrationRequest request);
}

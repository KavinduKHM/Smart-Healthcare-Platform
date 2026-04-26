package com.healthcare.auth_service.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PatientRegistrationRequest {
    private Long userId;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
}

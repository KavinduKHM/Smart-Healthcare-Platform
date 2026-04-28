package com.healthcare.patient_service.repository;

import com.healthcare.patient_service.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByPatientId(Long patientId);
    List<Review> findByDoctorId(Long doctorId);
    default List<Review> findByPatientIdOrderByReviewCreatedAtDesc(Long patientId) {
        return findByPatientId(patientId);
    }
}

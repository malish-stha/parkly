package com.parking.payment.repository;

import com.parking.payment.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByStatusAndExpiresAtBefore(String status, LocalDateTime now);
    List<Booking> findByUserIdAndStatusIn(String userId, Collection<String> statuses);
    List<Booking> findByUserIdAndStatus(String userId, String status);
}

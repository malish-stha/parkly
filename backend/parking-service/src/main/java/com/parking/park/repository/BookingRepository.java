package com.parking.park.repository;

import com.parking.park.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByStatusAndEndTimeBefore(String status, LocalDateTime now);
    List<Booking> findByDriverIdAndStatusIn(String driverId, Collection<String> statuses);
    List<Booking> findByDriverIdAndStatus(String driverId, String status);
}

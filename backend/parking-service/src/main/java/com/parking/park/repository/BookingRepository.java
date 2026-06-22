package com.parking.park.repository;

import com.parking.park.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByStatusAndEndTimeBefore(String status, LocalDateTime now);
    List<Booking> findByDriverIdAndStatusIn(String driverId, Collection<String> statuses);
    List<Booking> findByDriverIdAndStatus(String driverId, String status);
    List<Booking> findByDriverIdOrderByCreatedAtDesc(String driverId);
    List<Booking> findByGarageIdInOrderByCreatedAtDesc(Collection<Long> garageIds);
    boolean existsByGarageIdAndStatusIn(Long garageId, Collection<String> statuses);

    List<Booking> findByStatusAndCreatedAtBefore(String status, LocalDateTime threshold);

    @Query("SELECT b FROM Booking b WHERE b.spotId = :spotId " +
           "AND (b.status = 'CONFIRMED' OR (b.status = 'PENDING_PAYMENT' AND b.createdAt > :lockThreshold)) " +
           "AND b.startTime < :endTime AND b.endTime > :startTime")
    List<Booking> findOverlappingBookings(
            @Param("spotId") Long spotId, 
            @Param("startTime") LocalDateTime startTime, 
            @Param("endTime") LocalDateTime endTime,
            @Param("lockThreshold") LocalDateTime lockThreshold);

    @Query("SELECT b FROM Booking b WHERE b.spotId IN :spotIds " +
           "AND (b.status = 'CONFIRMED' OR (b.status = 'PENDING_PAYMENT' AND b.createdAt > :lockThreshold)) " +
           "AND b.startTime < :endTime AND b.endTime > :startTime")
    List<Booking> findOverlappingBookingsForSpots(
            @Param("spotIds") List<Long> spotIds, 
            @Param("startTime") LocalDateTime startTime, 
            @Param("endTime") LocalDateTime endTime,
            @Param("lockThreshold") LocalDateTime lockThreshold);
}

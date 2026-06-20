package com.parking.payment.controller;

import com.parking.payment.model.Booking;
import com.parking.payment.repository.BookingRepository;
import com.parking.payment.service.BookingEventPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/bookings")
public class BookingController {
    private static final Logger log = LoggerFactory.getLogger(BookingController.class);

    private final BookingRepository bookingRepository;
    private final BookingEventPublisher eventPublisher;

    public BookingController(BookingRepository bookingRepository, BookingEventPublisher eventPublisher) {
        this.bookingRepository = bookingRepository;
        this.eventPublisher = eventPublisher;
    }

    @PostMapping("/{id}/confirm")
    @Transactional
    public ResponseEntity<?> confirmBooking(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        
        log.info("Confirming booking ID: {}", id);

        Booking booking = bookingRepository.findById(id).orElse(null);
        if (booking == null) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Booking not found.");
            return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
        }

        if (!"PENDING_PAYMENT".equals(booking.getStatus())) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Booking status is " + booking.getStatus() + ". Can only confirm PENDING_PAYMENT bookings.");
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }

        // Update status to CONFIRMED
        booking.setStatus("CONFIRMED");
        Booking savedBooking = bookingRepository.save(booking);

        // Publish confirm event to Kafka
        eventPublisher.publishReservationConfirmed(savedBooking.getId(), savedBooking.getSpotId(), savedBooking.getGarageId());
        log.info("Booking ID {} status updated to CONFIRMED and confirmation event published", savedBooking.getId());

        return ResponseEntity.ok(savedBooking);
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActiveBooking(
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "user_mock_driver_123") String userId) {
        
        log.info("Fetching active booking for user ID: {}", userId);

        List<Booking> activeBookings = bookingRepository.findByDriverIdAndStatusIn(userId, List.of("PENDING_PAYMENT", "CONFIRMED"));
        if (activeBookings.isEmpty()) {
            return ResponseEntity.ok(new HashMap<>()); // Return empty object if no active bookings
        }

        // Return the first/most recent active booking
        Booking active = activeBookings.get(activeBookings.size() - 1);
        return ResponseEntity.ok(active);
    }
}

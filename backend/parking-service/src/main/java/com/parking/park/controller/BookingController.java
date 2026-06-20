package com.parking.park.controller;

import com.parking.park.model.Booking;
import com.parking.park.model.ParkingSpot;
import com.parking.park.repository.BookingRepository;
import com.parking.park.repository.ParkingSpotRepository;
import com.parking.park.service.GarageService;
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
    private final ParkingSpotRepository spotRepository;
    private final GarageService garageService;

    public BookingController(BookingRepository bookingRepository,
                             ParkingSpotRepository spotRepository,
                             GarageService garageService) {
        this.bookingRepository = bookingRepository;
        this.spotRepository = spotRepository;
        this.garageService = garageService;
    }

    @PostMapping("/{id}/confirm")
    @Transactional
    public ResponseEntity<?> confirmBooking(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id") String userId) {
        
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

        // Direct transactional update to Spot Status in monolith
        ParkingSpot spot = spotRepository.findById(savedBooking.getSpotId()).orElse(null);
        if (spot != null) {
            spot.setStatus("RESERVED");
            spotRepository.save(spot);
            garageService.evictSearchCache();
            log.info("Booking ID {} status updated to CONFIRMED and spot status updated to RESERVED", savedBooking.getId());
        } else {
            log.error("ParkingSpot not found for ID: {}", savedBooking.getSpotId());
        }

        return ResponseEntity.ok(savedBooking);
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActiveBooking(
            @RequestHeader(value = "X-User-Id") String userId) {
        
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

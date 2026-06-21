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

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/spots")
public class ParkingSpotController {
    private static final Logger log = LoggerFactory.getLogger(ParkingSpotController.class);

    private final ParkingSpotRepository spotRepository;
    private final GarageService garageService;
    private final BookingRepository bookingRepository;

    public ParkingSpotController(ParkingSpotRepository spotRepository,
                                 GarageService garageService,
                                 BookingRepository bookingRepository) {
        this.spotRepository = spotRepository;
        this.garageService = garageService;
        this.bookingRepository = bookingRepository;
    }

    @PostMapping("/{id}/reserve")
    @Transactional
    public ResponseEntity<?> reserveSpot(
            @PathVariable Long id,
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime,
            @RequestHeader(value = "X-User-Id") String userId) {
        
        log.info("Driver {} requesting reservation for Spot ID {} between {} and {}", userId, id, startTime, endTime);

        // Parse requested dates
        LocalDateTime start = (startTime != null && !startTime.isEmpty()) 
                ? parseDateTime(startTime) 
                : LocalDateTime.now(java.time.ZoneOffset.UTC);
        LocalDateTime end = (endTime != null && !endTime.isEmpty()) 
                ? parseDateTime(endTime) 
                : start.plusHours(1);

        ParkingSpot spot = spotRepository.findByIdForUpdate(id).orElse(null);
        if (spot == null) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Parking spot not found.");
            return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
        }

        // Lock verification: query for conflicting overlapping bookings
        LocalDateTime lockThreshold = LocalDateTime.now(java.time.ZoneOffset.UTC).minusMinutes(15);
        List<Booking> conflicts = bookingRepository.findOverlappingBookings(id, start, end, lockThreshold);
        if (!conflicts.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "This spot is already reserved or booked for the selected time slot.");
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }

        // Lock spot: set current physical status to PENDING_PAYMENT
        spot.setStatus("PENDING_PAYMENT");
        spotRepository.save(spot);

        // Calculate payment lock expiration timestamp (15 minutes from now in UTC)
        LocalDateTime lockExpiresAt = LocalDateTime.now(java.time.ZoneOffset.UTC).plusMinutes(15);
        String expiresAtStr = lockExpiresAt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z";

        // Clear local garages nearby search cache
        garageService.evictSearchCache();

        // Save Booking directly in database with the requested slot times
        Booking booking = new Booking(
            userId,
            spot.getGarage().getId(),
            spot.getId(),
            spot.getGarage().getRatePerHour(),
            "PENDING_PAYMENT",
            start,
            end,
            LocalDateTime.now(java.time.ZoneOffset.UTC)
        );
        Booking savedBooking = bookingRepository.save(booking);
        log.info("Registered PENDING_PAYMENT booking directly. ID: {}, Spot ID: {}, Driver ID: {}", 
                 savedBooking.getId(), savedBooking.getSpotId(), savedBooking.getDriverId());

        // Return confirmation details
        Map<String, Object> response = new HashMap<>();
        response.put("bookingId", String.valueOf(savedBooking.getId()));
        response.put("spotId", spot.getId());
        response.put("spotNumber", spot.getSpotNumber());
        response.put("garageId", spot.getGarage().getId());
        response.put("garageName", spot.getGarage().getName());
        response.put("ratePerHour", spot.getGarage().getRatePerHour());
        response.put("expiresAt", expiresAtStr); // frontend countdown handles 15 min payment lock expiry

        return ResponseEntity.ok(response);
    }

    private LocalDateTime parseDateTime(String dtStr) {
        try {
            return java.time.Instant.parse(dtStr).atZone(java.time.ZoneOffset.UTC).toLocalDateTime();
        } catch (Exception e) {
            return LocalDateTime.parse(dtStr);
        }
    }
}

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
            @RequestHeader(value = "X-User-Id") String userId) {
        
        log.info("Driver {} requesting reservation for Spot ID {}", userId, id);
        
        ParkingSpot spot = spotRepository.findByIdForUpdate(id).orElse(null);
        if (spot == null) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Parking spot not found.");
            return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
        }

        if (!"AVAILABLE".equals(spot.getStatus())) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "This spot is already reserved or occupied.");
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }

        // Lock spot
        spot.setStatus("PENDING_PAYMENT");
        spotRepository.save(spot);

        // Calculate expiration timestamp (15 minutes from now in UTC)
        LocalDateTime expiresAt = LocalDateTime.now(java.time.ZoneOffset.UTC).plusMinutes(15);
        String expiresAtStr = expiresAt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z";

        // Clear local garages nearby search cache
        garageService.evictSearchCache();

        // Save Booking directly in monolith database
        Booking booking = new Booking(
            userId,
            spot.getGarage().getId(),
            spot.getId(),
            spot.getGarage().getRatePerHour(),
            "PENDING_PAYMENT",
            LocalDateTime.now(java.time.ZoneOffset.UTC),
            expiresAt,
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
        response.put("expiresAt", expiresAtStr);

        return ResponseEntity.ok(response);
    }
}

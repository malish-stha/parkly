package com.parking.park.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parking.park.event.ReservationCreatedEvent;
import com.parking.park.model.ParkingSpot;
import com.parking.park.repository.ParkingSpotRepository;
import com.parking.park.service.GarageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
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
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public ParkingSpotController(ParkingSpotRepository spotRepository,
                                GarageService garageService,
                                KafkaTemplate<String, String> kafkaTemplate,
                                ObjectMapper objectMapper) {
        this.spotRepository = spotRepository;
        this.garageService = garageService;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/{id}/reserve")
    @Transactional
    public ResponseEntity<?> reserveSpot(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "user_mock_driver_123") String userId) {
        
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

        // Publish ReservationCreatedEvent to Kafka topic 'reservation-events'
        try {
            ReservationCreatedEvent event = new ReservationCreatedEvent(
                spot.getId(),
                spot.getGarage().getId(),
                userId,
                spot.getGarage().getRatePerHour(),
                expiresAtStr
            );
            String message = objectMapper.writeValueAsString(event);
            log.info("Publishing ReservationCreatedEvent to topic 'reservation-events': {}", message);
            kafkaTemplate.send("reservation-events", String.valueOf(spot.getId()), message);
        } catch (Exception e) {
            log.error("Failed to publish ReservationCreatedEvent to Kafka. Rolling back reservation...", e);
            throw new RuntimeException("Kafka publishing failed", e);
        }

        // Return confirmation details
        Map<String, Object> response = new HashMap<>();
        response.put("spotId", spot.getId());
        response.put("spotNumber", spot.getSpotNumber());
        response.put("garageId", spot.getGarage().getId());
        response.put("garageName", spot.getGarage().getName());
        response.put("ratePerHour", spot.getGarage().getRatePerHour());
        response.put("expiresAt", expiresAtStr);

        return ResponseEntity.ok(response);
    }
}

package com.parking.park.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parking.park.model.ParkingSpot;
import com.parking.park.repository.ParkingSpotRepository;
import com.parking.park.service.GarageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BookingEventListener {
    private static final Logger log = LoggerFactory.getLogger(BookingEventListener.class);

    private final ParkingSpotRepository spotRepository;
    private final GarageService garageService;
    private final ObjectMapper objectMapper;

    public BookingEventListener(ParkingSpotRepository spotRepository, GarageService garageService, ObjectMapper objectMapper) {
        this.spotRepository = spotRepository;
        this.garageService = garageService;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "booking-events", groupId = "parking-group")
    @Transactional
    public void handleBookingEvent(String message) {
        try {
            log.info("Received booking event: {}", message);
            BookingEventPayload payload = objectMapper.readValue(message, BookingEventPayload.class);

            ParkingSpot spot = spotRepository.findById(payload.getSpotId()).orElse(null);
            if (spot == null) {
                log.error("ParkingSpot not found for ID: {}", payload.getSpotId());
                return;
            }

            String eventType = payload.getEventType();
            if ("EXPIRED".equals(eventType) || "CANCELLED".equals(eventType)) {
                log.info("Processing spot release. Spot ID: {}, Booking ID: {}, Event Type: {}", spot.getId(), payload.getBookingId(), eventType);
                if ("PENDING_PAYMENT".equals(spot.getStatus())) {
                    spot.setStatus("AVAILABLE");
                    spotRepository.save(spot);
                    garageService.evictSearchCache();
                    log.info("Spot ID {} released to AVAILABLE status", spot.getId());
                }
            } else if ("CONFIRMED".equals(eventType)) {
                log.info("Processing spot reservation confirmation. Spot ID: {}, Booking ID: {}", spot.getId(), payload.getBookingId());
                spot.setStatus("RESERVED");
                spotRepository.save(spot);
                garageService.evictSearchCache();
                log.info("Spot ID {} confirmed and set to RESERVED status", spot.getId());
            } else {
                log.warn("Unknown booking event type received: {}", eventType);
            }
        } catch (Exception e) {
            log.error("Failed to process booking event message: " + message, e);
        }
    }
}

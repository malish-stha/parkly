package com.parking.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class BookingEventPublisher {
    private static final Logger log = LoggerFactory.getLogger(BookingEventPublisher.class);

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public BookingEventPublisher(KafkaTemplate<String, String> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    public void publishReservationExpired(Long bookingId, Long spotId, Long garageId) {
        publishEvent("EXPIRED", bookingId, spotId, garageId);
    }

    public void publishReservationConfirmed(Long bookingId, Long spotId, Long garageId) {
        publishEvent("CONFIRMED", bookingId, spotId, garageId);
    }

    private void publishEvent(String eventType, Long bookingId, Long spotId, Long garageId) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("eventType", eventType);
            event.put("bookingId", bookingId);
            event.put("spotId", spotId);
            event.put("garageId", garageId);

            String message = objectMapper.writeValueAsString(event);
            log.info("Publishing event to topic 'booking-events': {}", message);
            kafkaTemplate.send("booking-events", String.valueOf(bookingId), message);
        } catch (Exception e) {
            log.error("Failed to publish booking event to Kafka: type=" + eventType, e);
        }
    }
}

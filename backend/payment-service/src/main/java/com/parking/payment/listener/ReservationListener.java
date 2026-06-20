package com.parking.payment.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parking.payment.model.Booking;
import com.parking.payment.repository.BookingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Component
public class ReservationListener {
    private static final Logger log = LoggerFactory.getLogger(ReservationListener.class);

    private final BookingRepository bookingRepository;
    private final ObjectMapper objectMapper;

    public ReservationListener(BookingRepository bookingRepository, ObjectMapper objectMapper) {
        this.bookingRepository = bookingRepository;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "reservation-events", groupId = "payment-group")
    @Transactional
    public void handleReservationCreated(String message) {
        try {
            log.info("Received reservation created event: {}", message);
            ReservationCreatedPayload payload = objectMapper.readValue(message, ReservationCreatedPayload.class);

            // Parse expiry date time in UTC format (supporting Z suffix)
            java.time.Instant instant = java.time.Instant.parse(payload.getExpiresAt());
            LocalDateTime expiresAt = LocalDateTime.ofInstant(instant, java.time.ZoneOffset.UTC);
            
            // Create a pending booking
            Booking booking = new Booking(
                payload.getUserId(),
                payload.getGarageId(),
                payload.getSpotId(),
                payload.getRatePerHour(),
                "PENDING",
                LocalDateTime.now(java.time.ZoneOffset.UTC),
                expiresAt
            );

            Booking savedBooking = bookingRepository.save(booking);
            log.info("Registered PENDING booking. ID: {}, Spot ID: {}, Driver ID: {}, Expires At: {}", 
                     savedBooking.getId(), savedBooking.getSpotId(), savedBooking.getUserId(), savedBooking.getExpiresAt());
        } catch (Exception e) {
            log.error("Failed to process reservation created message: " + message, e);
        }
    }
}

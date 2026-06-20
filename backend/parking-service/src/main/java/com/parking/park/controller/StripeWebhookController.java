package com.parking.park.controller;

import com.parking.park.model.Booking;
import com.parking.park.model.ParkingSpot;
import com.parking.park.repository.BookingRepository;
import com.parking.park.repository.ParkingSpotRepository;
import com.parking.park.service.GarageService;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/stripe")
public class StripeWebhookController {
    private static final Logger log = LoggerFactory.getLogger(StripeWebhookController.class);

    private final BookingRepository bookingRepository;
    private final ParkingSpotRepository spotRepository;
    private final GarageService garageService;

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    public StripeWebhookController(BookingRepository bookingRepository,
                                   ParkingSpotRepository spotRepository,
                                   GarageService garageService) {
        this.bookingRepository = bookingRepository;
        this.spotRepository = spotRepository;
        this.garageService = garageService;
    }

    @PostMapping("/webhook")
    @Transactional
    public ResponseEntity<?> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        log.info("Received Stripe webhook request");

        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (Exception e) {
            log.error("Stripe webhook signature verification failed: {}", e.getMessage());
            return new ResponseEntity<>("Signature verification failed: " + e.getMessage(), HttpStatus.BAD_REQUEST);
        }

        log.info("Stripe Webhook event verified successfully. Event type: {}", event.getType());

        if ("checkout.session.completed".equals(event.getType())) {
            Session session = (Session) event.getDataObjectDeserializer().getObject().orElse(null);
            if (session != null) {
                String bookingIdStr = session.getMetadata().get("bookingId");
                if (bookingIdStr != null) {
                    Long bookingId = Long.parseLong(bookingIdStr);
                    Booking booking = bookingRepository.findById(bookingId).orElse(null);
                    if (booking != null && "PENDING_PAYMENT".equals(booking.getStatus())) {
                        booking.setStatus("CONFIRMED");
                        bookingRepository.save(booking);

                        // Direct transactional update to Spot Status in monolith
                        ParkingSpot spot = spotRepository.findById(booking.getSpotId()).orElse(null);
                        if (spot != null) {
                            spot.setStatus("RESERVED");
                            spotRepository.save(spot);
                            garageService.evictSearchCache();
                            log.info("Stripe checkout completed for Booking ID {}. Spot ID {} marked as RESERVED.", bookingId, booking.getSpotId());
                        } else {
                            log.error("ParkingSpot not found for ID: {}", booking.getSpotId());
                        }
                    } else {
                        log.warn("Booking not found or not in PENDING_PAYMENT state for ID: {}", bookingIdStr);
                    }
                } else {
                    log.warn("Stripe Checkout Session missing bookingId in metadata");
                }
            }
        }

        return ResponseEntity.ok().build();
    }
}

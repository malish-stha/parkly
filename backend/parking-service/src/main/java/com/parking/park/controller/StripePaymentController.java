package com.parking.park.controller;

import com.parking.park.model.Booking;
import com.parking.park.repository.BookingRepository;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments/stripe")
public class StripePaymentController {
    private static final Logger log = LoggerFactory.getLogger(StripePaymentController.class);

    private final BookingRepository bookingRepository;

    @Value("${stripe.success-url:http://localhost:3000/search?success=true}")
    private String successUrl;

    @Value("${stripe.cancel-url:http://localhost:3000/search?cancelled=true}")
    private String cancelUrl;

    public StripePaymentController(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    @PostMapping("/checkout-session")
    public ResponseEntity<?> createCheckoutSession(
            @RequestParam Long bookingId,
            @RequestHeader(value = "X-User-Id") String userId) {

        log.info("Creating Stripe checkout session for Booking ID: {} (user: {})", bookingId, userId);

        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Booking not found.");
            return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
        }

        if (!"PENDING_PAYMENT".equals(booking.getStatus())) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Booking status is " + booking.getStatus() + ". Can only pay for PENDING_PAYMENT bookings.");
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }

        try {
            SessionCreateParams params = SessionCreateParams.builder()
                .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(successUrl + "&bookingId=" + bookingId)
                .setCancelUrl(cancelUrl)
                .addLineItem(
                    SessionCreateParams.LineItem.builder()
                        .setQuantity(1L)
                        .setPriceData(
                            SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency("npr")
                                .setUnitAmount((long) (booking.getBaseAmount() * 100))
                                .setProductData(
                                    SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName("Parkly Parking Spot Lock")
                                        .setDescription("Reservation for Spot ID " + booking.getSpotId() + " at Garage ID " + booking.getGarageId())
                                        .build()
                                )
                                .build()
                        )
                        .build()
                )
                .putMetadata("bookingId", String.valueOf(bookingId))
                .putMetadata("spotId", String.valueOf(booking.getSpotId()))
                .putMetadata("garageId", String.valueOf(booking.getGarageId()))
                .putMetadata("driverId", booking.getDriverId())
                .build();

            Session session = Session.create(params);
            
            Map<String, String> response = new HashMap<>();
            response.put("sessionId", session.getId());
            response.put("url", session.getUrl());
            
            log.info("Successfully created Stripe checkout session. Session ID: {}", session.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Stripe checkout session creation failed", e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "Stripe session creation failed: " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}

package com.parking.park.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.parking.park.model.Booking;
import com.parking.park.model.ParkingSpot;
import com.parking.park.repository.BookingRepository;
import com.parking.park.repository.ParkingSpotRepository;
import com.parking.park.service.GarageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments/esewa")
public class EsewaPaymentController {
    private static final Logger log = LoggerFactory.getLogger(EsewaPaymentController.class);

    private final BookingRepository bookingRepository;
    private final ParkingSpotRepository spotRepository;
    private final GarageService garageService;
    private final ObjectMapper objectMapper;

    @Value("${esewa.product-code}")
    private String productCode;

    @Value("${esewa.secret-key}")
    private String secretKey;

    @Value("${esewa.esewa-url}")
    private String esewaUrl;

    @Value("${esewa.status-url}")
    private String esewaStatusUrl;

    @Value("${esewa.success-url}")
    private String successUrl;

    @Value("${esewa.failure-url}")
    private String failureUrl;

    public EsewaPaymentController(BookingRepository bookingRepository,
                                  ParkingSpotRepository spotRepository,
                                  GarageService garageService,
                                  ObjectMapper objectMapper) {
        this.bookingRepository = bookingRepository;
        this.spotRepository = spotRepository;
        this.garageService = garageService;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/initiate")
    public ResponseEntity<?> initiatePayment(
            @RequestParam Long bookingId,
            @RequestHeader(value = "X-User-Id") String userId) {

        log.info("Initiating eSewa payment for Booking ID: {} (user: {})", bookingId, userId);

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
            // Format amount dynamically to avoid trailing .0 if integer
            String amountStr;
            double baseAmount = booking.getBaseAmount();
            if (baseAmount == (long) baseAmount) {
                amountStr = String.format("%d", (long) baseAmount);
            } else {
                amountStr = String.format("%.2f", baseAmount);
            }

            // Create unique transaction UUID (booking ID combined with timestamp)
            String transactionUuid = bookingId + "-" + System.currentTimeMillis();

            // Construct string to sign: total_amount=value,transaction_uuid=value,product_code=value
            String message = "total_amount=" + amountStr + ",transaction_uuid=" + transactionUuid + ",product_code=" + productCode;
            String signature = generateSignature(message, secretKey);

            Map<String, String> response = new HashMap<>();
            response.put("amount", amountStr);
            response.put("tax_amount", "0");
            response.put("total_amount", amountStr);
            response.put("transaction_uuid", transactionUuid);
            response.put("product_code", productCode);
            response.put("product_service_charge", "0");
            response.put("product_delivery_charge", "0");
            response.put("success_url", successUrl);
            response.put("failure_url", failureUrl);
            response.put("signed_field_names", "total_amount,transaction_uuid,product_code");
            response.put("signature", signature);
            response.put("esewa_url", esewaUrl);

            log.info("Successfully initiated eSewa payment payload for Booking ID: {}, transaction_uuid: {}", bookingId, transactionUuid);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("eSewa payment initiation failed", e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "eSewa initiation failed: " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/verify")
    @Transactional
    public ResponseEntity<?> verifyPayment(
            @RequestBody(required = false) Map<String, String> payload,
            @RequestParam(required = false) String data,
            @RequestHeader(value = "X-User-Id") String userId) {

        log.info("Verifying eSewa payment for User: {}", userId);

        String base64Data = data;
        if (base64Data == null && payload != null) {
            base64Data = payload.get("data");
        }
        if (base64Data == null) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Missing 'data' parameter or body field.");
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }

        // Safety fallback to restore plus characters replaced by URL-decoding space characters
        base64Data = base64Data.replace(" ", "+");

        try {
            // 1. Decode base64 callback data
            byte[] decodedBytes = Base64.getDecoder().decode(base64Data);
            String decodedJson = new String(decodedBytes, StandardCharsets.UTF_8);
            log.info("Decoded eSewa callback payload: {}", decodedJson);

            Map<String, Object> decodedMap = objectMapper.readValue(decodedJson, new TypeReference<Map<String, Object>>() {});
            
            String status = String.valueOf(decodedMap.get("status"));
            String transactionUuid = String.valueOf(decodedMap.get("transaction_uuid"));
            String receivedProductCode = String.valueOf(decodedMap.get("product_code"));
            String receivedSignature = String.valueOf(decodedMap.get("signature"));
            String totalAmountRaw = String.valueOf(decodedMap.get("total_amount"));

            // 2. Validate signature locally
            String signedFieldNamesStr = String.valueOf(decodedMap.get("signed_field_names"));
            String[] signedFields = (signedFieldNamesStr != null && !signedFieldNamesStr.isEmpty() && !"null".equals(signedFieldNamesStr))
                    ? signedFieldNamesStr.split(",")
                    : new String[]{"total_amount", "transaction_uuid", "product_code"};
            
            // Try 1: Reconstruct using exact raw string values from callback JSON
            String messageRaw = buildMessageString(decodedMap, signedFields, false);
            String calculatedSignature = generateSignature(messageRaw, secretKey);
            boolean signatureMatches = calculatedSignature.equals(receivedSignature);
            
            // Try 2: Fallback with integer formatted total_amount (e.g. "10" instead of "10.0")
            if (!signatureMatches) {
                log.info("Raw signature verification failed. Trying fallback with integer-formatted amount...");
                String messageSanitized = buildMessageString(decodedMap, signedFields, true);
                calculatedSignature = generateSignature(messageSanitized, secretKey);
                signatureMatches = calculatedSignature.equals(receivedSignature);
            }

            if (!signatureMatches) {
                log.error("eSewa verification signature mismatch! Calculated (with UAT secret key): {}, Received: {}", calculatedSignature, receivedSignature);
                Map<String, String> error = new HashMap<>();
                error.put("message", "Signature verification failed.");
                return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
            }

            if (!"COMPLETE".equalsIgnoreCase(status)) {
                log.error("eSewa payment status is not COMPLETE: {}", status);
                Map<String, String> error = new HashMap<>();
                error.put("message", "Payment status is not COMPLETE.");
                return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
            }

            // 3. (Double-Check) Call eSewa Transaction Status Check API
            RestTemplate restTemplate = new RestTemplate();
            String queryUrl = String.format("%s?product_code=%s&total_amount=%s&transaction_uuid=%s",
                    esewaStatusUrl, receivedProductCode, totalAmountRaw, transactionUuid);
            
            log.info("Querying eSewa transaction status via URL: {}", queryUrl);
            ResponseEntity<Map> responseEntity = restTemplate.getForEntity(queryUrl, Map.class);
            Map<String, Object> responseBody = responseEntity.getBody();
            log.info("eSewa status check API response: {}", responseBody);

            if (responseBody == null || !"COMPLETE".equalsIgnoreCase(String.valueOf(responseBody.get("status")))) {
                log.error("eSewa transaction status check failed. API returned: {}", responseBody);
                Map<String, String> error = new HashMap<>();
                error.put("message", "Transaction verification via eSewa API failed.");
                return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
            }

            // 4. Update Booking and ParkingSpot statuses
            // Extract bookingId from transactionUuid (format: bookingId-timestamp)
            String[] parts = transactionUuid.split("-");
            if (parts.length < 1) {
                log.error("Malformed transaction_uuid: {}", transactionUuid);
                Map<String, String> error = new HashMap<>();
                error.put("message", "Malformed transaction UUID.");
                return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
            }
            Long bookingId = Long.parseLong(parts[0]);

            Booking booking = bookingRepository.findById(bookingId).orElse(null);
            if (booking == null) {
                log.error("Booking not found for ID: {}", bookingId);
                Map<String, String> error = new HashMap<>();
                error.put("message", "Booking not found.");
                return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
            }

            if ("CONFIRMED".equals(booking.getStatus())) {
                log.info("Booking ID {} is already CONFIRMED.", bookingId);
                return ResponseEntity.ok(Map.of("message", "Booking already confirmed."));
            }

            if (!"PENDING_PAYMENT".equals(booking.getStatus())) {
                log.error("Booking ID {} status is {}, cannot confirm.", bookingId, booking.getStatus());
                Map<String, String> error = new HashMap<>();
                error.put("message", "Invalid booking status.");
                return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
            }

            // Mark Booking as CONFIRMED and Spot as RESERVED
            booking.setStatus("CONFIRMED");
            bookingRepository.save(booking);

            ParkingSpot spot = spotRepository.findById(booking.getSpotId()).orElse(null);
            if (spot != null) {
                spot.setStatus("RESERVED");
                spotRepository.save(spot);
                garageService.evictSearchCache();
                log.info("eSewa payment verified successfully. Booking ID {} CONFIRMED, Spot ID {} RESERVED.", bookingId, booking.getSpotId());
            } else {
                log.error("ParkingSpot not found for ID: {}", booking.getSpotId());
                Map<String, String> error = new HashMap<>();
                error.put("message", "Parking spot not found.");
                return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
            }

            return ResponseEntity.ok(Map.of("message", "Payment verified and booking confirmed successfully."));
        } catch (Exception e) {
            log.error("eSewa payment verification failed", e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "Verification failed: " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private String buildMessageString(Map<String, Object> decodedMap, String[] signedFields, boolean sanitizeAmount) {
        StringBuilder messageBuilder = new StringBuilder();
        for (int i = 0; i < signedFields.length; i++) {
            String fieldName = signedFields[i].trim();
            Object val = decodedMap.get(fieldName);
            String valStr;
            if (val == null) {
                valStr = "";
            } else if ("total_amount".equals(fieldName) && sanitizeAmount) {
                String rawAmount = String.valueOf(val);
                try {
                    double dVal = Double.parseDouble(rawAmount);
                    if (dVal == (long) dVal) {
                        valStr = String.format("%d", (long) dVal);
                    } else {
                        valStr = rawAmount;
                    }
                } catch (NumberFormatException e) {
                    valStr = rawAmount;
                }
            } else {
                valStr = String.valueOf(val);
            }
            
            messageBuilder.append(fieldName).append("=").append(valStr);
            if (i < signedFields.length - 1) {
                messageBuilder.append(",");
            }
        }
        return messageBuilder.toString();
    }

    private String generateSignature(String message, String secretKey) {
        try {
            Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
            SecretKeySpec secret_key = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256_HMAC.init(secret_key);
            byte[] hash = sha256_HMAC.doFinal(message.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate HMAC-SHA256 signature", e);
        }
    }
}

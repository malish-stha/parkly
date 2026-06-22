package com.parking.park.controller;

import com.parking.park.model.UserSubscription;
import com.parking.park.repository.UserSubscriptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/subscriptions")
public class SubscriptionController {

    @Autowired
    private UserSubscriptionRepository subscriptionRepository;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus(@RequestHeader("X-User-Id") String userId) {
        Optional<UserSubscription> optionalSub = subscriptionRepository.findByUserId(userId);
        
        Map<String, Object> response = new HashMap<>();
        if (optionalSub.isPresent()) {
            UserSubscription sub = optionalSub.get();
            // Check if expired
            if (sub.getEndDate().isBefore(LocalDateTime.now(java.time.ZoneOffset.UTC))) {
                sub.setStatus("EXPIRED");
                subscriptionRepository.save(sub);
                response.put("type", "FREE");
                response.put("status", "EXPIRED");
            } else {
                response.put("type", sub.getSubscriptionType());
                response.put("status", sub.getStatus());
                response.put("endDate", sub.getEndDate().toString());
            }
        } else {
            response.put("type", "FREE");
            response.put("status", "ACTIVE");
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/upgrade")
    public ResponseEntity<Map<String, Object>> upgrade(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam String type) { // "DRIVER_GOLD" or "OWNER_PRO" or "FREE"
        
        if (!"DRIVER_GOLD".equals(type) && !"OWNER_PRO".equals(type) && !"FREE".equals(type)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid subscription type"));
        }

        UserSubscription sub = subscriptionRepository.findByUserId(userId)
                .orElse(new UserSubscription());

        sub.setUserId(userId);
        sub.setSubscriptionType(type);
        sub.setStartDate(LocalDateTime.now(java.time.ZoneOffset.UTC));
        // Active for 30 days
        sub.setEndDate(LocalDateTime.now(java.time.ZoneOffset.UTC).plusDays(30));
        sub.setStatus("ACTIVE");

        UserSubscription saved = subscriptionRepository.save(sub);

        Map<String, Object> response = new HashMap<>();
        response.put("type", saved.getSubscriptionType());
        response.put("status", saved.getStatus());
        response.put("endDate", saved.getEndDate().toString());

        return ResponseEntity.ok(response);
    }
}

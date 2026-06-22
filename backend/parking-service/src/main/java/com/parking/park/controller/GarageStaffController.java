package com.parking.park.controller;

import com.parking.park.model.Garage;
import com.parking.park.model.GarageStaff;
import com.parking.park.repository.GarageRepository;
import com.parking.park.repository.GarageStaffRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/owner/garages/{garageId}/staff")
public class GarageStaffController {

    @Autowired
    private GarageRepository garageRepository;

    @Autowired
    private GarageStaffRepository staffRepository;

    private ResponseEntity<?> verifyOwnership(Long garageId, String ownerId) {
        Optional<Garage> optionalGarage = garageRepository.findById(garageId);
        if (optionalGarage.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Garage not found"));
        }
        if (!optionalGarage.get().getOwnerId().equals(ownerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only the garage owner can manage staff"));
        }
        return null;
    }

    @GetMapping
    public ResponseEntity<?> getStaff(
            @PathVariable Long garageId,
            @RequestHeader("X-User-Id") String userId) {
        
        ResponseEntity<?> error = verifyOwnership(garageId, userId);
        if (error != null) return error;

        List<GarageStaff> staffList = staffRepository.findByGarageId(garageId);
        return ResponseEntity.ok(staffList);
    }

    @PostMapping
    public ResponseEntity<?> addStaff(
            @PathVariable Long garageId,
            @RequestHeader("X-User-Id") String userId,
            @RequestParam String staffUserId) {
        
        ResponseEntity<?> error = verifyOwnership(garageId, userId);
        if (error != null) return error;

        // Check if already exists
        Optional<GarageStaff> existing = staffRepository.findByGarageIdAndStaffUserId(garageId, staffUserId);
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User is already an attendant for this garage"));
        }

        GarageStaff staff = new GarageStaff(garageId, staffUserId, "ATTENDANT");
        GarageStaff saved = staffRepository.save(staff);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{staffUserId}")
    public ResponseEntity<?> removeStaff(
            @PathVariable Long garageId,
            @PathVariable String staffUserId,
            @RequestHeader("X-User-Id") String userId) {
        
        ResponseEntity<?> error = verifyOwnership(garageId, userId);
        if (error != null) return error;

        Optional<GarageStaff> existing = staffRepository.findByGarageIdAndStaffUserId(garageId, staffUserId);
        if (existing.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Staff member not found"));
        }

        staffRepository.delete(existing.get());
        return ResponseEntity.ok(Map.of("message", "Staff member removed successfully"));
    }
}

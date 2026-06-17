package com.parking.park.controller;

import com.parking.park.dto.GarageOnboardRequest;
import com.parking.park.model.Garage;
import com.parking.park.service.GarageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/garages")
public class GarageController {

    @Autowired
    private GarageService garageService;

    @PostMapping
    public ResponseEntity<Garage> onboardGarage(
            @RequestBody GarageOnboardRequest request,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "user_mock_owner_123") String userId) {
        Garage savedGarage = garageService.onboardGarage(request, userId);
        return new ResponseEntity<>(savedGarage, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Garage>> getOwnerGarages(
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "user_mock_owner_123") String userId) {
        List<Garage> garages = garageService.getGaragesByOwner(userId);
        return ResponseEntity.ok(garages);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Garage> getGarageDetails(@PathVariable Long id) {
        Garage garage = garageService.getGarageById(id);
        return ResponseEntity.ok(garage);
    }
}

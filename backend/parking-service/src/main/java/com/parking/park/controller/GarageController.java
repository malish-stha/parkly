package com.parking.park.controller;

import com.parking.park.dto.GarageOnboardRequest;
import com.parking.park.model.Garage;
import com.parking.park.service.GarageSearchService;
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

    @Autowired
    private GarageSearchService garageSearchService;

    @GetMapping("/search")
    public ResponseEntity<List<com.parking.park.dto.GarageSearchDto>> searchGarages(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "5.0") double radius) {
        List<com.parking.park.dto.GarageSearchDto> garages = garageSearchService.searchNearbyGarages(lat, lng, radius);
        return ResponseEntity.ok(garages);
    }

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

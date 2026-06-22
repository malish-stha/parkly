package com.parking.park.service;

import com.parking.park.dto.GarageOnboardRequest;
import com.parking.park.dto.SpotLayoutConfig;
import com.parking.park.model.Garage;
import com.parking.park.model.ParkingSpot;
import com.parking.park.repository.GarageRepository;
import com.parking.park.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class GarageService {

    @Autowired
    private GarageRepository garageRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Transactional
    @CacheEvict(value = "garagesNearby", allEntries = true)
    public Garage onboardGarage(GarageOnboardRequest request, String ownerId) {
        Garage garage = new Garage(
            request.getName(),
            request.getAddress(),
            request.getLatitude(),
            request.getLongitude(),
            request.getRatePerHour(),
            request.getImageUrl(),
            ownerId
        );

        // Map layout spots to database models
        if (request.getSpots() != null) {
            for (SpotLayoutConfig spotConfig : request.getSpots()) {
                ParkingSpot spot = new ParkingSpot(
                    spotConfig.getSpotNumber(),
                    spotConfig.getVehicleType(),
                    "AVAILABLE", // Default status
                    garage
                );
                garage.addSpot(spot);
            }
        }

        return garageRepository.save(garage);
    }

    public List<Garage> getGaragesByOwner(String ownerId) {
        return garageRepository.findAllByOwnerId(ownerId);
    }

    public Garage getGarageById(Long id) {
        return garageRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Garage not found with ID: " + id));
    }

    @Transactional
    @CacheEvict(value = "garagesNearby", allEntries = true)
    public Garage updateGarage(Long id, GarageOnboardRequest request, String ownerId) {
        Garage garage = getGarageById(id);
        
        // Security check
        if (!garage.getOwnerId().equals(ownerId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, "You do not own this garage"
            );
        }

        // Update metadata
        garage.setName(request.getName());
        garage.setAddress(request.getAddress());
        garage.setLatitude(request.getLatitude());
        garage.setLongitude(request.getLongitude());
        garage.setRatePerHour(request.getRatePerHour());
        garage.setImageUrl(request.getImageUrl());

        // Update layout spots using a merge algorithm
        List<ParkingSpot> existingSpots = garage.getSpots();
        List<SpotLayoutConfig> newSpotsConfig = request.getSpots();

        if (newSpotsConfig != null) {
            // Find spots to remove
            java.util.Set<String> requestSpotNumbers = newSpotsConfig.stream()
                .map(SpotLayoutConfig::getSpotNumber)
                .collect(java.util.stream.Collectors.toSet());

            // JPA orphanRemoval = true will delete removed spots from db
            existingSpots.removeIf(spot -> !requestSpotNumbers.contains(spot.getSpotNumber()));

            // Update or add spots
            for (SpotLayoutConfig config : newSpotsConfig) {
                ParkingSpot existingSpot = existingSpots.stream()
                    .filter(spot -> spot.getSpotNumber().equals(config.getSpotNumber()))
                    .findFirst()
                    .orElse(null);

                if (existingSpot != null) {
                    // Update vehicle type
                    existingSpot.setVehicleType(config.getVehicleType());
                } else {
                    // Create new spot
                    ParkingSpot newSpot = new ParkingSpot(
                        config.getSpotNumber(),
                        config.getVehicleType(),
                        "AVAILABLE",
                        garage
                    );
                    garage.addSpot(newSpot);
                }
            }
        } else {
            // If requested spots is null, clear all spots
            existingSpots.clear();
        }

        return garageRepository.save(garage);
    }

    @Transactional
    @CacheEvict(value = "garagesNearby", allEntries = true)
    public void deleteGarage(Long id, String ownerId) {
        Garage garage = getGarageById(id);
        
        // Security check
        if (!garage.getOwnerId().equals(ownerId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, "You do not own this garage"
            );
        }

        // Check if there are active or pending bookings
        boolean hasActiveBookings = bookingRepository.existsByGarageIdAndStatusIn(
            id, List.of("CONFIRMED", "PENDING_PAYMENT")
        );
        if (hasActiveBookings) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST,
                "Cannot delete garage because it has active or pending bookings."
            );
        }

        garageRepository.delete(garage);
    }

    @CacheEvict(value = "garagesNearby", allEntries = true)
    public void evictSearchCache() {
        // Intentionally empty: annotation clears the Redis search cache entries
    }
}

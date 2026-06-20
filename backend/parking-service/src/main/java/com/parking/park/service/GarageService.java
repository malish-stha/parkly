package com.parking.park.service;

import com.parking.park.dto.GarageOnboardRequest;
import com.parking.park.dto.SpotLayoutConfig;
import com.parking.park.model.Garage;
import com.parking.park.model.ParkingSpot;
import com.parking.park.repository.GarageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class GarageService {

    @Autowired
    private GarageRepository garageRepository;

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
}

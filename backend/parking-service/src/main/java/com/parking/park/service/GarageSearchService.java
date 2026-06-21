package com.parking.park.service;

import com.parking.park.dto.GarageSearchDto;
import com.parking.park.model.Garage;
import com.parking.park.model.ParkingSpot;
import com.parking.park.model.Booking;
import com.parking.park.repository.GarageRepository;
import com.parking.park.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class GarageSearchService {

    @Autowired
    private GarageRepository garageRepository;

    @Autowired
    private BookingRepository bookingRepository;

    public List<GarageSearchDto> searchNearbyGarages(double lat, double lng, double radius, LocalDateTime startTime, LocalDateTime endTime) {
        // 1. Fetch raw Garage entities within bounds using cache
        List<Garage> garages = fetchGaragesWithinBounds(lat, lng, radius);

        // 2. Collect all spot IDs to batch-fetch conflicts
        List<Long> spotIds = garages.stream()
                .flatMap(g -> g.getSpots().stream())
                .map(ParkingSpot::getId)
                .collect(Collectors.toList());

        LocalDateTime lockThreshold = LocalDateTime.now(java.time.ZoneOffset.UTC).minusMinutes(15);
        
        List<Booking> conflicts = spotIds.isEmpty() ? List.of() :
                bookingRepository.findOverlappingBookingsForSpots(spotIds, startTime, endTime, lockThreshold);

        Set<Long> conflictedSpotIds = conflicts.stream()
                .map(Booking::getSpotId)
                .collect(Collectors.toSet());

        // 3. Map to DTOs and dynamically override spot statuses based on conflicts
        return garages.stream()
                .map(g -> {
                    GarageSearchDto dto = new GarageSearchDto(g);
                    if (dto.getSpots() != null) {
                        dto.getSpots().forEach(s -> {
                            if (conflictedSpotIds.contains(s.getId())) {
                                // Find the conflicting booking to set status appropriately
                                Booking conflict = conflicts.stream()
                                        .filter(b -> b.getSpotId().equals(s.getId()))
                                        .findFirst()
                                        .orElse(null);
                                if (conflict != null) {
                                    s.setStatus(conflict.getStatus()); // sets to "CONFIRMED" (RESERVED) or "PENDING_PAYMENT"
                                } else {
                                    s.setStatus("RESERVED");
                                }
                            } else {
                                // If the spot has no conflicts in this time range, it is available (unless physically OCCUPIED right now)
                                if (!"OCCUPIED".equals(s.getStatus())) {
                                    s.setStatus("AVAILABLE");
                                }
                            }
                        });
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Cacheable(value = "garagesNearby", key = "#lat + '-' + #lng + '-' + #radius")
    public List<Garage> fetchGaragesWithinBounds(double lat, double lng, double radius) {
        double latChange = radius / 111.0;
        double minLat = lat - latChange;
        double maxLat = lat + latChange;

        double cosLat = Math.cos(Math.toRadians(lat));
        double lngChange = cosLat > 0.0 ? radius / (111.0 * cosLat) : 0.0;
        double minLng = lng - lngChange;
        double maxLng = lng + lngChange;

        return garageRepository.findWithinBoundingBox(minLat, maxLat, minLng, maxLng);
    }
}

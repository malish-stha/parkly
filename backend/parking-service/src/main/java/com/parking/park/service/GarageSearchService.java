package com.parking.park.service;

import com.parking.park.dto.GarageSearchDto;
import com.parking.park.model.Garage;
import com.parking.park.repository.GarageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class GarageSearchService {

    @Autowired
    private GarageRepository garageRepository;

    @Cacheable(value = "garagesNearby", key = "#lat + '-' + #lng + '-' + #radius")
    public List<GarageSearchDto> searchNearbyGarages(double lat, double lng, double radius) {
        // Calculate Bounding Box coordinates
        // 1 degree latitude = ~111 km
        double latChange = radius / 111.0;
        double minLat = lat - latChange;
        double maxLat = lat + latChange;

        // 1 degree longitude = ~111 km * cos(lat)
        double cosLat = Math.cos(Math.toRadians(lat));
        double lngChange = cosLat > 0.0 ? radius / (111.0 * cosLat) : 0.0;
        double minLng = lng - lngChange;
        double maxLng = lng + lngChange;

        List<Garage> garages = garageRepository.findWithinBoundingBox(minLat, maxLat, minLng, maxLng);
        return garages.stream()
                .map(GarageSearchDto::new)
                .collect(Collectors.toList());
    }
}

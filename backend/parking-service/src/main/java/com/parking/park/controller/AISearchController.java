package com.parking.park.controller;

import com.parking.park.dto.GarageSearchDto;
import com.parking.park.dto.AISearchResponseDto;
import com.parking.park.service.GarageSearchService;
import com.parking.park.service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/garages")
public class AISearchController {

    @Autowired
    private GarageSearchService garageSearchService;

    @Autowired
    private GeminiService geminiService;

    @GetMapping("/ai-search")
    public ResponseEntity<AISearchResponseDto> aiSearch(
            @RequestParam String query,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng) {

        String lowerQuery = query.toLowerCase();

        // Default Kathmandu coordinates
        double centerLat = 27.7172;
        double centerLng = 85.3240;

        if (lat != null && lng != null) {
            centerLat = lat;
            centerLng = lng;
        }

        Double maxPrice = null;
        String requiredType = null;
        String aiMessage = null;

        // 1. Try parsing using Gemini LLM
        GeminiService.ParseResult geminiResult = geminiService.parseQuery(query);
        if (geminiResult != null) {
            maxPrice = geminiResult.maxPrice;
            requiredType = geminiResult.vehicleType;
            aiMessage = geminiResult.aiMessage;

            if (geminiResult.resolvedLat != null && geminiResult.resolvedLng != null) {
                centerLat = geminiResult.resolvedLat;
                centerLng = geminiResult.resolvedLng;
            }
        } else {
            // 2. Local Regex Fallback if Gemini key is not configured or fails
            if (lowerQuery.contains("thamel")) {
                centerLat = 27.7150;
                centerLng = 85.3102;
            } else if (lowerQuery.contains("durbar square")) {
                centerLat = 27.7042;
                centerLng = 85.3065;
            } else if (lowerQuery.contains("civil mall") || lowerQuery.contains("sundhara")) {
                centerLat = 27.7005;
                centerLng = 85.3122;
            } else if (lowerQuery.contains("durbar marg")) {
                centerLat = 27.7123;
                centerLng = 85.3168;
            }

            Pattern pricePattern = Pattern.compile("(?:under|below|less than|max|limit)\\s+\\$?(\\d+)");
            Matcher priceMatcher = pricePattern.matcher(lowerQuery);
            if (priceMatcher.find()) {
                try {
                    maxPrice = Double.parseDouble(priceMatcher.group(1));
                } catch (NumberFormatException ignored) {}
            }

            if (lowerQuery.contains("ev") || lowerQuery.contains("charging")) {
                requiredType = "EV";
            } else if (lowerQuery.contains("suv") || lowerQuery.contains("large") || lowerQuery.contains("truck") || lowerQuery.contains("jeep")) {
                requiredType = "SUV";
            } else if (lowerQuery.contains("bike") || lowerQuery.contains("motorcycle") || lowerQuery.contains("two-wheeler") || lowerQuery.contains("scooter")) {
                requiredType = "BIKE";
            } else if (lowerQuery.contains("standard") || lowerQuery.contains("car") || lowerQuery.contains("normal")) {
                requiredType = "STANDARD";
            }
        }

        // 3. Search nearby garages (10km range for AI search helper)
        LocalDateTime start = LocalDateTime.now(ZoneOffset.UTC);
        LocalDateTime end = start.plusHours(1);

        List<GarageSearchDto> nearbyGarages = garageSearchService.searchNearbyGarages(centerLat, centerLng, 10.0, start, end);

        // 4. Filter and Sort
        final Double priceLimit = maxPrice;
        final String spotTypeLimit = requiredType;
        final double searchLat = centerLat;
        final double searchLng = centerLng;

        List<GarageSearchDto> filteredGarages = nearbyGarages.stream()
                .filter(g -> {
                    // Filter by rate limit
                    if (priceLimit != null && g.getRatePerHour() > priceLimit) {
                        return false;
                    }
                    
                    // Filter by spot vehicleType availability
                    if (spotTypeLimit != null) {
                        boolean hasMatchingSpot = g.getSpots() != null && g.getSpots().stream()
                                .anyMatch(s -> spotTypeLimit.equals(s.getVehicleType()) && "AVAILABLE".equals(s.getStatus()));
                        if (!hasMatchingSpot) {
                            return false;
                        }
                    }
                    return true;
                })
                .sorted((a, b) -> Double.compare(
                        calculateDistance(searchLat, searchLng, a.getLatitude(), a.getLongitude()),
                        calculateDistance(searchLat, searchLng, b.getLatitude(), b.getLongitude())
                ))
                .collect(Collectors.toList());

        // 5. Construct fallback user message if Gemini did not provide one
        if (aiMessage == null) {
            if (filteredGarages.isEmpty()) {
                aiMessage = "I couldn't find any parking lots matching those specific criteria near your request. Try asking for standard, EV, or BIKE spaces with different rates (e.g. 'under 150').";
            } else {
                aiMessage = "I found " + filteredGarages.size() + " parking spaces matching your criteria. Here are the best options sorted by proximity:";
            }
        }

        return ResponseEntity.ok(new AISearchResponseDto(aiMessage, filteredGarages, centerLat, centerLng));
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371; // Radius of the Earth in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}

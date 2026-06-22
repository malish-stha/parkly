package com.parking.park.controller;

import com.parking.park.dto.BookingHistoryDto;
import com.parking.park.dto.GarageStatsDto;
import com.parking.park.dto.OwnerAnalyticsDto;
import com.parking.park.model.Booking;
import com.parking.park.model.Garage;
import com.parking.park.model.ParkingSpot;
import com.parking.park.repository.BookingRepository;
import com.parking.park.repository.ParkingSpotRepository;
import com.parking.park.service.GarageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/owner/analytics")
public class OwnerAnalyticsController {
    private static final Logger log = LoggerFactory.getLogger(OwnerAnalyticsController.class);

    private final GarageService garageService;
    private final BookingRepository bookingRepository;
    private final ParkingSpotRepository spotRepository;
    private final com.parking.park.repository.GarageStaffRepository staffRepository;

    public OwnerAnalyticsController(GarageService garageService,
                                    BookingRepository bookingRepository,
                                    ParkingSpotRepository spotRepository,
                                    com.parking.park.repository.GarageStaffRepository staffRepository) {
        this.garageService = garageService;
        this.bookingRepository = bookingRepository;
        this.spotRepository = spotRepository;
        this.staffRepository = staffRepository;
    }

    @GetMapping
    public ResponseEntity<?> getOwnerAnalytics(
            @RequestHeader(value = "X-User-Id") String ownerId) {
        
        log.info("Calculating owner analytics for owner ID: {}", ownerId);

        // 1. Fetch all garages owned by this user
        List<Garage> owned = garageService.getGaragesByOwner(ownerId);

        // Fetch all garages where user is registered as staff
        List<com.parking.park.model.GarageStaff> staffMappings = staffRepository.findByStaffUserId(ownerId);
        List<Long> staffedGarageIds = staffMappings.stream()
                .map(com.parking.park.model.GarageStaff::getGarageId)
                .collect(Collectors.toList());
        List<Garage> staffed = new ArrayList<>();
        for (Long gid : staffedGarageIds) {
            try {
                staffed.add(garageService.getGarageById(gid));
            } catch (Exception e) {
                // Ignore missing garages
            }
        }

        List<Garage> garages = new ArrayList<>(owned);
        for (Garage g : staffed) {
            if (garages.stream().noneMatch(existing -> existing.getId().equals(g.getId()))) {
                garages.add(g);
            }
        }

        if (garages.isEmpty()) {
            return ResponseEntity.ok(new OwnerAnalyticsDto(0, 0.0, 0, new ArrayList<>(), new ArrayList<>()));
        }

        List<Long> garageIds = garages.stream()
                .map(Garage::getId)
                .collect(Collectors.toList());

        // 2. Fetch all bookings associated with these garages
        List<Booking> bookings = bookingRepository.findByGarageIdInOrderByCreatedAtDesc(garageIds);

        // Pre-fetch spot mappings to avoid N+1 queries during mapping
        List<Long> spotIds = bookings.stream()
                .map(Booking::getSpotId)
                .distinct()
                .collect(Collectors.toList());
                
        Map<Long, String> spotNumberMap = spotRepository.findAllById(spotIds).stream()
                .collect(Collectors.toMap(ParkingSpot::getId, ParkingSpot::getSpotNumber, (a, b) -> a));

        Map<Long, Garage> garageMap = garages.stream()
                .collect(Collectors.toMap(Garage::getId, g -> g));

        // 3. Compute stats
        double totalEarnings = 0.0;
        int totalBookings = bookings.size();

        for (Booking b : bookings) {
            if ("CONFIRMED".equals(b.getStatus())) {
                totalEarnings += b.getBaseAmount();
            }
        }

        // 4. Map breakdowns per garage
        List<GarageStatsDto> garageBreakdowns = garages.stream()
                .map(g -> {
                    double earnings = 0.0;
                    int bookingsCount = 0;

                    for (Booking b : bookings) {
                        if (b.getGarageId().equals(g.getId())) {
                            bookingsCount++;
                            if ("CONFIRMED".equals(b.getStatus())) {
                                earnings += b.getBaseAmount();
                            }
                        }
                    }

                    int totalSpots = g.getSpots() != null ? g.getSpots().size() : 0;

                    return new GarageStatsDto(
                            g.getId(),
                            g.getName(),
                            g.getAddress(),
                            totalSpots,
                            g.getRatePerHour(),
                            earnings,
                            bookingsCount,
                            g.getOwnerId()
                    );
                })
                .collect(Collectors.toList());

        // 5. Map recent bookings list to BookingHistoryDto
        List<BookingHistoryDto> recentBookings = bookings.stream()
                .limit(20) // Limit to top 20 recent bookings
                .map(b -> {
                    String gName = "Unknown Garage";
                    String gAddress = "Unknown Address";
                    Garage g = garageMap.get(b.getGarageId());
                    if (g != null) {
                        gName = g.getName();
                        gAddress = g.getAddress();
                    }
                    String spotNum = spotNumberMap.getOrDefault(b.getSpotId(), "Unknown Spot");

                    return new BookingHistoryDto(
                            b.getId(),
                            b.getDriverId(),
                            b.getGarageId(),
                            gName,
                            gAddress,
                            b.getSpotId(),
                            spotNum,
                            b.getBaseAmount(),
                            b.getStatus(),
                            b.getStartTime(),
                            b.getEndTime(),
                            b.getCreatedAt()
                    );
                })
                .collect(Collectors.toList());

        OwnerAnalyticsDto response = new OwnerAnalyticsDto(
                garages.size(),
                totalEarnings,
                totalBookings,
                garageBreakdowns,
                recentBookings
        );

        return ResponseEntity.ok(response);
    }
}

package com.parking.park.scheduler;

import com.parking.park.model.Booking;
import com.parking.park.model.ParkingSpot;
import com.parking.park.repository.BookingRepository;
import com.parking.park.repository.ParkingSpotRepository;
import com.parking.park.service.GarageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class BookingExpirySweeper {
    private static final Logger log = LoggerFactory.getLogger(BookingExpirySweeper.class);

    private final BookingRepository bookingRepository;
    private final ParkingSpotRepository spotRepository;
    private final GarageService garageService;

    public BookingExpirySweeper(BookingRepository bookingRepository,
                                ParkingSpotRepository spotRepository,
                                GarageService garageService) {
        this.bookingRepository = bookingRepository;
        this.spotRepository = spotRepository;
        this.garageService = garageService;
    }

    @Scheduled(fixedRate = 10000) // Sweeps database every 10 seconds
    @Transactional
    public void sweepExpiredBookings() {
        LocalDateTime now = LocalDateTime.now(java.time.ZoneOffset.UTC);
        List<Booking> expiredBookings = bookingRepository.findByStatusAndEndTimeBefore("PENDING_PAYMENT", now);

        if (!expiredBookings.isEmpty()) {
            log.info("Found {} expired pending bookings. Processing release...", expiredBookings.size());
            for (Booking booking : expiredBookings) {
                booking.setStatus("CANCELLED");
                bookingRepository.save(booking);

                // Direct transactional update to Spot Status in monolith
                ParkingSpot spot = spotRepository.findById(booking.getSpotId()).orElse(null);
                if (spot != null) {
                    if ("PENDING_PAYMENT".equals(spot.getStatus())) {
                        spot.setStatus("AVAILABLE");
                        spotRepository.save(spot);
                        garageService.evictSearchCache();
                        log.info("Booking ID {} expired. Spot ID {} released back to AVAILABLE", booking.getId(), spot.getId());
                    }
                } else {
                    log.error("ParkingSpot not found for ID: {}", booking.getSpotId());
                }
            }
        }
    }
}

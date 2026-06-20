package com.parking.payment.scheduler;

import com.parking.payment.model.Booking;
import com.parking.payment.repository.BookingRepository;
import com.parking.payment.service.BookingEventPublisher;
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
    private final BookingEventPublisher eventPublisher;

    public BookingExpirySweeper(BookingRepository bookingRepository, BookingEventPublisher eventPublisher) {
        this.bookingRepository = bookingRepository;
        this.eventPublisher = eventPublisher;
    }

    @Scheduled(fixedRate = 10000) // Sweeps database every 10 seconds
    @Transactional
    public void sweepExpiredBookings() {
        LocalDateTime now = LocalDateTime.now(java.time.ZoneOffset.UTC);
        List<Booking> expiredBookings = bookingRepository.findByStatusAndExpiresAtBefore("PENDING", now);

        if (!expiredBookings.isEmpty()) {
            log.info("Found {} expired pending bookings. Processing release...", expiredBookings.size());
            for (Booking booking : expiredBookings) {
                booking.setStatus("EXPIRED");
                bookingRepository.save(booking);

                log.info("Booking ID {} set to EXPIRED. Triggering spot release event for Spot ID {}", booking.getId(), booking.getSpotId());
                eventPublisher.publishReservationExpired(booking.getId(), booking.getSpotId(), booking.getGarageId());
            }
        }
    }
}

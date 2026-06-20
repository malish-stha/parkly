package com.parking.park.listener;

public class BookingEventPayload {
    private String eventType; // "EXPIRED", "CONFIRMED"
    private Long bookingId;
    private Long spotId;
    private Long garageId;

    public BookingEventPayload() {}

    public BookingEventPayload(String eventType, Long bookingId, Long spotId, Long garageId) {
        this.eventType = eventType;
        this.bookingId = bookingId;
        this.spotId = spotId;
        this.garageId = garageId;
    }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public Long getSpotId() { return spotId; }
    public void setSpotId(Long spotId) { this.spotId = spotId; }

    public Long getGarageId() { return garageId; }
    public void setGarageId(Long garageId) { this.garageId = garageId; }
}

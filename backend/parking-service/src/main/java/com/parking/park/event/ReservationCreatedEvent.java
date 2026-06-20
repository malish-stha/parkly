package com.parking.park.event;

public class ReservationCreatedEvent {
    private Long spotId;
    private Long garageId;
    private String userId;
    private double ratePerHour;
    private String expiresAt; // ISO format string

    public ReservationCreatedEvent() {}

    public ReservationCreatedEvent(Long spotId, Long garageId, String userId, double ratePerHour, String expiresAt) {
        this.spotId = spotId;
        this.garageId = garageId;
        this.userId = userId;
        this.ratePerHour = ratePerHour;
        this.expiresAt = expiresAt;
    }

    public Long getSpotId() { return spotId; }
    public void setSpotId(Long spotId) { this.spotId = spotId; }

    public Long getGarageId() { return garageId; }
    public void setGarageId(Long garageId) { this.garageId = garageId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public double getRatePerHour() { return ratePerHour; }
    public void setRatePerHour(double ratePerHour) { this.ratePerHour = ratePerHour; }

    public String getExpiresAt() { return expiresAt; }
    public void setExpiresAt(String expiresAt) { this.expiresAt = expiresAt; }
}

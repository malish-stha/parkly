package com.parking.park.dto;

import java.io.Serializable;
import java.time.LocalDateTime;

public class BookingHistoryDto implements Serializable {
    private Long id;
    private String driverId;
    private Long garageId;
    private String garageName;
    private String garageAddress;
    private Long spotId;
    private String spotNumber;
    private double baseAmount;
    private String status;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime createdAt;

    public BookingHistoryDto() {}

    public BookingHistoryDto(Long id, String driverId, Long garageId, String garageName, String garageAddress,
                             Long spotId, String spotNumber, double baseAmount, String status,
                             LocalDateTime startTime, LocalDateTime endTime, LocalDateTime createdAt) {
        this.id = id;
        this.driverId = driverId;
        this.garageId = garageId;
        this.garageName = garageName;
        this.garageAddress = garageAddress;
        this.spotId = spotId;
        this.spotNumber = spotNumber;
        this.baseAmount = baseAmount;
        this.status = status;
        this.startTime = startTime;
        this.endTime = endTime;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDriverId() { return driverId; }
    public void setDriverId(String driverId) { this.driverId = driverId; }

    public Long getGarageId() { return garageId; }
    public void setGarageId(Long garageId) { this.garageId = garageId; }

    public String getGarageName() { return garageName; }
    public void setGarageName(String garageName) { this.garageName = garageName; }

    public String getGarageAddress() { return garageAddress; }
    public void setGarageAddress(String garageAddress) { this.garageAddress = garageAddress; }

    public Long getSpotId() { return spotId; }
    public void setSpotId(Long spotId) { this.spotId = spotId; }

    public String getSpotNumber() { return spotNumber; }
    public void setSpotNumber(String spotNumber) { this.spotNumber = spotNumber; }

    public double getBaseAmount() { return baseAmount; }
    public void setBaseAmount(double baseAmount) { this.baseAmount = baseAmount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

package com.parking.park.dto;

import com.parking.park.model.ParkingSpot;
import java.io.Serializable;

public class ParkingSpotSearchDto implements Serializable {
    private Long id;
    private String spotNumber;
    private String vehicleType;
    private String status;
    private String bookedUntil;

    public ParkingSpotSearchDto() {}

    public ParkingSpotSearchDto(ParkingSpot spot) {
        this.id = spot.getId();
        this.spotNumber = spot.getSpotNumber();
        this.vehicleType = spot.getVehicleType();
        this.status = spot.getStatus();
        this.bookedUntil = null;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSpotNumber() { return spotNumber; }
    public void setSpotNumber(String spotNumber) { this.spotNumber = spotNumber; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getBookedUntil() { return bookedUntil; }
    public void setBookedUntil(String bookedUntil) { this.bookedUntil = bookedUntil; }
}

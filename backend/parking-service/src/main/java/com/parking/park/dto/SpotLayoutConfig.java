package com.parking.park.dto;

public class SpotLayoutConfig {
    private String spotNumber;
    private String vehicleType; // "STANDARD", "EV", "SUV"

    public SpotLayoutConfig() {}

    public SpotLayoutConfig(String spotNumber, String vehicleType) {
        this.spotNumber = spotNumber;
        this.vehicleType = vehicleType;
    }

    public String getSpotNumber() { return spotNumber; }
    public void setSpotNumber(String spotNumber) { this.spotNumber = spotNumber; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }
}

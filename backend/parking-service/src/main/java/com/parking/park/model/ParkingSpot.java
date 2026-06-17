package com.parking.park.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "parking_spots")
public class ParkingSpot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "spot_number", nullable = false)
    private String spotNumber;

    @Column(name = "vehicle_type", nullable = false)
    private String vehicleType; // "STANDARD", "EV", "SUV"

    @Column(nullable = false)
    private String status; // "AVAILABLE", "PENDING_PAYMENT", "RESERVED", "OCCUPIED"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "garage_id", nullable = false)
    @JsonIgnore
    private Garage garage;

    public ParkingSpot() {}

    public ParkingSpot(String spotNumber, String vehicleType, String status, Garage garage) {
        this.spotNumber = spotNumber;
        this.vehicleType = vehicleType;
        this.status = status;
        this.garage = garage;
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

    public Garage getGarage() { return garage; }
    public void setGarage(Garage garage) { this.garage = garage; }
}

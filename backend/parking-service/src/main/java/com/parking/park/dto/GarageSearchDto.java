package com.parking.park.dto;

import com.parking.park.model.Garage;
import java.io.Serializable;
import java.util.List;
import java.util.stream.Collectors;

public class GarageSearchDto implements Serializable {
    private Long id;
    private String name;
    private String address;
    private double latitude;
    private double longitude;
    private double ratePerHour;
    private String imageUrl;
    private String ownerId;
    private List<ParkingSpotSearchDto> spots;

    public GarageSearchDto() {}

    public GarageSearchDto(Garage garage) {
        this.id = garage.getId();
        this.name = garage.getName();
        this.address = garage.getAddress();
        this.latitude = garage.getLatitude();
        this.longitude = garage.getLongitude();
        this.ratePerHour = garage.getRatePerHour();
        this.imageUrl = garage.getImageUrl();
        this.ownerId = garage.getOwnerId();
        this.spots = garage.getSpots().stream()
                .map(ParkingSpotSearchDto::new)
                .collect(Collectors.toList());
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }

    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }

    public double getRatePerHour() { return ratePerHour; }
    public void setRatePerHour(double ratePerHour) { this.ratePerHour = ratePerHour; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public List<ParkingSpotSearchDto> getSpots() { return spots; }
    public void setSpots(List<ParkingSpotSearchDto> spots) { this.spots = spots; }
}

package com.parking.park.dto;

import java.util.List;

public class GarageOnboardRequest {
    private String name;
    private String address;
    private double latitude;
    private double longitude;
    private double ratePerHour;
    private String imageUrl;
    private List<SpotLayoutConfig> spots;

    public GarageOnboardRequest() {}

    // Getters and Setters
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

    public List<SpotLayoutConfig> getSpots() { return spots; }
    public void setSpots(List<SpotLayoutConfig> spots) { this.spots = spots; }
}

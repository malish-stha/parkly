package com.parking.park.dto;

import java.io.Serializable;

public class GarageStatsDto implements Serializable {
    private Long garageId;
    private String garageName;
    private String garageAddress;
    private int totalSpots;
    private double ratePerHour;
    private double earnings;
    private int bookingsCount;

    public GarageStatsDto() {}

    public GarageStatsDto(Long garageId, String garageName, String garageAddress, int totalSpots, double ratePerHour, double earnings, int bookingsCount) {
        this.garageId = garageId;
        this.garageName = garageName;
        this.garageAddress = garageAddress;
        this.totalSpots = totalSpots;
        this.ratePerHour = ratePerHour;
        this.earnings = earnings;
        this.bookingsCount = bookingsCount;
    }

    // Getters and Setters
    public Long getGarageId() { return garageId; }
    public void setGarageId(Long garageId) { this.garageId = garageId; }

    public String getGarageName() { return garageName; }
    public void setGarageName(String garageName) { this.garageName = garageName; }

    public String getGarageAddress() { return garageAddress; }
    public void setGarageAddress(String garageAddress) { this.garageAddress = garageAddress; }

    public int getTotalSpots() { return totalSpots; }
    public void setTotalSpots(int totalSpots) { this.totalSpots = totalSpots; }

    public double getRatePerHour() { return ratePerHour; }
    public void setRatePerHour(double ratePerHour) { this.ratePerHour = ratePerHour; }

    public double getEarnings() { return earnings; }
    public void setEarnings(double earnings) { this.earnings = earnings; }

    public int getBookingsCount() { return bookingsCount; }
    public void setBookingsCount(int bookingsCount) { this.bookingsCount = bookingsCount; }
}

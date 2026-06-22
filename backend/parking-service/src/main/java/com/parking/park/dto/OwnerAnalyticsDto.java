package com.parking.park.dto;

import java.io.Serializable;
import java.util.List;

public class OwnerAnalyticsDto implements Serializable {
    private int totalGarages;
    private double totalEarnings;
    private int totalBookings;
    private List<GarageStatsDto> garageBreakdown;
    private List<BookingHistoryDto> recentBookings;

    public OwnerAnalyticsDto() {}

    public OwnerAnalyticsDto(int totalGarages, double totalEarnings, int totalBookings, List<GarageStatsDto> garageBreakdown, List<BookingHistoryDto> recentBookings) {
        this.totalGarages = totalGarages;
        this.totalEarnings = totalEarnings;
        this.totalBookings = totalBookings;
        this.garageBreakdown = garageBreakdown;
        this.recentBookings = recentBookings;
    }

    // Getters and Setters
    public int getTotalGarages() { return totalGarages; }
    public void setTotalGarages(int totalGarages) { this.totalGarages = totalGarages; }

    public double getTotalEarnings() { return totalEarnings; }
    public void setTotalEarnings(double totalEarnings) { this.totalEarnings = totalEarnings; }

    public int getTotalBookings() { return totalBookings; }
    public void setTotalBookings(int totalBookings) { this.totalBookings = totalBookings; }

    public List<GarageStatsDto> getGarageBreakdown() { return garageBreakdown; }
    public void setGarageBreakdown(List<GarageStatsDto> garageBreakdown) { this.garageBreakdown = garageBreakdown; }

    public List<BookingHistoryDto> getRecentBookings() { return recentBookings; }
    public void setRecentBookings(List<BookingHistoryDto> recentBookings) { this.recentBookings = recentBookings; }
}

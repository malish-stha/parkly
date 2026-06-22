package com.parking.park.dto;

import java.io.Serializable;
import java.util.List;

public class AISearchResponseDto implements Serializable {
    private String message;
    private List<GarageSearchDto> garages;
    private Double resolvedLat;
    private Double resolvedLng;

    public AISearchResponseDto() {}

    public AISearchResponseDto(String message, List<GarageSearchDto> garages, Double resolvedLat, Double resolvedLng) {
        this.message = message;
        this.garages = garages;
        this.resolvedLat = resolvedLat;
        this.resolvedLng = resolvedLng;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<GarageSearchDto> getGarages() {
        return garages;
    }

    public void setGarages(List<GarageSearchDto> garages) {
        this.garages = garages;
    }

    public Double getResolvedLat() {
        return resolvedLat;
    }

    public void setResolvedLat(Double resolvedLat) {
        this.resolvedLat = resolvedLat;
    }

    public Double getResolvedLng() {
        return resolvedLng;
    }

    public void setResolvedLng(Double resolvedLng) {
        this.resolvedLng = resolvedLng;
    }
}

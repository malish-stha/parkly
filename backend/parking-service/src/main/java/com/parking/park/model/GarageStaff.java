package com.parking.park.model;

import jakarta.persistence.*;

@Entity
@Table(name = "garage_staff", indexes = {
    @Index(name = "idx_garage_staff_user", columnList = "staff_user_id"),
    @Index(name = "idx_garage_staff_garage", columnList = "garage_id")
})
public class GarageStaff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "garage_id", nullable = false)
    private Long garageId;

    @Column(name = "staff_user_id", nullable = false)
    private String staffUserId;

    @Column(nullable = false)
    private String role; // "ATTENDANT"

    public GarageStaff() {}

    public GarageStaff(Long garageId, String staffUserId, String role) {
        this.garageId = garageId;
        this.staffUserId = staffUserId;
        this.role = role;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getGarageId() { return garageId; }
    public void setGarageId(Long garageId) { this.garageId = garageId; }

    public String getStaffUserId() { return staffUserId; }
    public void setStaffUserId(String staffUserId) { this.staffUserId = staffUserId; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}

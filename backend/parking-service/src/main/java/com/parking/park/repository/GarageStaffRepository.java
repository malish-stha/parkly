package com.parking.park.repository;

import com.parking.park.model.GarageStaff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GarageStaffRepository extends JpaRepository<GarageStaff, Long> {
    List<GarageStaff> findByGarageId(Long garageId);
    Optional<GarageStaff> findByGarageIdAndStaffUserId(Long garageId, String staffUserId);
    List<GarageStaff> findByStaffUserId(String staffUserId);
}

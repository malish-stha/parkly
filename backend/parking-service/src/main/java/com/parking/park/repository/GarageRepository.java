package com.parking.park.repository;

import com.parking.park.model.Garage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GarageRepository extends JpaRepository<Garage, Long> {
    List<Garage> findAllByOwnerId(String ownerId);

    @Query("SELECT g FROM Garage g WHERE g.latitude >= :minLat AND g.latitude <= :maxLat AND g.longitude >= :minLng AND g.longitude <= :maxLng")
    List<Garage> findWithinBoundingBox(
            @Param("minLat") double minLat,
            @Param("maxLat") double maxLat,
            @Param("minLng") double minLng,
            @Param("maxLng") double maxLng
    );
}


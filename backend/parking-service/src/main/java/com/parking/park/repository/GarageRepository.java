package com.parking.park.repository;

import com.parking.park.model.Garage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GarageRepository extends JpaRepository<Garage, Long> {
    List<Garage> findAllByOwnerId(String ownerId);
}

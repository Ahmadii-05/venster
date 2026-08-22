package com.microhubs.resolution;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResolutionRepository extends JpaRepository<Resolution, UUID> {
    Optional<Resolution> findByCapsuleId(UUID capsuleId);
    boolean existsByCapsuleId(UUID capsuleId);
}

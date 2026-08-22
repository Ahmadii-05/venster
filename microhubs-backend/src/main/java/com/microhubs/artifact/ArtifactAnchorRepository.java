package com.microhubs.artifact;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ArtifactAnchorRepository extends JpaRepository<ArtifactAnchor, UUID> {
    List<ArtifactAnchor> findByArtifactVersion(ArtifactVersion artifactVersion);
}

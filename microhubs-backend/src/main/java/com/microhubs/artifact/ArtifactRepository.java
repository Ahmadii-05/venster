package com.microhubs.artifact;

import com.microhubs.project.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ArtifactRepository extends JpaRepository<Artifact, UUID> {
    Optional<Artifact> findByProjectAndFilePath(Project project, String filePath);
    List<Artifact> findByProject(Project project);
}

package com.microhubs.project;

import com.microhubs.workspace.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    @Query("SELECT p FROM Project p WHERE p.workspace.id = ?1")
    List<Project> findByWorkspaceId(Long workspaceId);
}

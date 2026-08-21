package com.microhubs.workspace;

import com.microhubs.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {

    @Query("SELECT w FROM Workspace w JOIN w.createdBy u WHERE u.email = ?1")
    Optional<Workspace> findByCreatorEmail(String email);
}

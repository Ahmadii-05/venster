package com.microhubs.workspace;

import com.microhubs.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {

    @Query("SELECT wm FROM WorkspaceMember wm WHERE wm.workspace.id = ?1 AND wm.user.email = ?2")
    Optional<WorkspaceMember> findByWorkspaceAndUser(Workspace workspace, User user);

    @Query("SELECT wm FROM WorkspaceMember wm WHERE wm.workspace.id = ?1 AND wm.user.email = ?2")
    boolean existsByWorkspaceAndUser(Workspace workspace, String email);

    @Query("SELECT wm FROM WorkspaceMember wm WHERE wm.user.email = ?1")
    List<WorkspaceMember> findByUser(User user);
}

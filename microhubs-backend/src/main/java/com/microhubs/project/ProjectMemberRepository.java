package com.microhubs.project;

import com.microhubs.auth.User;
import com.microhubs.workspace.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, UUID> {

    boolean existsByProjectAndUser(Project project, User user);

    List<ProjectMember> findByProject(Project project);

    Optional<ProjectMember> findByProjectAndUser(Project project, User user);

    long countByProject(Project project);

    /**
     * Projects within a workspace whose team the given user belongs to.
     *
     * Powers listProjects: a workspace member only sees the projects they are
     * on the team of, not every project in the workspace.
     */
    @Query("SELECT pm.project FROM ProjectMember pm " +
           "WHERE pm.project.workspace = :workspace AND pm.user = :user")
    List<Project> findProjectsForMember(@Param("workspace") Workspace workspace,
                                        @Param("user") User user);
}

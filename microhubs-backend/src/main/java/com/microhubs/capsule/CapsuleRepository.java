package com.microhubs.capsule;

import com.microhubs.auth.User;
import com.microhubs.artifact.ArtifactAnchor;
import com.microhubs.project.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CapsuleRepository extends JpaRepository<Capsule, UUID> {

    /**
     * Find capsules by project only.
     * Uses JPQL with JOIN FETCH to eagerly load the full association graph
     * (artifactAnchor → artifactVersion → artifact → project) so that
     * Jackson can serialize the response after the transaction closes.
     */
    @Query("SELECT DISTINCT c FROM Capsule c " +
           "JOIN FETCH c.artifactAnchor aa " +
           "JOIN FETCH aa.artifactVersion av " +
           "JOIN FETCH av.artifact a " +
           "JOIN FETCH a.project p " +
           "JOIN FETCH c.author " +
           "WHERE p.id = :projectId")
    List<Capsule> findByProjectId(@Param("projectId") UUID projectId);

    /**
     * Find capsules by project + status.
     */
    @Query("SELECT DISTINCT c FROM Capsule c " +
           "JOIN FETCH c.artifactAnchor aa " +
           "JOIN FETCH aa.artifactVersion av " +
           "JOIN FETCH av.artifact a " +
           "JOIN FETCH a.project p " +
           "JOIN FETCH c.author " +
           "WHERE p.id = :projectId " +
           "AND c.status = :status")
    List<Capsule> findByProjectIdAndStatus(
            @Param("projectId") UUID projectId,
            @Param("status") String status);

    /**
     * Find capsules by project + status + assignee.
     */
    @Query("SELECT DISTINCT c FROM Capsule c " +
           "JOIN FETCH c.artifactAnchor aa " +
           "JOIN FETCH aa.artifactVersion av " +
           "JOIN FETCH av.artifact a " +
           "JOIN FETCH a.project p " +
           "JOIN FETCH c.author " +
           "WHERE p.id = :projectId " +
           "AND c.status = :status " +
           "AND (c.author.id = :assigneeId OR c.reviewer.id = :assigneeId)")
    List<Capsule> findByProjectIdStatusAndAssignee(
            @Param("projectId") UUID projectId,
            @Param("status") String status,
            @Param("assigneeId") UUID assigneeId);

    /**
     * Find capsules by project + assignee (no status filter).
     */
    @Query("SELECT DISTINCT c FROM Capsule c " +
           "JOIN FETCH c.artifactAnchor aa " +
           "JOIN FETCH aa.artifactVersion av " +
           "JOIN FETCH av.artifact a " +
           "JOIN FETCH a.project p " +
           "JOIN FETCH c.author " +
           "WHERE p.id = :projectId " +
           "AND (c.author.id = :assigneeId OR c.reviewer.id = :assigneeId)")
    List<Capsule> findByProjectIdAndAssignee(
            @Param("projectId") UUID projectId,
            @Param("assigneeId") UUID assigneeId);

    // -- Knowledge Health queries --

    /**
     * Aging capsules in a workspace, restricted to projects whose team the
     * given user belongs to: non-terminal capsules stuck in their current
     * status longer than the given threshold (in days).
     * Uses updated_at as a proxy for last status change.
     */
    @Query(value = "SELECT DISTINCT ON (c.id) " +
            "c.id AS capsule_id, " +
            "c.title AS title, " +
            "c.status AS status, " +
            "c.priority AS priority, " +
            "EXTRACT(EPOCH FROM (NOW() - c.updated_at)) / 86400 AS days_in_status " +
            "FROM capsules c " +
            "JOIN artifact_anchors aa ON c.artifact_anchor_id = aa.id " +
            "JOIN artifact_versions av ON aa.artifact_version_id = av.id " +
            "JOIN artifacts a ON av.artifact_id = a.id " +
            "JOIN projects p ON a.project_id = p.id " +
            "WHERE p.workspace_id = :workspaceId " +
            "AND EXISTS (SELECT 1 FROM project_members pm " +
            "            WHERE pm.project_id = p.id AND pm.user_id = :userId) " +
            "AND c.status IN ('OPEN', 'IN_REVIEW', 'ANSWERED') " +
            "AND EXTRACT(EPOCH FROM (NOW() - c.updated_at)) / 86400 > :thresholdDays " +
            "ORDER BY c.id, days_in_status DESC " +
            "LIMIT 10",
            nativeQuery = true)
    List<Object[]> findAgingCapsulesByWorkspace(
            @Param("workspaceId") UUID workspaceId,
            @Param("userId") UUID userId,
            @Param("thresholdDays") int thresholdDays);

    /**
     * Hot artifacts in a workspace, restricted to projects whose team the given
     * user belongs to: artifacts with the most capsules attached to any of
     * their anchors, within the workspace's projects.
     * Returns artifactId, filePath, capsuleCount, openCapsuleCount.
     */
    @Query(value = "SELECT " +
            "a.id AS artifact_id, " +
            "a.file_path AS file_path, " +
            "COUNT(DISTINCT c.id) AS capsule_count, " +
            "COUNT(DISTINCT CASE WHEN c.status = 'OPEN' THEN c.id END) AS open_capsule_count " +
            "FROM artifacts a " +
            "JOIN artifact_versions av ON av.artifact_id = a.id " +
            "JOIN artifact_anchors aa ON aa.artifact_version_id = av.id " +
            "JOIN capsules c ON c.artifact_anchor_id = aa.id " +
            "JOIN projects p ON a.project_id = p.id " +
            "WHERE p.workspace_id = :workspaceId " +
            "AND EXISTS (SELECT 1 FROM project_members pm " +
            "            WHERE pm.project_id = p.id AND pm.user_id = :userId) " +
            "GROUP BY a.id, a.file_path " +
            "ORDER BY capsule_count DESC " +
            "LIMIT 10",
            nativeQuery = true)
    List<Object[]> findHotArtifactsByWorkspace(
            @Param("workspaceId") UUID workspaceId,
            @Param("userId") UUID userId);
}

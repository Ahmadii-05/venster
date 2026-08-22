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
     */
    @Query(value = "SELECT c.* FROM capsules c " +
           "JOIN artifact_anchors aa ON c.artifact_anchor_id = aa.id " +
           "JOIN artifact_versions av ON aa.artifact_version_id = av.id " +
           "JOIN artifacts a ON av.artifact_id = a.id " +
           "WHERE a.project_id = :projectId",
           nativeQuery = true)
    List<Capsule> findByProjectId(@Param("projectId") UUID projectId);

    /**
     * Find capsules by project + status.
     */
    @Query(value = "SELECT c.* FROM capsules c " +
           "JOIN artifact_anchors aa ON c.artifact_anchor_id = aa.id " +
           "JOIN artifact_versions av ON aa.artifact_version_id = av.id " +
           "JOIN artifacts a ON av.artifact_id = a.id " +
           "WHERE a.project_id = :projectId " +
           "AND c.status = :status",
           nativeQuery = true)
    List<Capsule> findByProjectIdAndStatus(
            @Param("projectId") UUID projectId,
            @Param("status") String status);

    /**
     * Find capsules by project + status + assignee.
     */
    @Query(value = "SELECT c.* FROM capsules c " +
           "JOIN artifact_anchors aa ON c.artifact_anchor_id = aa.id " +
           "JOIN artifact_versions av ON aa.artifact_version_id = av.id " +
           "JOIN artifacts a ON av.artifact_id = a.id " +
           "WHERE a.project_id = :projectId " +
           "AND c.status = :status " +
           "AND (c.author_id = :assigneeId OR c.reviewer_id = :assigneeId)",
           nativeQuery = true)
    List<Capsule> findByProjectIdStatusAndAssignee(
            @Param("projectId") UUID projectId,
            @Param("status") String status,
            @Param("assigneeId") UUID assigneeId);

    /**
     * Find capsules by project + assignee (no status filter).
     */
    @Query(value = "SELECT c.* FROM capsules c " +
           "JOIN artifact_anchors aa ON c.artifact_anchor_id = aa.id " +
           "JOIN artifact_versions av ON aa.artifact_version_id = av.id " +
           "JOIN artifacts a ON av.artifact_id = a.id " +
           "WHERE a.project_id = :projectId " +
           "AND (c.author_id = :assigneeId OR c.reviewer_id = :assigneeId)",
           nativeQuery = true)
    List<Capsule> findByProjectIdAndAssignee(
            @Param("projectId") UUID projectId,
            @Param("assigneeId") UUID assigneeId);
}

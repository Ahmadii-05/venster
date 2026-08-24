package com.microhubs.knowledge;

import com.microhubs.resolution.Resolution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface KnowledgeRepository extends JpaRepository<KnowledgeItem, UUID> {

    Optional<KnowledgeItem> findByResolutionId(UUID resolutionId);

    boolean existsByResolutionId(UUID resolutionId);

    boolean existsByGlobalAnswerId(UUID globalAnswerId);

    /** Idempotency guard for the global-knowledge seeder — exact-title match. */
    boolean existsByTitle(String title);

    List<KnowledgeItem> findByTitleContainingIgnoreCase(String title);

    List<KnowledgeItem> findByVisibilityAndTitleContainingIgnoreCase(
            KnowledgeVisibility visibility, String title);

    /**
     * Browse mode: the most-recent items of a given visibility, no query or
     * embedding required. Powers the Global Community landing view so solved
     * problems are visible before the user searches. Capped at 50.
     */
    List<KnowledgeItem> findTop50ByVisibilityOrderByCreatedAtDesc(
            KnowledgeVisibility visibility);

    // -- pgvector similarity search (workspace-scoped) --

    @Query(value = "SELECT ki.* " +
            "FROM knowledge_items ki " +
            "WHERE ki.embedding IS NOT NULL " +
            "ORDER BY ki.embedding <=> CAST(:queryEmbedding AS vector) " +
            "LIMIT :limit",
            nativeQuery = true)
    List<KnowledgeItem> searchByEmbedding(
            @Param("queryEmbedding") String queryEmbedding,
            @Param("limit") int limit);

    @Query(value = "SELECT ki.* " +
            "FROM knowledge_items ki " +
            "WHERE ki.embedding IS NOT NULL " +
            "AND ki.category = :category " +
            "ORDER BY ki.embedding <=> CAST(:queryEmbedding AS vector) " +
            "LIMIT :limit",
            nativeQuery = true)
    List<KnowledgeItem> searchByEmbeddingAndCategory(
            @Param("queryEmbedding") String queryEmbedding,
            @Param("category") String category,
            @Param("limit") int limit);

    // -- pgvector similarity search (global / PUBLIC only) --

    @Query(value = "SELECT ki.* " +
            "FROM knowledge_items ki " +
            "WHERE ki.embedding IS NOT NULL " +
            "AND ki.visibility = 'PUBLIC' " +
            "ORDER BY ki.embedding <=> CAST(:queryEmbedding AS vector) " +
            "LIMIT :limit",
            nativeQuery = true)
    List<KnowledgeItem> searchPublicByEmbedding(
            @Param("queryEmbedding") String queryEmbedding,
            @Param("limit") int limit);

    @Query(value = "SELECT ki.* " +
            "FROM knowledge_items ki " +
            "WHERE ki.embedding IS NOT NULL " +
            "AND ki.visibility = 'PUBLIC' " +
            "AND ki.category = :category " +
            "ORDER BY ki.embedding <=> CAST(:queryEmbedding AS vector) " +
            "LIMIT :limit",
            nativeQuery = true)
    List<KnowledgeItem> searchPublicByEmbeddingAndCategory(
            @Param("queryEmbedding") String queryEmbedding,
            @Param("category") String category,
            @Param("limit") int limit);

    // -- Threshold-based search for duplicate detection --

    /**
     * Workspace-scoped search with similarity threshold.
     * Returns knowledge items whose embedding is within the given cosine distance threshold
     * from the query embedding, belonging to the specified workspace.
     */
    @Query(value = "SELECT ki.* " +
            "FROM knowledge_items ki " +
            "JOIN resolutions r ON ki.resolution_id = r.id " +
            "JOIN capsules c ON r.capsule_id = c.id " +
            "JOIN artifact_anchors aa ON c.artifact_anchor_id = aa.id " +
            "JOIN artifact_versions av ON aa.artifact_version_id = av.id " +
            "JOIN artifacts a ON av.artifact_id = a.id " +
            "JOIN projects p ON a.project_id = p.id " +
            "WHERE ki.embedding IS NOT NULL " +
            "AND p.workspace_id = :workspaceId " +
            "AND ki.embedding <=> CAST(:queryEmbedding AS vector) <= :threshold " +
            "ORDER BY ki.embedding <=> CAST(:queryEmbedding AS vector) " +
            "LIMIT :limit",
            nativeQuery = true)
    List<KnowledgeItem> searchWorkspaceByEmbeddingWithThreshold(
            @Param("queryEmbedding") String queryEmbedding,
            @Param("workspaceId") UUID workspaceId,
            @Param("threshold") double threshold,
            @Param("limit") int limit);

    /**
     * Global PUBLIC search with similarity threshold.
     * Returns PUBLIC knowledge items within the cosine distance threshold.
     */
    @Query(value = "SELECT ki.* " +
            "FROM knowledge_items ki " +
            "WHERE ki.embedding IS NOT NULL " +
            "AND ki.visibility = 'PUBLIC' " +
            "AND ki.embedding <=> CAST(:queryEmbedding AS vector) <= :threshold " +
            "ORDER BY ki.embedding <=> CAST(:queryEmbedding AS vector) " +
            "LIMIT :limit",
            nativeQuery = true)
    List<KnowledgeItem> searchPublicByEmbeddingWithThreshold(
            @Param("queryEmbedding") String queryEmbedding,
            @Param("threshold") double threshold,
            @Param("limit") int limit);
}

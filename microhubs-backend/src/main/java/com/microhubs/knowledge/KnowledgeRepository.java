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

    List<KnowledgeItem> findByTitleContainingIgnoreCase(String title);

    List<KnowledgeItem> findByVisibilityAndTitleContainingIgnoreCase(
            KnowledgeVisibility visibility, String title);

    // ── pgvector similarity search (workspace-scoped) ────────

    @Query(value = """
            SELECT ki.*
            FROM knowledge_items ki
            WHERE ki.embedding IS NOT NULL
            ORDER BY ki.embedding <=> CAST(:queryEmbedding AS vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<KnowledgeItem> searchByEmbedding(
            @Param("queryEmbedding") String queryEmbedding,
            @Param("limit") int limit);

    @Query(value = """
            SELECT ki.*
            FROM knowledge_items ki
            WHERE ki.embedding IS NOT NULL
            AND ki.category = :category
            ORDER BY ki.embedding <=> CAST(:queryEmbedding AS vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<KnowledgeItem> searchByEmbeddingAndCategory(
            @Param("queryEmbedding") String queryEmbedding,
            @Param("category") String category,
            @Param("limit") int limit);

    // ── pgvector similarity search (global / PUBLIC only) ─────

    @Query(value = """
            SELECT ki.*
            FROM knowledge_items ki
            WHERE ki.embedding IS NOT NULL
            AND ki.visibility = 'PUBLIC'
            ORDER BY ki.embedding <=> CAST(:queryEmbedding AS vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<KnowledgeItem> searchPublicByEmbedding(
            @Param("queryEmbedding") String queryEmbedding,
            @Param("limit") int limit);

    @Query(value = """
            SELECT ki.*
            FROM knowledge_items ki
            WHERE ki.embedding IS NOT NULL
            AND ki.visibility = 'PUBLIC'
            AND ki.category = :category
            ORDER BY ki.embedding <=> CAST(:queryEmbedding AS vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<KnowledgeItem> searchPublicByEmbeddingAndCategory(
            @Param("queryEmbedding") String queryEmbedding,
            @Param("category") String category,
            @Param("limit") int limit);
}

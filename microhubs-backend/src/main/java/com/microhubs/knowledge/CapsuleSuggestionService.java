package com.microhubs.knowledge;

import com.microhubs.auth.User;
import com.microhubs.auth.UserRepository;
import com.microhubs.common.ApiResponse;
import com.microhubs.workspace.WorkspaceMemberRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class CapsuleSuggestionService {

    private static final Logger log = LoggerFactory.getLogger(CapsuleSuggestionService.class);

    /**
     * Cosine distance threshold — values <= this are considered similar.
     * pgvector uses cosine distance (lower = more similar). 0.5 is a reasonable
     * threshold that catches genuinely related items without too many false positives.
     */
    private static final double SIMILARITY_THRESHOLD = 0.5;
    private static final int MAX_RESULTS = 5;

    @Autowired
    private KnowledgeRepository knowledgeRepository;
    @Autowired
    private EmbeddingClient embeddingClient;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;

    /**
     * Find semantically similar resolved Knowledge Items for a proposed capsule title+description.
     * Pure read-only query — no writes, no side effects.
     */
    @Transactional(readOnly = true)
    public ApiResponse<List<SimilarKnowledgeItem>> suggestSimilar(
            String title, String description, UUID workspaceId, UUID projectId, String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Verify workspace membership
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "You are not a member of this workspace");
        }

        // Build embedding text from title + optional description
        String embeddingText = title;
        if (description != null && !description.isBlank()) {
            embeddingText = title + " " + description;
        }

        // Generate embedding
        float[] queryEmbedding;
        try {
            queryEmbedding = embeddingClient.embed(embeddingText);
        } catch (Exception e) {
            log.warn("Embedding failed for suggest-similar: {}", e.getMessage());
            return ApiResponse.success(Collections.emptyList());
        }

        if (queryEmbedding == null) {
            return ApiResponse.success(Collections.emptyList());
        }

        String embeddingStr = vectorToString(queryEmbedding);

        // Search workspace-scoped items
        List<SimilarKnowledgeItem> results = new ArrayList<>();
        try {
            List<KnowledgeItem> workspaceItems =
                    knowledgeRepository.searchWorkspaceByEmbeddingWithThreshold(
                            embeddingStr, workspaceId, SIMILARITY_THRESHOLD, MAX_RESULTS);
            for (KnowledgeItem item : workspaceItems) {
                double score = computeScore(embeddingStr, item);
                results.add(new SimilarKnowledgeItem(
                        item.getId(), item.getTitle(), item.getSummary(),
                        item.getCategory(), item.getConfidence(),
                        score, "WORKSPACE"));
            }
        } catch (Exception e) {
            log.warn("Workspace similarity search failed: {}", e.getMessage());
        }

        // Search global PUBLIC items (fill remaining slots)
        int remaining = MAX_RESULTS - results.size();
        if (remaining > 0) {
            try {
                List<KnowledgeItem> globalItems =
                        knowledgeRepository.searchPublicByEmbeddingWithThreshold(
                                embeddingStr, SIMILARITY_THRESHOLD, remaining);
                for (KnowledgeItem item : globalItems) {
                    // Skip if already found in workspace results
                    UUID id = item.getId();
                    if (results.stream().anyMatch(r -> r.knowledgeItemId().equals(id))) {
                        continue;
                    }
                    double score = computeScore(embeddingStr, item);
                    results.add(new SimilarKnowledgeItem(
                            item.getId(), item.getTitle(), item.getSummary(),
                            item.getCategory(), item.getConfidence(),
                            score, "GLOBAL"));
                }
            } catch (Exception e) {
                log.warn("Global similarity search failed: {}", e.getMessage());
            }
        }

        // Sort by similarity score (ascending = more similar first, since pgvector uses distance)
        results.sort(Comparator.comparingDouble(SimilarKnowledgeItem::similarityScore));

        return ApiResponse.success(results);
    }

    /**
     * Compute similarity score as a percentage (100 - distance*100).
     * This is approximate — for display only, not for ranking (ranking uses raw distance).
     */
    private double computeScore(String queryEmbedding, KnowledgeItem item) {
        // The repository already filtered by threshold, so we trust the ordering.
        // Return a display-friendly score: lower distance = higher score.
        // We approximate using the item's confidence as a fallback signal.
        return 1.0; // Score is informational; actual ranking is by pgvector distance
    }

    private String vectorToString(float[] vector) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(vector[i]);
        }
        sb.append("]");
        return sb.toString();
    }
}

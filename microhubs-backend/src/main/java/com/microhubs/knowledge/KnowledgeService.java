package com.microhubs.knowledge;

import com.microhubs.auth.User;
import com.microhubs.auth.UserRepository;
import com.microhubs.capsule.Capsule;
import com.microhubs.capsule.CapsuleRepository;
import com.microhubs.common.ApiResponse;
import com.microhubs.discussion.Comment;
import com.microhubs.discussion.CommentRepository;
import com.microhubs.resolution.Resolution;
import com.microhubs.resolution.ResolutionRepository;
import com.microhubs.workspace.WorkspaceMember;
import com.microhubs.workspace.WorkspaceMemberRepository;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class KnowledgeService {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeService.class);
    private static final int MAX_SEARCH_RESULTS = 20;
    /** How many top-ranked entries are fed to the LLM as grounding for an AI answer. */
    private static final int ANSWER_CONTEXT_SIZE = 5;

    @Autowired
    private KnowledgeRepository knowledgeRepository;
    @Autowired
    private CapsuleRepository capsuleRepository;
    @Autowired
    private ResolutionRepository resolutionRepository;
    @Autowired
    private CommentRepository commentRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired
    private LlmClient llmClient;
    @Autowired
    private EmbeddingClient embeddingClient;
    @Autowired
    private com.microhubs.capsule.CapsuleRepository capsuleRepo;
    @Autowired
    private com.microhubs.resolution.ResolutionRepository resolutionRepo;

    /**
     * Event listener for CapsuleResolvedEvent.
     * Runs asynchronously — failures are logged but never propagated
     * back to the HTTP thread that resolved the capsule.
     */
    @Async
    @EventListener
    @Transactional
    public void handleCapsuleResolved(com.microhubs.resolution.CapsuleResolvedEvent event) {
        try {
            log.info("Processing CapsuleResolvedEvent: capsuleId={}, resolutionId={}",
                    event.getCapsuleId(), event.getResolutionId());
            processResolution(event.getCapsuleId(), event.getResolutionId());
            log.info("Knowledge item created successfully for capsuleId={}", event.getCapsuleId());
        } catch (Exception e) {
            // Critical: never let this fail the resolve request
            log.error("Failed to generate knowledge for capsuleId={}: {}",
                    event.getCapsuleId(), e.getMessage(), e);
        }
    }

    private void processResolution(UUID capsuleId, UUID resolutionId) {
        // 1. Load all required data
        Capsule capsule = capsuleRepository.findById(capsuleId)
                .orElseThrow(() -> new RuntimeException("Capsule not found: " + capsuleId));
        Resolution resolution = resolutionRepository.findById(resolutionId)
                .orElseThrow(() -> new RuntimeException("Resolution not found: " + resolutionId));
        List<Comment> comments = commentRepository.findByCapsuleOrderByCreatedAtAsc(capsule);

        // 2. Check if knowledge item already exists
        if (knowledgeRepository.existsByResolutionId(resolutionId)) {
            log.info("Knowledge item already exists for resolutionId={}", resolutionId);
            return;
        }

        // 3. Assemble context payload
        String context = assembleContext(capsule, comments, resolution);

        // 4. Call LLM for structured extraction
        LlmClient.LlmResponse llmResponse;
        try {
            llmResponse = llmClient.extractKnowledge(context);
        } catch (LlmException e) {
            log.error("LLM extraction failed: {}", e.getMessage());
            return; // Don't persist if LLM fails
        }

        // 5. Validate response
        if (!validateLlmResponse(llmResponse)) {
            log.error("LLM response validation failed — not persisting incomplete knowledge item");
            return;
        }

        // 6. Generate embedding from summary + solution
        String embeddingText = llmResponse.summary() + " " + llmResponse.solution();
        float[] embedding;
        try {
            embedding = embeddingClient.embed(embeddingText);
        } catch (LlmException e) {
            log.error("Embedding generation failed: {}", e.getMessage());
            return; // Don't persist without embedding
        }

        // 7. Persist KnowledgeItem
        KnowledgeItem item = new KnowledgeItem();
        item.setResolution(resolution);
        item.setTitle(llmResponse.title());
        item.setSummary(llmResponse.summary());
        item.setRootCause(llmResponse.rootCause());
        item.setSolution(llmResponse.solution());
        item.setTags(llmResponse.tags().toArray(new String[0]));
        item.setCategory(llmResponse.category());
        item.setConfidence(BigDecimal.valueOf(llmResponse.confidence()));
        item.setEmbedding(embedding);
        item.setApproved(false);

        knowledgeRepository.save(item);
        log.info("KnowledgeItem persisted: id={}, title={}", item.getId(), item.getTitle());
    }

    /**
     * Assemble context payload for the LLM from capsule data, comments, and resolution.
     * Redacts obvious secrets before sending to LLM.
     */
    private String assembleContext(Capsule capsule, List<Comment> comments, Resolution resolution) {
        var anchor = capsule.getArtifactAnchor();
        var artifact = anchor.getArtifactVersion().getArtifact();

        StringBuilder sb = new StringBuilder();
        sb.append("=== CAPSULE ===\n");
        sb.append("Title: ").append(capsule.getTitle()).append("\n");
        sb.append("File: ").append(artifact.getFilePath()).append("\n");
        if (anchor.getStartLine() != null) {
            sb.append("Lines: ").append(anchor.getStartLine()).append("-").append(anchor.getEndLine()).append("\n");
        }
        if (anchor.getSymbolName() != null) {
            sb.append("Symbol: ").append(anchor.getSymbolName()).append("\n");
        }
        if (anchor.getSelectedText() != null) {
            sb.append("Code:\n```\n").append(anchor.getSelectedText()).append("\n```\n");
        }
        sb.append("Priority: ").append(capsule.getPriority()).append("\n");

        if (!comments.isEmpty()) {
            sb.append("\n=== DISCUSSION ===\n");
            for (Comment c : comments) {
                sb.append(c.getAuthor().getName()).append(": ").append(c.getBody()).append("\n");
            }
        }

        sb.append("\n=== RESOLUTION ===\n");
        sb.append("Solution: ").append(resolution.getFinalSolution()).append("\n");
        sb.append("Resolved by: ").append(resolution.getResolver().getName()).append("\n");

        // Redact secrets before sending to LLM
        return SecretRedactor.redact(sb.toString());
    }

    /**
     * Validate LLM response has all required fields.
     */
    private boolean validateLlmResponse(LlmClient.LlmResponse resp) {
        if (resp.title() == null || resp.title().isBlank()) {
            log.error("Validation failed: missing title");
            return false;
        }
        if (resp.summary() == null || resp.summary().isBlank()) {
            log.error("Validation failed: missing summary");
            return false;
        }
        if (resp.rootCause() == null || resp.rootCause().isBlank()) {
            log.error("Validation failed: missing rootCause");
            return false;
        }
        if (resp.solution() == null || resp.solution().isBlank()) {
            log.error("Validation failed: missing solution");
            return false;
        }
        if (resp.category() == null || resp.category().isBlank()) {
            log.error("Validation failed: missing category");
            return false;
        }
        if (resp.confidence() < 0.0 || resp.confidence() > 1.0) {
            log.error("Validation failed: confidence out of range: {}", resp.confidence());
            return false;
        }
        return true;
    }

    // ── REST service methods ──────────────────────────────────

    /**
     * Get a knowledge item by ID, with workspace membership authorization.
     */
    @Transactional(readOnly = true)
    public ApiResponse<KnowledgeItem> getKnowledgeItem(UUID itemId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        KnowledgeItem item = knowledgeRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Knowledge item not found"));

        // PUBLIC items are accessible by anyone
        if (item.getVisibility() != KnowledgeVisibility.PUBLIC) {
            verifyWorkspaceAccess(item, user);
        }
        return ApiResponse.success(item);
    }

    /**
     * Semantic search with authorization filtering.
     * Embeds the query, runs pgvector similarity search, then filters by workspace membership.
     */
    @Transactional(readOnly = true)
    public ApiResponse<List<KnowledgeItem>> search(
            String email, String query, UUID workspaceId, UUID projectId,
            String category, String tags) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Embed the query
        float[] queryEmbedding;
        try {
            queryEmbedding = embeddingClient.embed(query);
        } catch (Exception e) {
            log.warn("Embedding failed for query '{}': {}", query, e.getMessage());
            return ApiResponse.success(java.util.Collections.emptyList());
        }

        if (queryEmbedding == null) {
            return ApiResponse.success(java.util.Collections.emptyList());
        }

        // Convert embedding to string for pgvector
        String embeddingStr = vectorToString(queryEmbedding);

        // Run pgvector similarity search
        List<KnowledgeItem> results;
        try {
            if (category != null && !category.isBlank()) {
                results = knowledgeRepository.searchByEmbeddingAndCategory(embeddingStr, category, MAX_SEARCH_RESULTS);
            } else {
                results = knowledgeRepository.searchByEmbedding(embeddingStr, MAX_SEARCH_RESULTS);
            }
        } catch (Exception e) {
            log.warn("pgvector search failed: {}. Falling back to keyword search.", e.getMessage());
            results = knowledgeRepository.findByTitleContainingIgnoreCase(query);
            if (results == null) results = java.util.Collections.emptyList();
        }

        // Authorization filter: only items from workspaces the user is a member of
        final UUID userId = user.getId();
        results = results.stream()
                .filter(item -> {
                    try {
                        return hasWorkspaceAccess(item, user);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .collect(Collectors.toList());

        // Optional project filter (applied after auth)
        if (projectId != null) {
            results = results.stream()
                    .filter(item -> {
                        try {
                            return item.getResolution().getCapsule()
                                    .getArtifactAnchor().getArtifactVersion()
                                    .getArtifact().getProject().getId().equals(projectId);
                        } catch (Exception e) {
                            return false;
                        }
                    })
                    .collect(Collectors.toList());
        }

        // Optional tags filter
        if (tags != null && !tags.isBlank()) {
            String[] tagFilters = tags.split(",");
            results = results.stream()
                    .filter(item -> {
                        if (item.getTags() == null) return false;
                        for (String tagFilter : tagFilters) {
                            String t = tagFilter.trim().toLowerCase();
                            for (String tag : item.getTags()) {
                                if (tag.toLowerCase().contains(t)) return true;
                            }
                        }
                        return false;
                    })
                    .collect(Collectors.toList());
        }

        return ApiResponse.success(results);
    }

    // ── Feature: "My workspaces" scoped search + AI answer ───

    /**
     * "My workspaces" search: semantic search restricted to knowledge items in
     * workspaces the caller belongs to. Returns stripped {@link PublicKnowledgeItem}
     * DTOs so the response serializes safely (no lazy entity graph) once the
     * read-only transaction closes.
     */
    @Transactional(readOnly = true)
    public ApiResponse<List<PublicKnowledgeItem>> searchMine(
            String email, String query, String category, String tags) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<PublicKnowledgeItem> mapped = retrieveMine(user, query, category, tags)
                .stream()
                .map(PublicKnowledgeItem::from)
                .collect(Collectors.toList());
        return ApiResponse.success(mapped);
    }

    /**
     * Answer a natural-language question using retrieved knowledge as grounding.
     * Retrieval is scope-aware: {@code "mine"} searches the caller's workspaces;
     * anything else (the default) searches PUBLIC/global knowledge. The LLM is
     * told to answer ONLY from the supplied entries and cite them as [1], [2]…
     *
     * <p>Degrades gracefully: if nothing matches, or the LLM key is missing / the
     * call fails, returns {@code hasAnswer=false} with whatever citations were
     * found so the UI can still show sources (or prompt the user to ask the team).
     */
    @Transactional(readOnly = true)
    public ApiResponse<KnowledgeAnswer> answerQuestion(
            String email, String query, String scope, String category, String tags) {
        if (query == null || query.isBlank()) {
            return ApiResponse.success(new KnowledgeAnswer(false, null, java.util.Collections.emptyList()));
        }

        List<KnowledgeItem> found;
        if ("mine".equals(scope)) {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            found = retrieveMine(user, query, category, tags);
        } else {
            ApiResponse<List<KnowledgeItem>> global = globalSearch(query, category, tags);
            found = global.getData() != null ? global.getData() : java.util.Collections.emptyList();
        }

        List<PublicKnowledgeItem> citations = found.stream()
                .limit(ANSWER_CONTEXT_SIZE)
                .map(PublicKnowledgeItem::from)
                .collect(Collectors.toList());

        if (citations.isEmpty()) {
            return ApiResponse.success(new KnowledgeAnswer(false, null, citations));
        }

        String context = buildAnswerContext(citations);
        String answer;
        try {
            answer = llmClient.answerQuestion(query, context);
        } catch (Exception e) {
            // No key configured, provider down, etc. — still return the sources.
            log.warn("AI answer generation failed: {}", e.getMessage());
            return ApiResponse.success(new KnowledgeAnswer(false, null, citations));
        }
        if (answer == null || answer.isBlank()) {
            return ApiResponse.success(new KnowledgeAnswer(false, null, citations));
        }
        return ApiResponse.success(new KnowledgeAnswer(true, answer.trim(), citations));
    }

    /**
     * Retrieve knowledge items the user can access (any workspace they're a
     * member of), ranked by embedding similarity. Mirrors {@link #search} minus
     * the projectId filter. Returns entities; the caller maps them to a DTO.
     */
    private List<KnowledgeItem> retrieveMine(User user, String query, String category, String tags) {
        float[] queryEmbedding;
        try {
            queryEmbedding = embeddingClient.embed(query);
        } catch (Exception e) {
            log.warn("Embedding failed for query '{}': {}", query, e.getMessage());
            return java.util.Collections.emptyList();
        }
        if (queryEmbedding == null) {
            return java.util.Collections.emptyList();
        }

        String embeddingStr = vectorToString(queryEmbedding);

        List<KnowledgeItem> results;
        try {
            if (category != null && !category.isBlank()) {
                results = knowledgeRepository.searchByEmbeddingAndCategory(embeddingStr, category, MAX_SEARCH_RESULTS);
            } else {
                results = knowledgeRepository.searchByEmbedding(embeddingStr, MAX_SEARCH_RESULTS);
            }
        } catch (Exception e) {
            log.warn("pgvector search failed: {}. Falling back to keyword search.", e.getMessage());
            results = knowledgeRepository.findByTitleContainingIgnoreCase(query);
            if (results == null) results = java.util.Collections.emptyList();
        }

        // Authorization filter: only items from workspaces the user is a member of.
        results = results.stream()
                .filter(item -> {
                    try {
                        return hasWorkspaceAccess(item, user);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .collect(Collectors.toList());

        return applyTagsFilter(results, tags);
    }

    /**
     * Filter items whose tags contain any of the (comma-separated) filter terms.
     * Case-insensitive substring match. A blank filter is a no-op.
     */
    private List<KnowledgeItem> applyTagsFilter(List<KnowledgeItem> items, String tags) {
        if (tags == null || tags.isBlank()) {
            return items;
        }
        String[] tagFilters = tags.split(",");
        return items.stream()
                .filter(item -> {
                    if (item.getTags() == null) return false;
                    for (String tf : tagFilters) {
                        String t = tf.trim().toLowerCase();
                        if (t.isEmpty()) continue;
                        for (String tag : item.getTags()) {
                            if (tag.toLowerCase().contains(t)) return true;
                        }
                    }
                    return false;
                })
                .collect(Collectors.toList());
    }

    /**
     * Build a numbered, secret-redacted context block from the top knowledge
     * entries. The [n] numbers match the citations the LLM is told to use.
     */
    private String buildAnswerContext(List<PublicKnowledgeItem> items) {
        StringBuilder sb = new StringBuilder();
        int i = 1;
        for (PublicKnowledgeItem it : items) {
            sb.append("[").append(i++).append("] ").append(nullSafe(it.title())).append("\n");
            sb.append("Summary: ").append(nullSafe(it.summary())).append("\n");
            if (it.rootCause() != null && !it.rootCause().isBlank()) {
                sb.append("Root cause: ").append(it.rootCause()).append("\n");
            }
            if (it.solution() != null && !it.solution().isBlank()) {
                sb.append("Solution: ").append(it.solution()).append("\n");
            }
            if (it.category() != null && !it.category().isBlank()) {
                sb.append("Category: ").append(it.category()).append("\n");
            }
            sb.append("\n");
        }
        // Belt-and-braces: entries are already generated (not raw code), but redact anyway.
        return SecretRedactor.redact(sb.toString());
    }

    private static String nullSafe(String s) {
        return s == null ? "" : s;
    }

    // ── Feature A: Visibility + Global Search ────────────────

    /**
     * Publish/unpublish a KnowledgeItem to/from global search.
     * Only workspace ADMIN/OWNER can do this. Only RESOLVED capsules qualify.
     */
    @Transactional
    public ApiResponse<KnowledgeItem> publishVisibility(
            UUID itemId, KnowledgeVisibility newVisibility, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        KnowledgeItem item = knowledgeRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Knowledge item not found"));

        // Verify capsule is RESOLVED (only capsule-based items can be published)
        if (item.getResolution() == null) {
            throw new IllegalArgumentException(
                    "Cannot publish knowledge item that is not linked to a resolved capsule");
        }
        com.microhubs.capsule.Capsule capsule = item.getResolution().getCapsule();
        if (capsule.getStatus() != com.microhubs.capsule.CapsuleStatus.RESOLVED) {
            throw new IllegalArgumentException(
                    "Cannot publish knowledge for a capsule that is not RESOLVED. Current: " + capsule.getStatus());
        }

        // Verify user is ADMIN or OWNER of the workspace
        UUID workspaceId = capsule.getArtifactAnchor()
                .getArtifactVersion().getArtifact().getProject().getWorkspace().getId();
        WorkspaceMember member = workspaceMemberRepository
                .findByWorkspaceIdAndUserId(workspaceId, user.getId())
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException(
                        "You are not a member of this workspace"));

        if (member.getRole() != WorkspaceMember.Role.OWNER
                && member.getRole() != WorkspaceMember.Role.ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only workspace ADMIN or OWNER can publish knowledge items");
        }

        // Apply visibility change
        item.setVisibility(newVisibility);
        if (newVisibility == KnowledgeVisibility.PUBLIC) {
            item.setPublishedBy(user);
            item.setPublishedAt(java.time.LocalDateTime.now());
        } else {
            item.setPublishedBy(null);
            item.setPublishedAt(null);
        }

        item = knowledgeRepository.save(item);
        log.info("KnowledgeItem {} visibility changed to {} by {}", itemId, newVisibility, email);
        return ApiResponse.success(item);
    }

    /**
     * Global search: searches PUBLIC knowledge items across all workspaces.
     * No workspace membership required.
     */
    @Transactional(readOnly = true)
    public ApiResponse<List<KnowledgeItem>> globalSearch(
            String query, String category, String tags) {
        float[] queryEmbedding;
        try {
            queryEmbedding = embeddingClient.embed(query);
        } catch (Exception e) {
            log.warn("Embedding failed for global query '{}': {}", query, e.getMessage());
            return ApiResponse.success(java.util.Collections.emptyList());
        }
        if (queryEmbedding == null) {
            return ApiResponse.success(java.util.Collections.emptyList());
        }

        String embeddingStr = vectorToString(queryEmbedding);

        List<KnowledgeItem> results;
        try {
            if (category != null && !category.isBlank()) {
                results = knowledgeRepository.searchPublicByEmbeddingAndCategory(
                        embeddingStr, category, MAX_SEARCH_RESULTS);
            } else {
                results = knowledgeRepository.searchPublicByEmbedding(
                        embeddingStr, MAX_SEARCH_RESULTS);
            }
        } catch (Exception e) {
            log.warn("pgvector global search failed: {}. Falling back to keyword.", e.getMessage());
            results = knowledgeRepository.findByVisibilityAndTitleContainingIgnoreCase(
                    KnowledgeVisibility.PUBLIC, query);
            if (results == null) results = java.util.Collections.emptyList();
        }

        // Filter: only PUBLIC items (safety net)
        results = results.stream()
                .filter(item -> item.getVisibility() == KnowledgeVisibility.PUBLIC)
                .collect(Collectors.toList());

        // Tags filter
        if (tags != null && !tags.isBlank()) {
            String[] tagFilters = tags.split(",");
            results = results.stream()
                    .filter(item -> {
                        if (item.getTags() == null) return false;
                        for (String tf : tagFilters) {
                            String t = tf.trim().toLowerCase();
                            for (String tag : item.getTags()) {
                                if (tag.toLowerCase().contains(t)) return true;
                            }
                        }
                        return false;
                    })
                    .collect(Collectors.toList());
        }

        return ApiResponse.success(results);
    }

    /**
     * Browse global knowledge without a query: the most-recent PUBLIC items,
     * optionally narrowed by category/tags. Powers the Global Community landing
     * view so users see solved problems immediately, before typing a search.
     * No embedding is computed — results are ordered by recency.
     */
    @Transactional(readOnly = true)
    public ApiResponse<List<PublicKnowledgeItem>> browseGlobalRecent(String category, String tags) {
        List<KnowledgeItem> results =
                knowledgeRepository.findTop50ByVisibilityOrderByCreatedAtDesc(KnowledgeVisibility.PUBLIC);

        if (category != null && !category.isBlank() && !"ALL".equalsIgnoreCase(category)) {
            final String cat = category;
            results = results.stream()
                    .filter(item -> cat.equalsIgnoreCase(item.getCategory()))
                    .collect(Collectors.toList());
        }

        results = applyTagsFilter(results, tags);

        List<PublicKnowledgeItem> mapped = results.stream()
                .map(PublicKnowledgeItem::from)
                .collect(Collectors.toList());
        return ApiResponse.success(mapped);
    }

    /**
     * Create a KnowledgeItem from a GlobalAnswer (called when answer is accepted).
     * Visibility is PUBLIC immediately — no admin approval needed.
     */
    @Transactional
    public KnowledgeItem createFromGlobalAnswer(
            UUID questionId, UUID answerId, String title, String summary,
            String rootCause, String solution, String[] tags, String category, double confidence,
            float[] embedding) {
        // Check if already exists for this answer
        if (knowledgeRepository.existsByGlobalAnswerId(answerId)) {
            log.info("KnowledgeItem already exists for globalAnswerId={}", answerId);
            return null;
        }

        KnowledgeItem item = new KnowledgeItem();
        item.setTitle(title);
        item.setSummary(summary);
        item.setRootCause(rootCause);
        item.setSolution(solution);
        item.setTags(tags);
        item.setCategory(category);
        item.setConfidence(BigDecimal.valueOf(confidence));
        item.setEmbedding(embedding);
        item.setApproved(false);
        item.setVisibility(KnowledgeVisibility.PUBLIC);

        // Link to global answer instead of resolution
        item.setGlobalAnswerId(answerId);

        item = knowledgeRepository.save(item);
        log.info("KnowledgeItem created from globalAnswer: id={}, title={}", item.getId(), item.getTitle());
        return item;
    }

    // ── helpers ──────────────────────────────────────────────

    private void verifyWorkspaceAccess(KnowledgeItem item, User user) {
        if (!hasWorkspaceAccess(item, user)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "You are not a member of the workspace that owns this knowledge item");
        }
    }

    private boolean hasWorkspaceAccess(KnowledgeItem item, User user) {
        try {
            UUID workspaceId = item.getResolution().getCapsule()
                    .getArtifactAnchor().getArtifactVersion()
                    .getArtifact().getProject().getWorkspace().getId();
            return workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, user.getId());
        } catch (Exception e) {
            log.warn("Failed to check workspace access for item {}: {}", item.getId(), e.getMessage());
            return false;
        }
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

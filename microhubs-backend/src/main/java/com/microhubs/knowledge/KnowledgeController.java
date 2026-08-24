package com.microhubs.knowledge;

import com.microhubs.common.ApiResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/knowledge")
public class KnowledgeController {

    @Autowired
    private KnowledgeService knowledgeService;

    /**
     * Fetch a single knowledge item by ID.
     * Authorization: caller must be a member of the workspace,
     * OR the item must be PUBLIC.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<KnowledgeItem>> getKnowledgeItem(@PathVariable UUID id) {
        String email = currentEmail();
        ApiResponse<KnowledgeItem> response = knowledgeService.getKnowledgeItem(id, email);
        return ResponseEntity.ok(response);
    }

    /**
     * Semantic search for knowledge items.
     * <ul>
     *   <li>{@code scope=mine}: search knowledge in workspaces the caller belongs
     *       to, returned as stripped {@link PublicKnowledgeItem} DTOs.</li>
     *   <li>{@code scope=global} or no workspaceId: PUBLIC items as stripped DTO.</li>
     *   <li>workspaceId provided: workspace-scoped private search (existing behavior).</li>
     * </ul>
     */
    @GetMapping("/search")
    public ResponseEntity<?> search(
            @RequestParam String q,
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String tags,
            @RequestParam(required = false) String scope) {
        String email = currentEmail();

        // "My workspaces" search: items the caller can access, stripped DTO.
        if ("mine".equals(scope)) {
            return ResponseEntity.ok(knowledgeService.searchMine(email, q, category, tags));
        }

        // Global search: PUBLIC items only, return stripped DTO
        if ("global".equals(scope) || workspaceId == null) {
            ApiResponse<List<KnowledgeItem>> raw =
                    knowledgeService.globalSearch(q, category, tags);
            List<PublicKnowledgeItem> stripped = (raw.getData() != null ? raw.getData() : List.<KnowledgeItem>of())
                    .stream()
                    .map(PublicKnowledgeItem::from)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(ApiResponse.success(stripped));
        }

        // Workspace-scoped search (existing behavior)
        ApiResponse<List<KnowledgeItem>> response = knowledgeService.search(
                email, q, workspaceId, projectId, category, tags);
        return ResponseEntity.ok(response);
    }

    /**
     * Browse the global library WITHOUT a search query: the most-recent PUBLIC
     * items, so the Global Community landing view shows solved problems before
     * the user types anything. Optional {@code category}/{@code tags} filters.
     * Two-segment path avoids colliding with {@code GET /{id}}.
     */
    @GetMapping("/global/recent")
    public ResponseEntity<ApiResponse<List<PublicKnowledgeItem>>> browseGlobalRecent(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String tags) {
        return ResponseEntity.ok(knowledgeService.browseGlobalRecent(category, tags));
    }

    /**
     * AI answer with citations: synthesize a direct, grounded answer to a
     * natural-language question from the top matching knowledge entries.
     * Body: {@code {"q": "...", "scope": "mine"|"global", "category": "...", "tags": "..."}}.
     * Only {@code q} is required. {@code scope} defaults to global.
     */
    @PostMapping("/answer")
    public ResponseEntity<ApiResponse<KnowledgeAnswer>> answer(@RequestBody Map<String, String> body) {
        String email = currentEmail();
        String q = body.get("q");
        if (q == null || q.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("q is required"));
        }
        String scope = body.get("scope");
        String category = body.get("category");
        String tags = body.get("tags");
        ApiResponse<KnowledgeAnswer> response =
                knowledgeService.answerQuestion(email, q, scope, category, tags);
        return ResponseEntity.ok(response);
    }

    /**
     * Publish/unpublish a KnowledgeItem to/from global search.
     * Only workspace ADMIN/OWNER can do this.
     */
    @PatchMapping("/{id}/visibility")
    public ResponseEntity<ApiResponse<KnowledgeItem>> publishVisibility(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String email = currentEmail();
        String visibilityStr = body.get("visibility");
        if (visibilityStr == null || visibilityStr.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("visibility is required"));
        }
        KnowledgeVisibility visibility;
        try {
            visibility = KnowledgeVisibility.valueOf(visibilityStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid visibility: " + visibilityStr));
        }
        ApiResponse<KnowledgeItem> response =
                knowledgeService.publishVisibility(id, visibility, email);
        return ResponseEntity.ok(response);
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}

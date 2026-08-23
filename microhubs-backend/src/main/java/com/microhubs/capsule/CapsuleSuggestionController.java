package com.microhubs.capsule;

import com.microhubs.common.ApiResponse;
import com.microhubs.knowledge.CapsuleSuggestionService;
import com.microhubs.knowledge.SimilarKnowledgeItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/capsules")
public class CapsuleSuggestionController {

    @Autowired
    private CapsuleSuggestionService capsuleSuggestionService;

    /**
     * Pre-submit duplicate detection: find semantically similar resolved Knowledge Items.
     * Read-only — does not create anything, no side effects.
     */
    @PostMapping("/suggest-similar")
    public ResponseEntity<ApiResponse<List<SimilarKnowledgeItem>>> suggestSimilar(
            @RequestBody Map<String, Object> body) {
        String email = currentEmail();

        String title = (String) body.get("title");
        if (title == null || title.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("title is required"));
        }

        String description = (String) body.get("description");
        Object workspaceIdObj = body.get("workspaceId");
        if (workspaceIdObj == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("workspaceId is required"));
        }
        UUID workspaceId = UUID.fromString(workspaceIdObj.toString());

        UUID projectId = null;
        Object projectIdObj = body.get("projectId");
        if (projectIdObj != null) {
            projectId = UUID.fromString(projectIdObj.toString());
        }

        ApiResponse<List<SimilarKnowledgeItem>> response =
                capsuleSuggestionService.suggestSimilar(
                        title, description, workspaceId, projectId, email);
        return ResponseEntity.ok(response);
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}

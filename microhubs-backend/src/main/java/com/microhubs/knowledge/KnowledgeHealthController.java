package com.microhubs.knowledge;

import com.microhubs.common.ApiResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/dashboard")
public class KnowledgeHealthController {

    @Autowired
    private KnowledgeHealthService knowledgeHealthService;

    /**
     * Knowledge Health panel: aging capsules + hot artifacts for a workspace.
     * Read-only aggregation — called on dashboard load.
     */
    @GetMapping("/knowledge-health")
    public ResponseEntity<ApiResponse<KnowledgeHealthResponse>> getKnowledgeHealth(
            @RequestParam UUID workspaceId,
            @RequestParam(required = false, defaultValue = "3") int agingThresholdDays) {
        String email = currentEmail();
        ApiResponse<KnowledgeHealthResponse> response =
                knowledgeHealthService.getKnowledgeHealth(workspaceId, email, agingThresholdDays);
        return ResponseEntity.ok(response);
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}

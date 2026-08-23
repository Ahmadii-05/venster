package com.microhubs.knowledge;

import java.util.List;
import java.util.UUID;

/**
 * Response DTO for GET /api/dashboard/knowledge-health.
 * Contains aging capsules and hot artifacts for the workspace.
 */
public record KnowledgeHealthResponse(
    List<AgingCapsule> agingCapsules,
    List<HotArtifact> hotArtifacts
) {
    public record AgingCapsule(
        UUID capsuleId,
        String title,
        String status,
        long daysInCurrentStatus,
        String priority
    ) {}

    public record HotArtifact(
        UUID artifactId,
        String filePath,
        long capsuleCount,
        long openCapsuleCount
    ) {}
}

package com.microhubs.artifact;

import com.microhubs.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
public class ArtifactController {

    @Autowired
    private ArtifactService artifactService;

    @PostMapping("/api/artifacts")
    public ResponseEntity<ApiResponse<Artifact>> createArtifact(
            @Valid @RequestBody ArtifactRequest request) {
        String email = currentEmail();
        ApiResponse<Artifact> response = artifactService.createArtifact(email, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/artifacts/{id}/versions")
    public ResponseEntity<ApiResponse<ArtifactVersion>> createVersion(
            @PathVariable UUID id,
            @Valid @RequestBody ArtifactVersionRequest request) {
        String email = currentEmail();
        ApiResponse<ArtifactVersion> response =
                artifactService.createVersion(id, email, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/artifact-versions/{id}/anchors")
    public ResponseEntity<ApiResponse<ArtifactAnchor>> createAnchor(
            @PathVariable UUID id,
            @Valid @RequestBody ArtifactAnchorRequest request) {
        String email = currentEmail();
        ApiResponse<ArtifactAnchor> response =
                artifactService.createAnchor(id, email, request);
        return ResponseEntity.ok(response);
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}

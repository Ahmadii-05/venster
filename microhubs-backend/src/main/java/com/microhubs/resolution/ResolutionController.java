package com.microhubs.resolution;

import com.microhubs.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
public class ResolutionController {

    @Autowired
    private ResolutionService resolutionService;

    @PostMapping("/api/capsules/{id}/resolve")
    public ResponseEntity<ApiResponse<Resolution>> resolveCapsule(
            @PathVariable UUID id,
            @Valid @RequestBody ResolutionRequest request) {
        String email = currentEmail();
        ApiResponse<Resolution> response =
                resolutionService.resolveCapsule(id, email, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/capsules/{id}/resolution")
    public ResponseEntity<ApiResponse<Resolution>> getResolution(
            @PathVariable UUID id) {
        String email = currentEmail();
        ApiResponse<Resolution> response =
                resolutionService.getResolution(id, email);
        return ResponseEntity.ok(response);
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}

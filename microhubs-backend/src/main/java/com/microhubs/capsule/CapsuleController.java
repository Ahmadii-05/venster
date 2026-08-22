package com.microhubs.capsule;

import com.microhubs.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/capsules")
public class CapsuleController {

    @Autowired
    private CapsuleService capsuleService;

    @PostMapping
    public ResponseEntity<ApiResponse<Capsule>> createCapsule(
            @Valid @RequestBody CapsuleRequest request) {
        String email = currentEmail();
        ApiResponse<Capsule> response = capsuleService.createCapsule(email, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Capsule>>> listCapsules(
            @RequestParam UUID projectId,
            @RequestParam(required = false) CapsuleStatus status,
            @RequestParam(required = false) UUID assigneeId) {
        ApiResponse<List<Capsule>> response =
                capsuleService.listCapsules(projectId, status, assigneeId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Capsule>> getCapsule(@PathVariable UUID id) {
        ApiResponse<Capsule> response = capsuleService.getCapsule(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<Capsule>> updateCapsule(
            @PathVariable UUID id,
            @Valid @RequestBody CapsuleUpdateRequest request) {
        String email = currentEmail();
        ApiResponse<Capsule> response = capsuleService.updateCapsule(id, email, request);
        return ResponseEntity.ok(response);
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}

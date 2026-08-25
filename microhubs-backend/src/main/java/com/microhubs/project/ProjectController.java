package com.microhubs.project;

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
@RequestMapping("/api/projects")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    @PostMapping
    public ResponseEntity<ApiResponse<Project>> createProject(@Valid @RequestBody ProjectRequest request, @RequestParam UUID workspaceId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        ApiResponse<Project> response = projectService.createProject(workspaceId, email, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Project>>> listProjects(@RequestParam UUID workspaceId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        ApiResponse<List<Project>> response = projectService.listProjects(workspaceId, email);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Project>> getProject(@PathVariable UUID id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        ApiResponse<Project> response = projectService.getProject(id, email);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<Project>> updateProject(
            @PathVariable UUID id,
            @Valid @RequestBody ProjectRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        ApiResponse<Project> response = projectService.updateProject(id, email, request);
        return ResponseEntity.ok(response);
    }

    // ── Project team management ──────────────────────────────────

    @GetMapping("/{id}/members")
    public ResponseEntity<ApiResponse<List<ProjectMember>>> listMembers(@PathVariable UUID id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        ApiResponse<List<ProjectMember>> response = projectService.listProjectMembers(id, email);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<ApiResponse<ProjectMember>> addMember(
            @PathVariable UUID id,
            @Valid @RequestBody ProjectMemberRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        ApiResponse<ProjectMember> response =
                projectService.addProjectMember(id, email, request.getEmail());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}/members/{memberEmail}")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable UUID id,
            @PathVariable String memberEmail) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        ApiResponse<Void> response =
                projectService.removeProjectMember(id, email, memberEmail);
        return ResponseEntity.ok(response);
    }
}

package com.microhubs.project;

import com.microhubs.common.ApiResponse;
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
    public ResponseEntity<ApiResponse<Project>> createProject(@RequestBody ProjectRequest request, @RequestParam UUID workspaceId) {
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
}

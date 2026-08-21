package com.microhubs.project;

import com.microhubs.common.ApiResponse;
import com.microhubs.auth.User;
import com.microhubs.workspace.WorkspaceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    @PostMapping
    public ResponseEntity<ApiResponse<Project>> createProject(@RequestBody ProjectRequest request, @RequestParam UUID workspaceId) {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        ApiResponse<Project> response = projectService.createProject(workspaceId, user, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<java.util.List<Project>>> listProjects(@RequestParam UUID workspaceId) {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        ApiResponse<java.util.List<Project>> response = projectService.listProjects(workspaceId, user);
        return ResponseEntity.ok(response);
    }
}
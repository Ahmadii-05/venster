package com.microhubs.workspace;

import com.microhubs.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces")
public class WorkspaceController {

    @Autowired
    private WorkspaceService workspaceService;

    @PostMapping
    public ApiResponse<Workspace> createWorkspace(@Valid @RequestBody WorkspaceRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        Workspace workspace = workspaceService.createWorkspace(request.getName(), email);
        return ApiResponse.success(workspace);
    }

    @GetMapping
    public ApiResponse<List<Workspace>> listWorkspaces() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        List<Workspace> workspaces = workspaceService.getUserWorkspaces(email);
        return ApiResponse.success(workspaces);
    }

    @PostMapping("/{id}/members")
    public ApiResponse<WorkspaceMember> addMember(@PathVariable UUID id, @Valid @RequestBody MemberRequest request) {
        workspaceService.addMember(id, request.getEmail(), request.getRole());

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        WorkspaceMember member = workspaceService.getMember(id, request.getEmail());
        return ApiResponse.success(member);
    }

    @DeleteMapping("/{id}/members/{email}")
    public ApiResponse<Void> removeMember(@PathVariable UUID id, @PathVariable String email) {
        workspaceService.removeMember(id, email);
        return ApiResponse.success(null);
    }
}

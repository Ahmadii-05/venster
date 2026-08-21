package com.microhubs.workspace;

import com.microhubs.auth.User;
import com.microhubs.common.ApiResponse;
import jakarta.validation.Path;
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

    @Autowired
    private UserRepository userRepository;

    @PostMapping
    public ApiResponse<Workspace> createWorkspace(@RequestBody WorkspaceRequest request) {
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
    public ApiResponse<WorkspaceMember> addMember(@PathVariable Long id, @RequestBody MemberRequest request) {
        workspaceService.addMember(id, request.getEmail(), request.getRole());
        WorkspaceMember member = workspaceService.workspaceMemberRepository.findByWorkspaceAndUser(
                workspaceService.workspaceRepository.findById(id).get(),
                workspaceService.userRepository.findByEmail(request.getEmail()).get()
        );
        return ApiResponse.success(member);
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ApiResponse<Void> removeMember(@PathVariable Long id, @PathVariable Long userId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        workspaceService.removeMember(id, email);
        return ApiResponse.success(null);
    }
}

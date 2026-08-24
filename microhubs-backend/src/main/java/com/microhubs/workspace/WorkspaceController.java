package com.microhubs.workspace;

import com.microhubs.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workspaces")
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    public WorkspaceController(WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    /**
     * Create workspace.
     *
     * Authenticated user automatically becomes OWNER.
     */
    @PostMapping
    public ApiResponse<Workspace> createWorkspace(
            @Valid @RequestBody WorkspaceRequest request,
            Authentication authentication) {

        String email = authentication.getName();

        Workspace workspace =
                workspaceService.createWorkspace(
                        request.getName(),
                        email
                );

        return ApiResponse.success(workspace);
    }

    /**
     * List workspaces belonging to current user.
     */
    @GetMapping
    public ApiResponse<List<Workspace>> listWorkspaces(
            Authentication authentication) {

        String email = authentication.getName();

        List<Workspace> workspaces =
                workspaceService.getUserWorkspaces(email);

        return ApiResponse.success(workspaces);
    }

    /**
     * Get a specific workspace.
     *
     * Non-members receive 403.
     */
    @GetMapping("/{id}")
    public ApiResponse<Workspace> getWorkspace(
            @PathVariable UUID id,
            Authentication authentication) {

        String email = authentication.getName();

        Workspace workspace =
                workspaceService.getWorkspace(id, email);

        return ApiResponse.success(workspace);
    }

    /**
     * List all members of a workspace.
     *
     * Only members can view the roster. Powers the reviewer-assignment
     * dropdown on the frontend.
     */
    @GetMapping("/{id}/members")
    public ApiResponse<List<WorkspaceMember>> listMembers(
            @PathVariable UUID id,
            Authentication authentication) {

        String requesterEmail = authentication.getName();

        List<WorkspaceMember> members =
                workspaceService.listMembers(id, requesterEmail);

        return ApiResponse.success(members);
    }

    /**
     * Add a member.
     *
     * Only OWNER/ADMIN can perform this operation.
     */
    @PostMapping("/{id}/members")
    public ApiResponse<WorkspaceMember> addMember(
            @PathVariable UUID id,
            @Valid @RequestBody MemberRequest request,
            Authentication authentication) {

        String requesterEmail = authentication.getName();

        WorkspaceMember member =
                workspaceService.addMember(
                        id,
                        requesterEmail,
                        request.getEmail(),
                        request.getRole()
                );

        return ApiResponse.success(member);
    }

    /**
     * Remove a member.
     *
     * Only OWNER/ADMIN can perform this operation.
     */
    @DeleteMapping("/{id}/members/{email}")
    public ApiResponse<Void> removeMember(
            @PathVariable UUID id,
            @PathVariable String email,
            Authentication authentication) {

        String requesterEmail = authentication.getName();

        workspaceService.removeMember(
                id,
                requesterEmail,
                email
        );

        return ApiResponse.success(null);
    }

    /**
     * Get a workspace member.
     */
    @GetMapping("/{id}/members/{email}")
    public ApiResponse<WorkspaceMember> getMember(
            @PathVariable UUID id,
            @PathVariable String email,
            Authentication authentication) {

        String requesterEmail = authentication.getName();

        WorkspaceMember member =
                workspaceService.getMember(
                        id,
                        requesterEmail,
                        email
                );

        return ApiResponse.success(member);
    }
}
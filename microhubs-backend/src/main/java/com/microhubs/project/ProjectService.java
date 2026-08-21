package com.microhubs.project;

import com.microhubs.auth.User;
import com.microhubs.auth.UserRepository;
import com.microhubs.common.ApiResponse;
import com.microhubs.workspace.Workspace;
import com.microhubs.workspace.WorkspaceMemberRepository;
import com.microhubs.workspace.WorkspaceRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;

    /**
     * Create a project inside a workspace.
     *
     * Business rule:
     * Only users who are members of the workspace
     * can create projects.
     */
    public ApiResponse<Project> createProject(
            UUID workspaceId,
            String email,
            ProjectRequest request) {

        User user = getUser(email);

        Workspace workspace = getWorkspace(workspaceId);

        // Authorization check
        verifyWorkspaceMembership(workspace, user);

        Project project = new Project();
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setWorkspace(workspace);

        Project savedProject = projectRepository.save(project);

        return ApiResponse.success(savedProject);
    }

    /**
     * List projects belonging to a workspace.
     *
     * Business rule:
     * Only workspace members can view projects.
     */
    @Transactional(readOnly = true)
    public ApiResponse<List<Project>> listProjects(
            UUID workspaceId,
            String email) {

        User user = getUser(email);

        Workspace workspace = getWorkspace(workspaceId);

        // Authorization check
        verifyWorkspaceMembership(workspace, user);

        List<Project> projects =
                projectRepository.findByWorkspace(workspace);

        return ApiResponse.success(projects);
    }

    /**
     * Find a user by email.
     */
    private User getUser(String email) {

        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));
    }

    /**
     * Find a workspace by ID.
     */
    private Workspace getWorkspace(UUID workspaceId) {

        return workspaceRepository.findById(workspaceId)
                .orElseThrow(() ->
                        new RuntimeException("Workspace not found"));
    }

    /**
     * Verify that the authenticated user belongs
     * to the requested workspace.
     *
     * If the user is not a member, return 403 Forbidden.
     */
    private void verifyWorkspaceMembership(
            Workspace workspace,
            User user) {

        boolean isMember =
                workspaceMemberRepository
                        .existsByWorkspaceAndUser(
                                workspace,
                                user
                        );

        if (!isMember) {
            throw new AccessDeniedException(
                    "User is not a member of this workspace"
            );
        }
    }
}
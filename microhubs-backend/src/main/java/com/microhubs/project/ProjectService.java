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

    @Autowired
    private ProjectMemberRepository projectMemberRepository;

    /**
     * Create a project inside a workspace.
     *
     * The caller must belong to the workspace. The creator is always added to
     * the new project's team, and any additional members named in the request
     * (each of whom must already be a workspace member) are added too.
     *
     * From here on, project-team membership — not workspace membership —
     * governs who can see and act on the project and its capsules.
     */
    public ApiResponse<Project> createProject(
            UUID workspaceId,
            String email,
            ProjectRequest request) {

        User user = getUser(email);

        Workspace workspace = getWorkspace(workspaceId);

        // Must belong to the workspace to create a project in it.
        verifyWorkspaceMembership(workspace, user);

        Project project = new Project();
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setWorkspace(workspace);

        // Optional technical metadata. Guard the enums so a missing value keeps
        // the entity default (PLANNING / MEDIUM) instead of overwriting it null.
        project.setRepositoryUrl(request.getRepositoryUrl());
        project.setTechStack(request.getTechStack());
        if (request.getStatus() != null) {
            project.setStatus(request.getStatus());
        }
        if (request.getPriority() != null) {
            project.setPriority(request.getPriority());
        }
        project.setTargetDate(request.getTargetDate());

        Project savedProject = projectRepository.save(project);

        // The creator is always on the team.
        addTeamMember(savedProject, user);

        // Optional initial teammates chosen at creation time. Each must be a
        // member of the owning workspace; unknown or non-workspace ids are
        // skipped so a stray id can't fail the whole creation.
        if (request.getMemberIds() != null) {
            for (UUID memberId : request.getMemberIds()) {
                if (memberId == null || memberId.equals(user.getId())) {
                    continue;
                }
                userRepository.findById(memberId).ifPresent(candidate -> {
                    if (workspaceMemberRepository.existsByWorkspaceAndUser(workspace, candidate)
                            && !projectMemberRepository.existsByProjectAndUser(savedProject, candidate)) {
                        addTeamMember(savedProject, candidate);
                    }
                });
            }
        }

        return ApiResponse.success(savedProject);
    }

    /**
     * Get a single project by ID.
     *
     * Business rule: only members of the project's team can view it.
     */
    @Transactional(readOnly = true)
    public ApiResponse<Project> getProject(UUID projectId, String email) {

        User user = getUser(email);

        Project project = getProjectById(projectId);

        verifyProjectMembership(project, user);

        return ApiResponse.success(project);
    }

    /**
     * Update a project's name, description, and technical metadata.
     *
     * Business rule: only members of the project's team can edit it.
     * The enum fields are only overwritten when supplied, so a partial
     * update can't accidentally blank out status or priority.
     */
    public ApiResponse<Project> updateProject(
            UUID projectId,
            String email,
            ProjectRequest request) {

        User user = getUser(email);

        Project project = getProjectById(projectId);

        // Authorization check
        verifyProjectMembership(project, user);

        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setRepositoryUrl(request.getRepositoryUrl());
        project.setTechStack(request.getTechStack());
        if (request.getStatus() != null) {
            project.setStatus(request.getStatus());
        }
        if (request.getPriority() != null) {
            project.setPriority(request.getPriority());
        }
        project.setTargetDate(request.getTargetDate());

        Project savedProject = projectRepository.save(project);

        return ApiResponse.success(savedProject);
    }

    /**
     * List projects in a workspace.
     *
     * Business rule: the caller must be a workspace member, and only sees the
     * projects whose team they belong to. Projects they are not on the team of
     * are completely hidden.
     */
    @Transactional(readOnly = true)
    public ApiResponse<List<Project>> listProjects(
            UUID workspaceId,
            String email) {

        User user = getUser(email);

        Workspace workspace = getWorkspace(workspaceId);

        // Must belong to the workspace at all...
        verifyWorkspaceMembership(workspace, user);

        // ...but only see the projects whose team they're on.
        List<Project> projects =
                projectMemberRepository.findProjectsForMember(workspace, user);

        return ApiResponse.success(projects);
    }

    // ── Project team management ──────────────────────────────────
    // Any team member may manage the roster (no owner/admin tier).

    /**
     * List the members of a project's team. Only team members may view it.
     */
    @Transactional(readOnly = true)
    public ApiResponse<List<ProjectMember>> listProjectMembers(
            UUID projectId, String email) {

        User user = getUser(email);
        Project project = getProjectById(projectId);

        verifyProjectMembership(project, user);

        return ApiResponse.success(projectMemberRepository.findByProject(project));
    }

    /**
     * Add a member to a project's team.
     *
     * The requester must already be on the team (any member may add). The
     * target must already be a member of the owning workspace — project teams
     * are drawn from the workspace roster. Idempotent: adding someone already
     * on the team returns their existing membership.
     */
    public ApiResponse<ProjectMember> addProjectMember(
            UUID projectId, String requesterEmail, String targetEmail) {

        User requester = getUser(requesterEmail);
        Project project = getProjectById(projectId);

        verifyProjectMembership(project, requester);

        // The target is looked up by email; an unknown address is a client
        // error (clean 400 "No such user found"), not a server fault (500).
        User target = userRepository.findByEmail(targetEmail)
                .orElseThrow(() -> new IllegalArgumentException("No such user found"));

        if (!workspaceMemberRepository.existsByWorkspaceAndUser(project.getWorkspace(), target)) {
            throw new IllegalArgumentException(
                    "User must be a member of the workspace before joining a project team");
        }

        ProjectMember member = projectMemberRepository
                .findByProjectAndUser(project, target)
                .orElseGet(() -> addTeamMember(project, target));

        return ApiResponse.success(member);
    }

    /**
     * Remove a member from a project's team.
     *
     * Any team member may remove another (including themselves), but a project
     * must keep at least one team member, so the last one cannot be removed.
     */
    public ApiResponse<Void> removeProjectMember(
            UUID projectId, String requesterEmail, String targetEmail) {

        User requester = getUser(requesterEmail);
        Project project = getProjectById(projectId);

        verifyProjectMembership(project, requester);

        User target = getUser(targetEmail);

        ProjectMember member = projectMemberRepository
                .findByProjectAndUser(project, target)
                .orElseThrow(() -> new IllegalArgumentException(
                        "User is not on this project team"));

        if (projectMemberRepository.countByProject(project) <= 1) {
            throw new IllegalArgumentException(
                    "A project must have at least one team member");
        }

        projectMemberRepository.delete(member);

        return ApiResponse.success(null);
    }

    // ── helpers ──────────────────────────────────────────────────

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
     * Find a project by ID.
     */
    private Project getProjectById(UUID projectId) {

        return projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new RuntimeException("Project not found"));
    }

    /**
     * Add a user to a project's team (no-op-safe callers guard duplicates).
     */
    private ProjectMember addTeamMember(Project project, User user) {

        ProjectMember member = new ProjectMember();
        member.setProject(project);
        member.setUser(user);
        return projectMemberRepository.save(member);
    }

    /**
     * Verify the authenticated user belongs to the requested workspace.
     * Used only where workspace-level access is the gate (create/list projects).
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

    /**
     * Verify the authenticated user belongs to the project's team.
     * This is the authorization boundary for viewing/editing a project.
     */
    private void verifyProjectMembership(Project project, User user) {

        boolean isMember =
                projectMemberRepository.existsByProjectAndUser(project, user);

        if (!isMember) {
            throw new AccessDeniedException(
                    "User is not a member of this project team"
            );
        }
    }
}

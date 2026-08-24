package com.microhubs.workspace;

import com.microhubs.auth.User;
import com.microhubs.auth.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class WorkspaceService {

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Create a workspace.
     *
     * Business rule:
     * The authenticated creator automatically becomes OWNER.
     */
    public Workspace createWorkspace(String name, String email) {

        User creator = getUser(email);

        Workspace workspace = new Workspace();
        workspace.setName(name);
        workspace.setCreatedBy(creator);

        workspace = workspaceRepository.save(workspace);

        WorkspaceMember owner = new WorkspaceMember();
        owner.setWorkspace(workspace);
        owner.setUser(creator);
        owner.setRole(WorkspaceMember.Role.OWNER);

        workspaceMemberRepository.save(owner);

        return workspace;
    }

    /**
     * Return only workspaces where the authenticated
     * user is a member.
     */
    @Transactional(readOnly = true)
    public List<Workspace> getUserWorkspaces(String email) {

        User user = getUser(email);

        return workspaceMemberRepository.findByUser(user)
                .stream()
                .map(WorkspaceMember::getWorkspace)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific workspace.
     *
     * Business rule:
     * Only workspace members can access it.
     */
    @Transactional(readOnly = true)
    public Workspace getWorkspace(UUID workspaceId, String email) {

        Workspace workspace = getWorkspace(workspaceId);
        User user = getUser(email);

        if (!isMember(workspace, user)) {
            throw new AccessDeniedException(
                    "You are not a member of this workspace"
            );
        }

        return workspace;
    }

    /**
     * Add a member.
     *
     * Business rules:
     * OWNER can add anyone.
     * ADMIN can add members.
     * MEMBER cannot add members.
     */
    public WorkspaceMember addMember(
            UUID workspaceId,
            String requesterEmail,
            String email,
            String role) {

        Workspace workspace = getWorkspace(workspaceId);
        User requester = getUser(requesterEmail);
        // The target is looked up by email; an unknown address is a client
        // error (clean 400 "No such user found"), not a server fault (500).
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("No such user found"));

        WorkspaceMember requesterMembership =
                getMembership(workspace, requester);

        if (!canManageMembers(requesterMembership)) {
            throw new AccessDeniedException(
                    "You do not have permission to manage workspace members"
            );
        }

        if (isMember(workspace, user)) {
            throw new IllegalArgumentException(
                    "User is already a member of this workspace"
            );
        }

        WorkspaceMember.Role memberRole;

        try {
            memberRole = WorkspaceMember.Role.valueOf(
                    role.toUpperCase()
            );
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Invalid workspace member role"
            );
        }

        // Only OWNER can create another OWNER.
        if (memberRole == WorkspaceMember.Role.OWNER
                && requesterMembership.getRole()
                != WorkspaceMember.Role.OWNER) {

            throw new AccessDeniedException(
                    "Only the workspace owner can assign the OWNER role"
            );
        }

        WorkspaceMember member = new WorkspaceMember();
        member.setWorkspace(workspace);
        member.setUser(user);
        member.setRole(memberRole);

        return workspaceMemberRepository.save(member);
    }

    /**
     * Remove a member.
     *
     * Business rules:
     * OWNER can remove members.
     * ADMIN can remove MEMBERs.
     * OWNER cannot be removed through this operation.
     */
    public void removeMember(
            UUID workspaceId,
            String requesterEmail,
            String email) {

        Workspace workspace = getWorkspace(workspaceId);

        User requester = getUser(requesterEmail);
        User user = getUser(email);

        WorkspaceMember requesterMembership =
                getMembership(workspace, requester);

        if (!canManageMembers(requesterMembership)) {
            throw new AccessDeniedException(
                    "You do not have permission to remove workspace members"
            );
        }

        WorkspaceMember member =
                getMembership(workspace, user);

        // Owner cannot be removed using this endpoint.
        if (member.getRole() == WorkspaceMember.Role.OWNER) {
            throw new AccessDeniedException(
                    "The workspace owner cannot be removed"
            );
        }

        // ADMIN cannot remove another ADMIN.
        if (requesterMembership.getRole()
                == WorkspaceMember.Role.ADMIN
                && member.getRole()
                == WorkspaceMember.Role.ADMIN) {

            throw new AccessDeniedException(
                    "An ADMIN cannot remove another ADMIN"
            );
        }

        workspaceMemberRepository.delete(member);
    }

    /**
     * Get a workspace member.
     *
     * Only members of the workspace can view membership information.
     */
    @Transactional(readOnly = true)
    public WorkspaceMember getMember(
            UUID workspaceId,
            String requesterEmail,
            String memberEmail) {

        Workspace workspace = getWorkspace(workspaceId);
        User requester = getUser(requesterEmail);
        User memberUser = getUser(memberEmail);

        if (!isMember(workspace, requester)) {
            throw new AccessDeniedException(
                    "You are not a member of this workspace"
            );
        }

        return getMembership(workspace, memberUser);
    }

    /**
     * List all members of a workspace.
     *
     * Only members of the workspace can view the roster. Used by the
     * frontend to populate the reviewer-assignment dropdown, so the
     * caller can pick a real user (and we send that user's id) instead
     * of free-typing an email that the backend can't resolve.
     */
    @Transactional(readOnly = true)
    public List<WorkspaceMember> listMembers(
            UUID workspaceId,
            String requesterEmail) {

        Workspace workspace = getWorkspace(workspaceId);
        User requester = getUser(requesterEmail);

        if (!isMember(workspace, requester)) {
            throw new AccessDeniedException(
                    "You are not a member of this workspace"
            );
        }

        return workspaceMemberRepository.findByWorkspace(workspace);
    }

    private User getUser(String email) {

        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));
    }

    private Workspace getWorkspace(UUID workspaceId) {

        return workspaceRepository.findById(workspaceId)
                .orElseThrow(() ->
                        new RuntimeException("Workspace not found"));
    }

    private WorkspaceMember getMembership(
            Workspace workspace,
            User user) {

        return workspaceMemberRepository
                .findByWorkspaceAndUser(workspace, user)
                .orElseThrow(() ->
                        new AccessDeniedException(
                                "User is not a member of this workspace"
                        ));
    }

    private boolean isMember(
            Workspace workspace,
            User user) {

        return workspaceMemberRepository
                .existsByWorkspaceAndUser(workspace, user);
    }

    private boolean canManageMembers(
            WorkspaceMember membership) {

        return membership.getRole()
                == WorkspaceMember.Role.OWNER
                || membership.getRole()
                == WorkspaceMember.Role.ADMIN;
    }
}
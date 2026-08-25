package com.microhubs.resolution;

import com.microhubs.auth.User;
import com.microhubs.auth.UserRepository;
import com.microhubs.capsule.Capsule;
import com.microhubs.capsule.CapsuleRepository;
import com.microhubs.capsule.CapsuleService;
import com.microhubs.capsule.CapsuleStatus;
import com.microhubs.common.ApiResponse;
import com.microhubs.project.Project;
import com.microhubs.project.ProjectMemberRepository;
import com.microhubs.workspace.Workspace;
import com.microhubs.workspace.WorkspaceMember;
import com.microhubs.notification.NotificationService;
import com.microhubs.workspace.WorkspaceMemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class ResolutionService {

    @Autowired
    private ResolutionRepository resolutionRepository;
    @Autowired
    private CapsuleRepository capsuleRepository;
    @Autowired
    private CapsuleService capsuleService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired
    private ProjectMemberRepository projectMemberRepository;
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    @Autowired
    private NotificationService notificationService;

    /**
     * Resolve a capsule.
     *
     * Authorization: the caller must be on the capsule's project team AND be
     * either the assigned reviewer OR a workspace ADMIN/OWNER.
     *
     * On success:
     * 1. Verify no resolution already exists (one per capsule)
     * 2. Create the Resolution row
     * 3. Transition capsule status to RESOLVED
     * 4. Publish CapsuleResolvedEvent
     */
    public ApiResponse<Resolution> resolveCapsule(
            UUID capsuleId, String email, ResolutionRequest request) {
        User resolver = getUser(email);

        Capsule capsule = capsuleRepository.findById(capsuleId)
                .orElseThrow(() -> new RuntimeException("Capsule not found"));

        // Check one-resolution-per-capsule
        if (resolutionRepository.existsByCapsuleId(capsuleId)) {
            throw new IllegalArgumentException(
                    "This capsule has already been resolved");
        }

        // Authorization: must be on the project team, and either the assigned
        // reviewer or a workspace ADMIN/OWNER.
        verifyResolverAuthorization(capsule, resolver);

        // Guard: capsule must be in ANSWERED status to resolve
        if (capsule.getStatus() != CapsuleStatus.ANSWERED) {
            throw new IllegalArgumentException(
                    "Capsule must be in ANSWERED status to resolve. Current: "
                    + capsule.getStatus());
        }

        // Create resolution
        Resolution resolution = new Resolution();
        resolution.setCapsule(capsule);
        resolution.setResolver(resolver);
        resolution.setFinalSolution(request.getFinalSolution());
        resolution = resolutionRepository.save(resolution);

        // Transition capsule to RESOLVED via CapsuleService (enforces ALLOWED_TRANSITIONS)
        capsuleService.transitionStatus(capsule, CapsuleStatus.RESOLVED);

        // Publish event for future Knowledge/AI module
        eventPublisher.publishEvent(
                new CapsuleResolvedEvent(this, capsule.getId(), resolution.getId()));

        // Notify capsule author that it's been resolved
        String contextJson = "{\"capsuleId\":\"" + capsule.getId()
                + "\",\"resolutionId\":\"" + resolution.getId() + "\"}";
        notificationService.notify(
                capsule.getAuthor().getId(), "CAPSULE_RESOLVED", contextJson);

        return ApiResponse.success(resolution);
    }

    /**
     * Get a resolution for a capsule.
     */
    @Transactional(readOnly = true)
    public ApiResponse<Resolution> getResolution(UUID capsuleId, String email) {
        User user = getUser(email);
        Resolution resolution = resolutionRepository.findByCapsuleId(capsuleId)
                .orElseThrow(() -> new RuntimeException("Resolution not found for this capsule"));

        // Only project-team members may read a resolution
        verifyProjectMembership(resolution.getCapsule(), user);
        return ApiResponse.success(resolution);
    }

    // ── helpers ──────────────────────────────────────────────

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    /**
     * The caller must be on the capsule's project team, and be either the
     * assigned reviewer OR a workspace ADMIN/OWNER. Project-team membership is
     * the hard isolation boundary — a workspace admin who is not on the team
     * cannot reach across into another team's capsule.
     */
    private void verifyResolverAuthorization(Capsule capsule, User resolver) {
        Project project = capsule.getArtifactAnchor()
                .getArtifactVersion()
                .getArtifact()
                .getProject();

        // Hard gate: must be on the project team at all.
        if (!projectMemberRepository.existsByProjectAndUser(project, resolver)) {
            throw new AccessDeniedException(
                    "User is not a member of this project team");
        }

        // The assigned reviewer may resolve.
        boolean isReviewer = capsule.getReviewer() != null
                && capsule.getReviewer().getId().equals(resolver.getId());
        if (isReviewer) {
            return;
        }

        // Otherwise a workspace ADMIN/OWNER (who is also on the team, per the
        // check above) may resolve.
        Workspace workspace = project.getWorkspace();
        WorkspaceMember membership = workspaceMemberRepository
                .findByWorkspaceAndUser(workspace, resolver)
                .orElseThrow(() -> new AccessDeniedException(
                        "Only the capsule's reviewer or a workspace ADMIN/OWNER may resolve it"));

        if (membership.getRole() == WorkspaceMember.Role.ADMIN
                || membership.getRole() == WorkspaceMember.Role.OWNER) {
            return;
        }

        throw new AccessDeniedException(
                "Only the capsule's reviewer or a workspace ADMIN/OWNER may resolve it");
    }

    /**
     * Verify the user is on the capsule's project team.
     */
    private void verifyProjectMembership(Capsule capsule, User user) {
        Project project = capsule.getArtifactAnchor()
                .getArtifactVersion()
                .getArtifact()
                .getProject();

        boolean isMember = projectMemberRepository
                .existsByProjectAndUser(project, user);
        if (!isMember) {
            throw new AccessDeniedException(
                    "User is not a member of this project team");
        }
    }
}

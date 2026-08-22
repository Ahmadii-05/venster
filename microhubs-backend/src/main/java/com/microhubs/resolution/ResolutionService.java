package com.microhubs.resolution;

import com.microhubs.auth.User;
import com.microhubs.auth.UserRepository;
import com.microhubs.capsule.Capsule;
import com.microhubs.capsule.CapsuleRepository;
import com.microhubs.capsule.CapsuleService;
import com.microhubs.capsule.CapsuleStatus;
import com.microhubs.common.ApiResponse;
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
    private ApplicationEventPublisher eventPublisher;
    @Autowired
    private NotificationService notificationService;

    /**
     * Resolve a capsule.
     *
     * Authorization: Only the capsule's assigned reviewer OR a workspace
     * ADMIN/OWNER may resolve it.
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

        // Authorization: reviewer OR workspace ADMIN/OWNER
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
    public ApiResponse<Resolution> getResolution(UUID capsuleId) {
        Resolution resolution = resolutionRepository.findByCapsuleId(capsuleId)
                .orElseThrow(() -> new RuntimeException("Resolution not found for this capsule"));
        return ApiResponse.success(resolution);
    }

    // ── helpers ──────────────────────────────────────────────

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    /**
     * Only the capsule's reviewer OR a workspace ADMIN/OWNER may resolve.
     */
    private void verifyResolverAuthorization(Capsule capsule, User resolver) {
        // Check if user is the assigned reviewer
        boolean isReviewer = capsule.getReviewer() != null
                && capsule.getReviewer().getId().equals(resolver.getId());
        if (isReviewer) {
            return;
        }

        // Check if user is ADMIN or OWNER in the capsule's workspace
        Workspace workspace = capsule.getArtifactAnchor()
                .getArtifactVersion()
                .getArtifact()
                .getProject()
                .getWorkspace();

        WorkspaceMember membership = workspaceMemberRepository
                .findByWorkspaceAndUser(workspace, resolver)
                .orElseThrow(() -> new AccessDeniedException(
                        "User is not a member of this workspace"));

        if (membership.getRole() == WorkspaceMember.Role.ADMIN
                || membership.getRole() == WorkspaceMember.Role.OWNER) {
            return;
        }

        throw new AccessDeniedException(
                "Only the capsule's reviewer or a workspace ADMIN/OWNER may resolve it");
    }
}

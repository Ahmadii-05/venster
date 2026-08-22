package com.microhubs.capsule;

import com.microhubs.artifact.ArtifactAnchor;
import com.microhubs.artifact.ArtifactAnchorRepository;
import com.microhubs.auth.User;
import com.microhubs.auth.UserRepository;
import com.microhubs.common.ApiResponse;
import com.microhubs.workspace.Workspace;
import com.microhubs.notification.NotificationService;
import com.microhubs.workspace.WorkspaceMemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional
public class CapsuleService {

    @Autowired
    private CapsuleRepository capsuleRepository;
    @Autowired
    private ArtifactAnchorRepository artifactAnchorRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired
    private NotificationService notificationService;

    /**
     * Explicit allowed-status transitions.
     * If a transition is not listed here, it is rejected with 400.
     *
     *   OPEN      → IN_REVIEW, ARCHIVED
     *   IN_REVIEW → ANSWERED, ARCHIVED
     *   ANSWERED  → IN_REVIEW, RESOLVED, ARCHIVED
     *   RESOLVED  → (none — terminal)
     *   ARCHIVED  → (none — terminal)
     */
    private static final Map<CapsuleStatus, Set<CapsuleStatus>> ALLOWED_TRANSITIONS;
    static {
        Map<CapsuleStatus, Set<CapsuleStatus>> m = new EnumMap<>(CapsuleStatus.class);
        m.put(CapsuleStatus.OPEN,      Set.of(CapsuleStatus.IN_REVIEW, CapsuleStatus.ARCHIVED));
        m.put(CapsuleStatus.IN_REVIEW, Set.of(CapsuleStatus.ANSWERED, CapsuleStatus.ARCHIVED));
        m.put(CapsuleStatus.ANSWERED,  Set.of(CapsuleStatus.IN_REVIEW, CapsuleStatus.RESOLVED, CapsuleStatus.ARCHIVED));
        m.put(CapsuleStatus.RESOLVED,  Set.of());
        m.put(CapsuleStatus.ARCHIVED,  Set.of());
        ALLOWED_TRANSITIONS = Collections.unmodifiableMap(m);
    }

    /**
     * Create a new capsule (defaults to OPEN).
     * Verifies the caller is a member of the workspace that owns the anchor's project.
     */
    public ApiResponse<Capsule> createCapsule(String email, CapsuleRequest request) {
        User author = getUser(email);

        ArtifactAnchor anchor = artifactAnchorRepository.findById(request.getArtifactAnchorId())
                .orElseThrow(() -> new RuntimeException("Artifact anchor not found"));

        // Walk the anchor chain to get workspace and verify membership
        Workspace workspace = anchor.getArtifactVersion()
                .getArtifact().getProject().getWorkspace();
        verifyWorkspaceMembership(workspace, author);

        Capsule capsule = new Capsule();
        capsule.setArtifactAnchor(anchor);
        capsule.setAuthor(author);
        capsule.setTitle(request.getTitle());
        capsule.setStatus(CapsuleStatus.OPEN);
        capsule.setPriority(
                request.getPriority() != null ? request.getPriority() : CapsulePriority.MEDIUM);

        capsule = capsuleRepository.save(capsule);
        return ApiResponse.success(capsule);
    }

    /**
     * List capsules with optional filters.
     */
    @Transactional(readOnly = true)
    public ApiResponse<List<Capsule>> listCapsules(
            UUID projectId, CapsuleStatus status, UUID assigneeId) {
        List<Capsule> capsules;
        String statusName = status != null ? status.name() : null;
        if (statusName != null && assigneeId != null) {
            capsules = capsuleRepository.findByProjectIdStatusAndAssignee(
                    projectId, statusName, assigneeId);
        } else if (statusName != null) {
            capsules = capsuleRepository.findByProjectIdAndStatus(
                    projectId, statusName);
        } else if (assigneeId != null) {
            capsules = capsuleRepository.findByProjectIdAndAssignee(
                    projectId, assigneeId);
        } else {
            capsules = capsuleRepository.findByProjectId(projectId);
        }
        return ApiResponse.success(capsules);
    }

    /**
     * Get a single capsule by ID.
     */
    @Transactional(readOnly = true)
    public ApiResponse<Capsule> getCapsule(UUID capsuleId) {
        Capsule capsule = getCapsuleById(capsuleId);
        return ApiResponse.success(capsule);
    }

    /**
     * Update capsule status (with transition enforcement) and/or reviewer.
     */
    public ApiResponse<Capsule> updateCapsule(
            UUID capsuleId, String email, CapsuleUpdateRequest request) {
        User user = getUser(email);
        Capsule capsule = getCapsuleById(capsuleId);

        // Status transition enforcement
        if (request.getStatus() != null) {
            CapsuleStatus currentStatus = capsule.getStatus();
            CapsuleStatus targetStatus = request.getStatus();

            if (currentStatus == targetStatus) {
                return ApiResponse.success(capsule); // no-op
            }

            Set<CapsuleStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(
                    currentStatus, Set.of());
            if (!allowed.contains(targetStatus)) {
                throw new IllegalArgumentException(
                        "Invalid status transition: " + currentStatus + " → " + targetStatus
                        + ". Allowed transitions from " + currentStatus + ": " + allowed);
            }
            capsule.setStatus(targetStatus);
        }

        // Reviewer assignment
        if (request.getReviewerId() != null) {
            User reviewer = userRepository.findById(request.getReviewerId())
                    .orElseThrow(() -> new RuntimeException("Reviewer not found"));
            capsule.setReviewer(reviewer);
            // Notify the assigned reviewer
            notificationService.notify(
                    reviewer.getId(),
                    "CAPSULE_ASSIGNED",
                    "{\"capsuleId\":\"" + capsule.getId() + "\",\"title\":\"" + capsule.getTitle() + "\"}");
        }

        // Priority update
        if (request.getPriority() != null) {
            capsule.setPriority(request.getPriority());
        }

        // Title update
        if (request.getTitle() != null) {
            capsule.setTitle(request.getTitle());
        }

        capsule = capsuleRepository.save(capsule);
        return ApiResponse.success(capsule);
    }

    /**
     * Transition a capsule to a new status.
     * Used internally by other services (Discussion, Resolution).
     */
    public Capsule transitionStatus(Capsule capsule, CapsuleStatus targetStatus) {
        CapsuleStatus currentStatus = capsule.getStatus();
        if (currentStatus == targetStatus) {
            return capsule;
        }

        Set<CapsuleStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(
                currentStatus, Set.of());
        if (!allowed.contains(targetStatus)) {
            throw new IllegalArgumentException(
                    "Invalid status transition: " + currentStatus + " → " + targetStatus);
        }
        capsule.setStatus(targetStatus);
        return capsuleRepository.save(capsule);
    }

    // ── helpers ──────────────────────────────────────────────

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Capsule getCapsuleById(UUID id) {
        return capsuleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Capsule not found"));
    }

    private void verifyWorkspaceMembership(Workspace workspace, User user) {
        boolean isMember = workspaceMemberRepository
                .existsByWorkspaceAndUser(workspace, user);
        if (!isMember) {
            throw new AccessDeniedException(
                    "User is not a member of this workspace");
        }
    }
}

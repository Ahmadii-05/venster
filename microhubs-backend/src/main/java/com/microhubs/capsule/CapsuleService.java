package com.microhubs.capsule;

import com.microhubs.artifact.ArtifactAnchor;
import com.microhubs.artifact.ArtifactAnchorRepository;
import com.microhubs.auth.User;
import com.microhubs.auth.UserRepository;
import com.microhubs.common.ApiResponse;
import com.microhubs.project.Project;
import com.microhubs.project.ProjectMemberRepository;
import com.microhubs.project.ProjectRepository;
import com.microhubs.notification.NotificationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private ProjectMemberRepository projectMemberRepository;
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private ProjectRepository projectRepository;
    @Autowired
    private ObjectMapper objectMapper;

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
     * Verifies the caller is a member of the project team that owns the anchor.
     */
    public ApiResponse<Capsule> createCapsule(String email, CapsuleRequest request) {
        User author = getUser(email);

        ArtifactAnchor anchor = artifactAnchorRepository.findById(request.getArtifactAnchorId())
                .orElseThrow(() -> new RuntimeException("Artifact anchor not found"));

        // Walk the anchor chain to the project and verify team membership
        Project project = anchor.getArtifactVersion()
                .getArtifact().getProject();
        verifyProjectMembership(project, author);

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
            UUID projectId, CapsuleStatus status, UUID assigneeId, String email) {
        User user = getUser(email);
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        verifyProjectMembership(project, user);

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
    public ApiResponse<Capsule> getCapsule(UUID capsuleId, String email) {
        User user = getUser(email);
        Capsule capsule = getCapsuleById(capsuleId);
        verifyProjectMembership(projectOf(capsule), user);
        return ApiResponse.success(capsule);
    }

    /**
     * Update capsule status (with transition enforcement) and/or reviewer.
     */
    public ApiResponse<Capsule> updateCapsule(
            UUID capsuleId, String email, CapsuleUpdateRequest request) {
        User user = getUser(email);
        Capsule capsule = getCapsuleById(capsuleId);
        verifyProjectMembership(projectOf(capsule), user);

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
                    .orElseThrow(() -> new IllegalArgumentException("No such user found"));
            // Reviewer must belong to the same project team as the capsule
            verifyProjectMembership(projectOf(capsule), reviewer);
            capsule.setReviewer(reviewer);
            // Notify the assigned reviewer
            notificationService.notify(
                    reviewer.getId(),
                    "CAPSULE_ASSIGNED",
                    toJson(Map.of(
                            "capsuleId", capsule.getId().toString(),
                            "title", capsule.getTitle())));
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

    /** Resolve the owning project by walking the anchor → version → artifact → project chain. */
    private Project projectOf(Capsule capsule) {
        return capsule.getArtifactAnchor()
                .getArtifactVersion()
                .getArtifact()
                .getProject();
    }

    /** Serialize a map to a JSON string safely (prevents injection via user-controlled values). */
    private String toJson(Map<String, Object> data) {
        try {
            return objectMapper.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize notification context", e);
        }
    }

    private void verifyProjectMembership(Project project, User user) {
        boolean isMember = projectMemberRepository
                .existsByProjectAndUser(project, user);
        if (!isMember) {
            throw new AccessDeniedException(
                    "User is not a member of this project team");
        }
    }
}

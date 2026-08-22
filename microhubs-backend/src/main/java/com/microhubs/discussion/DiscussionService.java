package com.microhubs.discussion;

import com.microhubs.auth.User;
import com.microhubs.auth.UserRepository;
import com.microhubs.capsule.Capsule;
import com.microhubs.capsule.CapsuleRepository;
import com.microhubs.capsule.CapsuleService;
import com.microhubs.capsule.CapsuleStatus;
import com.microhubs.common.ApiResponse;
import com.microhubs.notification.NotificationService;
import com.microhubs.workspace.WorkspaceMemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class DiscussionService {

    @Autowired
    private CommentRepository commentRepository;
    @Autowired
    private CapsuleRepository capsuleRepository;
    @Autowired
    private CapsuleService capsuleService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired
    private NotificationService notificationService;

    /**
     * Post a comment on a capsule.
     *
     * Business rule: If the capsule is in OPEN status, posting a comment
     * auto-transitions it to IN_REVIEW (the capsule is now being discussed).
     */
    public ApiResponse<Comment> postComment(
            UUID capsuleId, String email, CommentRequest request) {
        User author = getUser(email);

        Capsule capsule = capsuleRepository.findById(capsuleId)
                .orElseThrow(() -> new RuntimeException("Capsule not found"));

        // Verify workspace membership through anchor chain
        verifyWorkspaceMembership(capsule, author);

        // Auto-transition: OPEN → IN_REVIEW when first comment is posted
        if (capsule.getStatus() == CapsuleStatus.OPEN) {
            capsuleService.transitionStatus(capsule, CapsuleStatus.IN_REVIEW);
        }

        Comment comment = new Comment();
        comment.setCapsule(capsule);
        comment.setAuthor(author);
        comment.setBody(request.getBody());
        comment = commentRepository.save(comment);

        // Notify capsule author (if not the commenter) and reviewer (if assigned)
        String contextJson = "{\"capsuleId\":\"" + capsule.getId()
                + "\",\"commentId\":\"" + comment.getId() + "\"}";

        if (!capsule.getAuthor().getId().equals(author.getId())) {
            notificationService.notify(
                    capsule.getAuthor().getId(), "NEW_COMMENT", contextJson);
        }
        if (capsule.getReviewer() != null
                && !capsule.getReviewer().getId().equals(author.getId())) {
            notificationService.notify(
                    capsule.getReviewer().getId(), "NEW_COMMENT", contextJson);
        }

        return ApiResponse.success(comment);
    }

    /**
     * List comments for a capsule, ordered by creation time.
     */
    @Transactional(readOnly = true)
    public ApiResponse<List<Comment>> listComments(UUID capsuleId) {
        Capsule capsule = capsuleRepository.findById(capsuleId)
                .orElseThrow(() -> new RuntimeException("Capsule not found"));

        List<Comment> comments = commentRepository
                .findByCapsuleOrderByCreatedAtAsc(capsule);
        return ApiResponse.success(comments);
    }

    // ── helpers ──────────────────────────────────────────────

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void verifyWorkspaceMembership(Capsule capsule, User user) {
        // Walk the anchor chain to find workspace
        var workspace = capsule.getArtifactAnchor()
                .getArtifactVersion()
                .getArtifact()
                .getProject()
                .getWorkspace();

        boolean isMember = workspaceMemberRepository
                .existsByWorkspaceAndUser(workspace, user);
        if (!isMember) {
            throw new AccessDeniedException(
                    "User is not a member of this workspace");
        }
    }
}

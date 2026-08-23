package com.microhubs.knowledge;

import com.microhubs.auth.User;
import com.microhubs.auth.UserRepository;
import com.microhubs.capsule.CapsuleRepository;
import com.microhubs.common.ApiResponse;
import com.microhubs.workspace.WorkspaceMemberRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class KnowledgeHealthService {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeHealthService.class);

    @Autowired
    private CapsuleRepository capsuleRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;

    /**
     * Returns aging capsules and hot artifacts for a workspace.
     * Read-only aggregation — no writes, no side effects.
     */
    @Transactional(readOnly = true)
    public ApiResponse<KnowledgeHealthResponse> getKnowledgeHealth(
            UUID workspaceId, String email, int agingThresholdDays) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Verify workspace membership
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "You are not a member of this workspace");
        }

        // Aging capsules
        List<KnowledgeHealthResponse.AgingCapsule> agingCapsules = new ArrayList<>();
        try {
            List<Object[]> rows = capsuleRepository.findAgingCapsulesByWorkspace(
                    workspaceId, agingThresholdDays);
            for (Object[] row : rows) {
                UUID capsuleId = (UUID) row[0];
                String title = (String) row[1];
                String status = (String) row[2];
                String priority = (String) row[3];
                long daysInStatus = ((Number) row[4]).longValue();
                agingCapsules.add(new KnowledgeHealthResponse.AgingCapsule(
                        capsuleId, title, status, daysInStatus, priority));
            }
        } catch (Exception e) {
            log.warn("Failed to query aging capsules: {}", e.getMessage());
        }

        // Hot artifacts
        List<KnowledgeHealthResponse.HotArtifact> hotArtifacts = new ArrayList<>();
        try {
            List<Object[]> rows = capsuleRepository.findHotArtifactsByWorkspace(workspaceId);
            for (Object[] row : rows) {
                UUID artifactId = (UUID) row[0];
                String filePath = (String) row[1];
                long capsuleCount = ((Number) row[2]).longValue();
                long openCapsuleCount = ((Number) row[3]).longValue();
                hotArtifacts.add(new KnowledgeHealthResponse.HotArtifact(
                        artifactId, filePath, capsuleCount, openCapsuleCount));
            }
        } catch (Exception e) {
            log.warn("Failed to query hot artifacts: {}", e.getMessage());
        }

        return ApiResponse.success(new KnowledgeHealthResponse(agingCapsules, hotArtifacts));
    }
}

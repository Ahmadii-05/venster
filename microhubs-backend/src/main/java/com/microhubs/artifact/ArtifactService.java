package com.microhubs.artifact;

import com.microhubs.auth.User;
import com.microhubs.auth.UserRepository;
import com.microhubs.common.ApiResponse;
import com.microhubs.project.Project;
import com.microhubs.project.ProjectRepository;
import com.microhubs.workspace.Workspace;
import com.microhubs.workspace.WorkspaceMemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class ArtifactService {

    @Autowired
    private ArtifactRepository artifactRepository;
    @Autowired
    private ArtifactVersionRepository artifactVersionRepository;
    @Autowired
    private ArtifactAnchorRepository artifactAnchorRepository;
    @Autowired
    private ProjectRepository projectRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;

    /**
     * Create or reuse an artifact for a file path under a project.
     * If an artifact with the same project + filePath already exists, return it.
     */
    public ApiResponse<Artifact> createArtifact(String email, ArtifactRequest request) {
        User user = getUser(email);
        Project project = getProject(request.getProjectId());
        verifyWorkspaceMembership(project.getWorkspace(), user);

        // Reuse existing artifact if same project + filePath
        Artifact artifact = artifactRepository
                .findByProjectAndFilePath(project, request.getFilePath())
                .orElseGet(() -> {
                    Artifact a = new Artifact();
                    a.setProject(project);
                    a.setFilePath(request.getFilePath());
                    a.setRepository(request.getRepository());
                    return artifactRepository.save(a);
                });

        return ApiResponse.success(artifact);
    }

    /**
     * Create a new version under an artifact.
     */
    public ApiResponse<ArtifactVersion> createVersion(
            UUID artifactId, String email, ArtifactVersionRequest request) {
        User user = getUser(email);
        Artifact artifact = getArtifact(artifactId);
        verifyWorkspaceMembership(artifact.getProject().getWorkspace(), user);

        ArtifactVersion version = new ArtifactVersion();
        version.setArtifact(artifact);
        version.setCommitHash(request.getCommitHash());
        version.setVersionLabel(request.getVersionLabel());
        version = artifactVersionRepository.save(version);

        return ApiResponse.success(version);
    }

    /**
     * Create a new anchor under an artifact version.
     */
    public ApiResponse<ArtifactAnchor> createAnchor(
            UUID versionId, String email, ArtifactAnchorRequest request) {
        User user = getUser(email);
        ArtifactVersion version = getVersion(versionId);
        verifyWorkspaceMembership(
                version.getArtifact().getProject().getWorkspace(), user);

        ArtifactAnchor anchor = new ArtifactAnchor();
        anchor.setArtifactVersion(version);
        anchor.setStartLine(request.getStartLine());
        anchor.setEndLine(request.getEndLine());
        anchor.setSelectedText(request.getSelectedText());
        anchor.setContentHash(request.getContentHash());
        anchor.setSymbolName(request.getSymbolName());
        anchor = artifactAnchorRepository.save(anchor);

        return ApiResponse.success(anchor);
    }

    // ── helpers ──────────────────────────────────────────────

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Project getProject(UUID projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
    }

    private Artifact getArtifact(UUID artifactId) {
        return artifactRepository.findById(artifactId)
                .orElseThrow(() -> new RuntimeException("Artifact not found"));
    }

    private ArtifactVersion getVersion(UUID versionId) {
        return artifactVersionRepository.findById(versionId)
                .orElseThrow(() -> new RuntimeException("Artifact version not found"));
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

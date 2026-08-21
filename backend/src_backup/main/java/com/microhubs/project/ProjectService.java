package com.microhubs.project;

import com.microhubs.auth.User;
import com.microhubs.common.ApiResponse;
import com.microhubs.workspace.Workspace;
import com.microhubs.workspace.WorkspaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;

    @Transactional
    public ApiResponse<Project> createProject(UUID workspaceId, User user, com.microhubs.project.ProjectRequest request) {
        User existingUser = userRepository.findByEmail(user.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));
        
        // Verify user is a member of the workspace
        boolean isMember = workspaceMemberRepository.existsByWorkspaceAndUser(workspace, existingUser);
        if (!isMember) {
            return ApiResponse.error("User is not a member of this workspace");
        }
        
        Project project = new Project();
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setWorkspace(workspace);
        project.setCreatedBy(existingUser);
        project = projectRepository.save(project);
        
        return ApiResponse.success(project);
    }

    public ApiResponse<List<Project>> listProjects(UUID workspaceId, User user) {
        User existingUser = userRepository.findByEmail(user.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));
        
        // Verify user is a member of the workspace
        boolean isMember = workspaceMemberRepository.existsByWorkspaceAndUser(workspace, existingUser);
        if (!isMember) {
            return ApiResponse.error("User is not a member of this workspace");
        }
        
        List<Project> projects = projectRepository.findByWorkspace(workspace);
        return ApiResponse.success(projects);
    }
}
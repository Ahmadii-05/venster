package com.microhubs.workspace;

import com.microhubs.auth.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class WorkspaceService {

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;

    @Autowired
    private UserRepository userRepository;

    public Workspace createWorkspace(String name, String email) {
        User creator = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Workspace workspace = new Workspace();
        workspace.setName(name);
        workspace.setCreatedBy(creator);
        workspace = workspaceRepository.save(workspace);

        // Creator becomes OWNER member
        WorkspaceMember member = new WorkspaceMember();
        member.setWorkspace(workspace);
        member.setUser(creator);
        member.setRole(WorkspaceMember.Role.OWNER);
        member.setJoinedAt(LocalDateTime.now());
        workspaceMemberRepository.save(member);

        return workspace;
    }

    public List<Workspace> getUserWorkspaces(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Query workspace members for this user
        return workspaceMemberRepository.findByUser(user).stream()
                .map(WorkspaceMember::getWorkspace)
                .collect(Collectors.toList());
    }

    public void addMember(Long workspaceId, String email, Role role) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check if user is member or admin
        if (!isMember(workspaceId, email)) {
            WorkspaceMember member = new WorkspaceMember();
            member.setWorkspace(workspace);
            member.setUser(user);
            member.setRole(role);
            member.setJoinedAt(LocalDateTime.now());
            workspaceMemberRepository.save(member);
        }
    }

    public void removeMember(Long workspaceId, String email) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        WorkspaceMember member = workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
                .orElseThrow(() -> new RuntimeException("Member not found"));
        workspaceMemberRepository.delete(member);
    }

    private boolean isMember(Long workspaceId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return workspaceMemberRepository.existsByWorkspaceAndUser(workspaceRepository.findById(workspaceId).get(), user);
    }
}

package com.microhubs.workspace;

import com.microhubs.auth.User;
import com.microhubs.auth.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
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

    public void addMember(UUID workspaceId, String email, String role) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!isMember(workspaceId, email)) {
            WorkspaceMember member = new WorkspaceMember();
            member.setWorkspace(workspace);
            member.setUser(user);
            member.setRole(WorkspaceMember.Role.valueOf(role.toUpperCase()));
            workspaceMemberRepository.save(member);
        }
    }

    public void removeMember(UUID workspaceId, String email) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        WorkspaceMember member = workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
                .orElseThrow(() -> new RuntimeException("Member not found"));
        workspaceMemberRepository.delete(member);
    }

    public WorkspaceMember getMember(UUID workspaceId, String email) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
                .orElseThrow(() -> new RuntimeException("Member not found"));
    }

    private boolean isMember(UUID workspaceId, String email) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return workspaceMemberRepository.existsByWorkspaceAndUser(workspace, user);
    }
}

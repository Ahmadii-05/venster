package com.microhubs.workspace;

import com.microhubs.auth.User;
import com.microhubs.common.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "workspace_members")
public class WorkspaceMember extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    public enum Role { OWNER, ADMIN, MEMBER }

    public WorkspaceMember() {}

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public Workspace getWorkspace() { return workspace; }
    public void setWorkspace(Workspace workspace) { this.workspace = workspace; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}

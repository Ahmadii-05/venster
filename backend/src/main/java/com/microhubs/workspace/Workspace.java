package com.microhubs.workspace;

import com.microhubs.auth.User;
import com.microhubs.common.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "workspaces")
public class Workspace extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @ManyToOne
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    public Workspace() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
}

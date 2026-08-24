package com.microhubs.project;

import com.microhubs.common.BaseEntity;
import com.microhubs.workspace.Workspace;
import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "projects")
public class Project extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    // schema does not include a created_by on projects; created_by handled at service level if needed

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    // ── Technical / production metadata (all optional) ───────────
    // Added so a project captures the standard details a team tracks.
    // Every column is nullable (or defaulted) to stay compatible with
    // rows created before these fields existed, under ddl-auto: validate.

    @Column(name = "repository_url", length = 500)
    private String repositoryUrl;

    @Column(name = "tech_stack", length = 255)
    private String techStack;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ProjectStatus status = ProjectStatus.PLANNING;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ProjectPriority priority = ProjectPriority.MEDIUM;

    @Column(name = "target_date")
    private LocalDate targetDate;

    public Project() {}

    public Workspace getWorkspace() { return workspace; }
    public void setWorkspace(Workspace workspace) { this.workspace = workspace; }

    // no createdBy getter/setter to match database schema

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getRepositoryUrl() { return repositoryUrl; }
    public void setRepositoryUrl(String repositoryUrl) { this.repositoryUrl = repositoryUrl; }

    public String getTechStack() { return techStack; }
    public void setTechStack(String techStack) { this.techStack = techStack; }

    public ProjectStatus getStatus() { return status; }
    public void setStatus(ProjectStatus status) { this.status = status; }

    public ProjectPriority getPriority() { return priority; }
    public void setPriority(ProjectPriority priority) { this.priority = priority; }

    public LocalDate getTargetDate() { return targetDate; }
    public void setTargetDate(LocalDate targetDate) { this.targetDate = targetDate; }
}

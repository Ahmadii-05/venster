package com.microhubs.project;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Request body for creating and updating a project.
 *
 * Name is required; everything else is optional technical metadata so the
 * form can capture standard project details without forcing them.
 */
public class ProjectRequest {

    @NotBlank(message = "Project name is required")
    @Size(min = 3, message = "Project name must be at least 3 characters")
    private String name;

    @Size(max = 500, message = "Description must be at most 500 characters")
    private String description;

    @Size(max = 500, message = "Repository URL must be at most 500 characters")
    private String repositoryUrl;

    @Size(max = 255, message = "Tech stack must be at most 255 characters")
    private String techStack;

    private ProjectStatus status;

    private ProjectPriority priority;

    private LocalDate targetDate;

    /**
     * Optional initial team members chosen at creation time. Each id must
     * belong to a workspace member; ignored on update. The creator is always
     * added regardless of this list.
     */
    private List<UUID> memberIds;

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

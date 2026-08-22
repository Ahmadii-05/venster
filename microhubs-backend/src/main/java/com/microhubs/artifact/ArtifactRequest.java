package com.microhubs.artifact;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class ArtifactRequest {

    @NotNull(message = "Project ID is required")
    private UUID projectId;

    @NotBlank(message = "File path is required")
    private String filePath;

    private String repository;

    public UUID getProjectId() { return projectId; }
    public void setProjectId(UUID projectId) { this.projectId = projectId; }

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

    public String getRepository() { return repository; }
    public void setRepository(String repository) { this.repository = repository; }
}

package com.microhubs.capsule;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public class CapsuleRequest {

    @NotNull(message = "Artifact anchor ID is required")
    private UUID artifactAnchorId;

    @NotBlank(message = "Title is required")
    @Size(max = 1000, message = "Title must be at most 1000 characters")
    private String title;

    private CapsulePriority priority;

    public UUID getArtifactAnchorId() { return artifactAnchorId; }
    public void setArtifactAnchorId(UUID artifactAnchorId) { this.artifactAnchorId = artifactAnchorId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public CapsulePriority getPriority() { return priority; }
    public void setPriority(CapsulePriority priority) { this.priority = priority; }
}

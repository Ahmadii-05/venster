package com.microhubs.capsule;

import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Used for PATCH /api/capsules/{id} to update status and/or reviewer.
 * At least one field must be provided.
 */
public class CapsuleUpdateRequest {

    private CapsuleStatus status;

    private UUID reviewerId;

    private CapsulePriority priority;

    @Size(max = 1000, message = "Title must be at most 1000 characters")
    private String title;

    public CapsuleStatus getStatus() { return status; }
    public void setStatus(CapsuleStatus status) { this.status = status; }

    public UUID getReviewerId() { return reviewerId; }
    public void setReviewerId(UUID reviewerId) { this.reviewerId = reviewerId; }

    public CapsulePriority getPriority() { return priority; }
    public void setPriority(CapsulePriority priority) { this.priority = priority; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
}

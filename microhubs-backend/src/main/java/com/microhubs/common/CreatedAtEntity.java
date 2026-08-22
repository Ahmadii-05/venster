package com.microhubs.common;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Lightweight mapped superclass for entities that only have
 * id + created_at (no updated_at column in the schema).
 *
 * Tables using this: artifact_versions, artifact_anchors,
 * comments, resolutions, notifications.
 */
@MappedSuperclass
public abstract class CreatedAtEntity {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public CreatedAtEntity() {}

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

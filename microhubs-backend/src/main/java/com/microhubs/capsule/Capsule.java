package com.microhubs.capsule;

import com.microhubs.artifact.ArtifactAnchor;
import com.microhubs.auth.User;
import com.microhubs.common.BaseEntity;
import jakarta.persistence.*;

/**
 * A discussion thread attached to a specific piece of code.
 * Maps to the "capsules" table in schema.sql.
 *
 * Columns: id, artifact_anchor_id, author_id, reviewer_id,
 *          priority, status, title, created_at, updated_at
 */
@Entity
@Table(name = "capsules")
public class Capsule extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "artifact_anchor_id", nullable = false)
    private ArtifactAnchor artifactAnchor;

    @ManyToOne
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @ManyToOne
    @JoinColumn(name = "reviewer_id")
    private User reviewer;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private CapsulePriority priority = CapsulePriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CapsuleStatus status = CapsuleStatus.OPEN;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String title;

    public Capsule() {}

    public ArtifactAnchor getArtifactAnchor() { return artifactAnchor; }
    public void setArtifactAnchor(ArtifactAnchor artifactAnchor) { this.artifactAnchor = artifactAnchor; }

    public User getAuthor() { return author; }
    public void setAuthor(User author) { this.author = author; }

    public User getReviewer() { return reviewer; }
    public void setReviewer(User reviewer) { this.reviewer = reviewer; }

    public CapsulePriority getPriority() { return priority; }
    public void setPriority(CapsulePriority priority) { this.priority = priority; }

    public CapsuleStatus getStatus() { return status; }
    public void setStatus(CapsuleStatus status) { this.status = status; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
}

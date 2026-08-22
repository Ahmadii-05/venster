package com.microhubs.knowledge;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.microhubs.auth.User;
import com.microhubs.common.CreatedAtEntity;
import com.microhubs.resolution.Resolution;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A knowledge item generated from a resolved capsule.
 * Maps to the "knowledge_items" table in schema.sql.
 *
 * The embedding column uses pgvector via a custom VectorType UserType.
 */
@Entity
@Table(name = "knowledge_items")
public class KnowledgeItem extends CreatedAtEntity {

    @JsonIgnore
    @OneToOne
    @JoinColumn(name = "resolution_id", unique = true)
    private Resolution resolution;

    @Column(columnDefinition = "TEXT")
    private String title;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(name = "root_cause", columnDefinition = "TEXT")
    private String rootCause;

    @Column(columnDefinition = "TEXT")
    private String solution;

    @Column(columnDefinition = "TEXT[]")
    private String[] tags;

    @Column(length = 100)
    private String category;

    @Column(precision = 3, scale = 2)
    private BigDecimal confidence;

    /**
     * pgvector embedding — 1536 dimensions for OpenAI text-embedding-3-small.
     * Stored as vector(1536) in PostgreSQL.
     */
    @JsonIgnore
    @Type(VectorType.class)
    @Column(columnDefinition = "vector(1536)")
    private float[] embedding;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private KnowledgeVisibility visibility = KnowledgeVisibility.PRIVATE;

    @ManyToOne
    @JoinColumn(name = "published_by")
    @JsonIgnore
    private User publishedBy;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "global_answer_id")
    @JsonIgnore
    private UUID globalAnswerId;

    @Column(nullable = false)
    private boolean approved = false;

    public KnowledgeItem() {}

    public Resolution getResolution() { return resolution; }
    public void setResolution(Resolution resolution) { this.resolution = resolution; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getRootCause() { return rootCause; }
    public void setRootCause(String rootCause) { this.rootCause = rootCause; }
    public String getSolution() { return solution; }
    public void setSolution(String solution) { this.solution = solution; }
    public String[] getTags() { return tags; }
    public void setTags(String[] tags) { this.tags = tags; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public BigDecimal getConfidence() { return confidence; }
    public void setConfidence(BigDecimal confidence) { this.confidence = confidence; }
    public float[] getEmbedding() { return embedding; }
    public void setEmbedding(float[] embedding) { this.embedding = embedding; }
    public KnowledgeVisibility getVisibility() { return visibility; }
    public void setVisibility(KnowledgeVisibility visibility) { this.visibility = visibility; }
    public User getPublishedBy() { return publishedBy; }
    public void setPublishedBy(User publishedBy) { this.publishedBy = publishedBy; }
    public LocalDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(LocalDateTime publishedAt) { this.publishedAt = publishedAt; }
    public UUID getGlobalAnswerId() { return globalAnswerId; }
    public void setGlobalAnswerId(UUID globalAnswerId) { this.globalAnswerId = globalAnswerId; }
    public boolean isApproved() { return approved; }
    public void setApproved(boolean approved) { this.approved = approved; }
}

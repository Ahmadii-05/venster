package com.microhubs.resolution;

import com.microhubs.auth.User;
import com.microhubs.capsule.Capsule;
import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A resolution for a capsule — exactly one per capsule (UNIQUE constraint).
 * Maps to the "resolutions" table in schema.sql.
 *
 * Columns: id, capsule_id (UNIQUE), resolver_id, final_solution, resolved_at
 *
 * NOTE: This table does NOT have created_at — it uses resolved_at instead,
 * so it does NOT extend CreatedAtEntity.
 */
@Entity
@Table(name = "resolutions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"capsule_id"}))
public class Resolution {

    @Id
    @UuidGenerator
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "capsule_id", nullable = false, unique = true)
    private Capsule capsule;

    @ManyToOne
    @JoinColumn(name = "resolver_id", nullable = false)
    private User resolver;

    @Column(name = "final_solution", nullable = false, columnDefinition = "TEXT")
    private String finalSolution;

    @Column(name = "resolved_at", nullable = false, updatable = false)
    private LocalDateTime resolvedAt;

    public Resolution() {
        this.resolvedAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Capsule getCapsule() { return capsule; }
    public void setCapsule(Capsule capsule) { this.capsule = capsule; }

    public User getResolver() { return resolver; }
    public void setResolver(User resolver) { this.resolver = resolver; }

    public String getFinalSolution() { return finalSolution; }
    public void setFinalSolution(String finalSolution) { this.finalSolution = finalSolution; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
}

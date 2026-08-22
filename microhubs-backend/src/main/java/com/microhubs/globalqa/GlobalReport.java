package com.microhubs.globalqa;

import com.microhubs.auth.User;
import com.microhubs.common.CreatedAtEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "global_reports", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"reporter_id", "target_type", "target_id"})
})
public class GlobalReport extends CreatedAtEntity {

    @ManyToOne
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @Column(name = "target_type", nullable = false, length = 20)
    private String targetType;

    @Column(name = "target_id", nullable = false)
    private java.util.UUID targetId;

    public GlobalReport() {}

    public GlobalReport(User reporter, String targetType, java.util.UUID targetId) {
        this.reporter = reporter;
        this.targetType = targetType;
        this.targetId = targetId;
    }

    public User getReporter() { return reporter; }
    public void setReporter(User reporter) { this.reporter = reporter; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public java.util.UUID getTargetId() { return targetId; }
    public void setTargetId(java.util.UUID targetId) { this.targetId = targetId; }
}

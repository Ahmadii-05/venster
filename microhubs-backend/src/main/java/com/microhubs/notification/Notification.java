package com.microhubs.notification;

import com.microhubs.auth.User;
import com.microhubs.common.CreatedAtEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * A notification for a user.
 *
 * Maps to the "notifications" table in schema.sql.
 *
 * Columns:
 * id, user_id, type, context (JSONB), read, created_at
 */
@Entity
@Table(name = "notifications")
public class Notification extends CreatedAtEntity {

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 50)
    private String type;

    /**
     * PostgreSQL JSONB column.
     *
     * Hibernate must explicitly bind this String as JSON/JSONB
     * instead of sending it as VARCHAR.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String context;

    @Column(name = "\"read\"", nullable = false)
    private Boolean read = false;

    public Notification() {
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getContext() {
        return context;
    }

    public void setContext(String context) {
        this.context = context;
    }

    public Boolean getRead() {
        return read;
    }

    public void setRead(Boolean read) {
        this.read = read;
    }
}
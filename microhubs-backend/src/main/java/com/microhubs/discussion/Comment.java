package com.microhubs.discussion;

import com.microhubs.auth.User;
import com.microhubs.capsule.Capsule;
import com.microhubs.common.CreatedAtEntity;
import jakarta.persistence.*;

/**
 * A comment on a capsule (discussion thread).
 * Maps to the "comments" table in schema.sql.
 *
 * Columns: id, capsule_id, author_id, body, created_at
 */
@Entity
@Table(name = "comments")
public class Comment extends CreatedAtEntity {

    @ManyToOne
    @JoinColumn(name = "capsule_id", nullable = false)
    private Capsule capsule;

    @ManyToOne
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    public Comment() {}

    public Capsule getCapsule() { return capsule; }
    public void setCapsule(Capsule capsule) { this.capsule = capsule; }

    public User getAuthor() { return author; }
    public void setAuthor(User author) { this.author = author; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
}

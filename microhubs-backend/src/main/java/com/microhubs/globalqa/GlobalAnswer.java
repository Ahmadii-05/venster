package com.microhubs.globalqa;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.microhubs.auth.User;
import com.microhubs.common.CreatedAtEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "global_answers")
public class GlobalAnswer extends CreatedAtEntity {

    @ManyToOne
    @JoinColumn(name = "question_id", nullable = false)
    @JsonIgnore
    private GlobalQuestion question;

    @ManyToOne
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "is_accepted", nullable = false)
    private boolean accepted = false;

    @Column(nullable = false)
    private boolean hidden = false;

    @Column(name = "report_count", nullable = false)
    private int reportCount = 0;

    public GlobalAnswer() {}

    public GlobalQuestion getQuestion() { return question; }
    public void setQuestion(GlobalQuestion question) { this.question = question; }
    public User getAuthor() { return author; }
    public void setAuthor(User author) { this.author = author; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public boolean isAccepted() { return accepted; }
    public void setAccepted(boolean accepted) { this.accepted = accepted; }
    public boolean isHidden() { return hidden; }
    public void setHidden(boolean hidden) { this.hidden = hidden; }
    public int getReportCount() { return reportCount; }
    public void setReportCount(int reportCount) { this.reportCount = reportCount; }
}

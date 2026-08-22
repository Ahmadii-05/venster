package com.microhubs.globalqa;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.microhubs.auth.User;
import com.microhubs.common.BaseEntity;
import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "global_questions")
public class GlobalQuestion extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(columnDefinition = "TEXT[]")
    private String[] tags;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuestionStatus status = QuestionStatus.OPEN;

    @ManyToOne
    @JoinColumn(name = "accepted_answer_id")
    private GlobalAnswer acceptedAnswer;

    @Column(nullable = false)
    private boolean hidden = false;

    @Column(name = "report_count", nullable = false)
    private int reportCount = 0;

    public GlobalQuestion() {}

    public User getAuthor() { return author; }
    public void setAuthor(User author) { this.author = author; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public String[] getTags() { return tags; }
    public void setTags(String[] tags) { this.tags = tags; }
    public QuestionStatus getStatus() { return status; }
    public void setStatus(QuestionStatus status) { this.status = status; }
    public GlobalAnswer getAcceptedAnswer() { return acceptedAnswer; }
    public void setAcceptedAnswer(GlobalAnswer acceptedAnswer) { this.acceptedAnswer = acceptedAnswer; }
    public boolean isHidden() { return hidden; }
    public void setHidden(boolean hidden) { this.hidden = hidden; }
    public int getReportCount() { return reportCount; }
    public void setReportCount(int reportCount) { this.reportCount = reportCount; }

    public enum QuestionStatus {
        OPEN, ANSWERED, CLOSED
    }
}

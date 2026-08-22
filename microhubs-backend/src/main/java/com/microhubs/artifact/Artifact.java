package com.microhubs.artifact;

import com.microhubs.common.BaseEntity;
import com.microhubs.project.Project;
import jakarta.persistence.*;

/**
 * Represents a file tracked within a project.
 * Maps to the "artifacts" table in schema.sql.
 *
 * Columns: id, project_id, file_path, repository, created_at, updated_at
 */
@Entity
@Table(name = "artifacts")
public class Artifact extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "file_path", nullable = false, columnDefinition = "TEXT")
    private String filePath;

    @Column(length = 500)
    private String repository;

    public Artifact() {}

    public Project getProject() { return project; }
    public void setProject(Project project) { this.project = project; }

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

    public String getRepository() { return repository; }
    public void setRepository(String repository) { this.repository = repository; }
}

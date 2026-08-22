package com.microhubs.artifact;

import com.microhubs.common.CreatedAtEntity;
import jakarta.persistence.*;

/**
 * A version snapshot of an artifact (e.g. a git commit).
 * Maps to the "artifact_versions" table in schema.sql.
 *
 * Columns: id, artifact_id, commit_hash, version_label, created_at
 */
@Entity
@Table(name = "artifact_versions")
public class ArtifactVersion extends CreatedAtEntity {

    @ManyToOne
    @JoinColumn(name = "artifact_id", nullable = false)
    private Artifact artifact;

    @Column(name = "commit_hash", length = 100)
    private String commitHash;

    @Column(name = "version_label", length = 100)
    private String versionLabel;

    public ArtifactVersion() {}

    public Artifact getArtifact() { return artifact; }
    public void setArtifact(Artifact artifact) { this.artifact = artifact; }

    public String getCommitHash() { return commitHash; }
    public void setCommitHash(String commitHash) { this.commitHash = commitHash; }

    public String getVersionLabel() { return versionLabel; }
    public void setVersionLabel(String versionLabel) { this.versionLabel = versionLabel; }
}

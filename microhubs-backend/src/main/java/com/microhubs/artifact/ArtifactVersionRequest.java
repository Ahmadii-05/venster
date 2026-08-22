package com.microhubs.artifact;

import jakarta.validation.constraints.Size;

public class ArtifactVersionRequest {

    @Size(max = 100, message = "Commit hash must be at most 100 characters")
    private String commitHash;

    @Size(max = 100, message = "Version label must be at most 100 characters")
    private String versionLabel;

    public String getCommitHash() { return commitHash; }
    public void setCommitHash(String commitHash) { this.commitHash = commitHash; }

    public String getVersionLabel() { return versionLabel; }
    public void setVersionLabel(String versionLabel) { this.versionLabel = versionLabel; }
}

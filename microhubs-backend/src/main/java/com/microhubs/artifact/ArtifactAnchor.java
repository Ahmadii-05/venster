package com.microhubs.artifact;

import com.microhubs.common.CreatedAtEntity;
import jakarta.persistence.*;

/**
 * A stable reference to a piece of code within a specific version.
 * The content_hash allows matching even if surrounding code shifts.
 * Maps to the "artifact_anchors" table in schema.sql.
 *
 * Columns: id, artifact_version_id, start_line, end_line,
 *          selected_text, content_hash, symbol_name, created_at
 */
@Entity
@Table(name = "artifact_anchors")
public class ArtifactAnchor extends CreatedAtEntity {

    @ManyToOne
    @JoinColumn(name = "artifact_version_id", nullable = false)
    private ArtifactVersion artifactVersion;

    @Column(name = "start_line")
    private Integer startLine;

    @Column(name = "end_line")
    private Integer endLine;

    @Column(name = "selected_text", columnDefinition = "TEXT")
    private String selectedText;

    @Column(name = "content_hash", length = 128)
    private String contentHash;

    @Column(name = "symbol_name", length = 255)
    private String symbolName;

    public ArtifactAnchor() {}

    public ArtifactVersion getArtifactVersion() { return artifactVersion; }
    public void setArtifactVersion(ArtifactVersion artifactVersion) { this.artifactVersion = artifactVersion; }

    public Integer getStartLine() { return startLine; }
    public void setStartLine(Integer startLine) { this.startLine = startLine; }

    public Integer getEndLine() { return endLine; }
    public void setEndLine(Integer endLine) { this.endLine = endLine; }

    public String getSelectedText() { return selectedText; }
    public void setSelectedText(String selectedText) { this.selectedText = selectedText; }

    public String getContentHash() { return contentHash; }
    public void setContentHash(String contentHash) { this.contentHash = contentHash; }

    public String getSymbolName() { return symbolName; }
    public void setSymbolName(String symbolName) { this.symbolName = symbolName; }
}

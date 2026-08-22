package com.microhubs.artifact;

import jakarta.validation.constraints.Size;

public class ArtifactAnchorRequest {

    private Integer startLine;
    private Integer endLine;

    @Size(max = 10000, message = "Selected text must be at most 10000 characters")
    private String selectedText;

    @Size(max = 128, message = "Content hash must be at most 128 characters")
    private String contentHash;

    @Size(max = 255, message = "Symbol name must be at most 255 characters")
    private String symbolName;

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

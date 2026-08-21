package com.microhubs.workspace;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class WorkspaceRequest {
    
    @NotBlank(message = "Workspace name is required")
    @Size(min = 3, message = "Workspace name must be at least 3 characters")
    private String name;
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
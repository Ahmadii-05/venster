package com.microhubs.project;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ProjectRequest {
    
    @NotBlank(message = "Project name is required")
    @Size(min = 3, message = "Project name must be at least 3 characters")
    private String name;
    
    @Size(max = 500, message = "Description must be at most 500 characters")
    private String description;
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
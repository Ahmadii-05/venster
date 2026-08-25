package com.microhubs.project;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for adding a member to a project's team.
 *
 * Mirrors the workspace MemberRequest but carries NO role — every project
 * team member is equal, so only the target's email is needed.
 */
public class ProjectMemberRequest {

    @NotBlank(message = "User email is required")
    private String email;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}

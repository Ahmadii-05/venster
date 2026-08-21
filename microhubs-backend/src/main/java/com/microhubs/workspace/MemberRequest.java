package com.microhubs.workspace;

import jakarta.validation.constraints.NotBlank;

public class MemberRequest {

    @NotBlank(message = "User email is required")
    private String email;

    @NotBlank(message = "Role is required")
    private String role;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}

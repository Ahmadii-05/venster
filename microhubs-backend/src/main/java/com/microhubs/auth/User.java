package com.microhubs.auth;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.microhubs.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Column(unique = true, nullable = false)
    private String email;

    @JsonIgnore
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    private String name;

    @Column(name = "platform_moderator", nullable = false)
    private boolean platformModerator = false;

    @Transient
    private Role role;

    public User() {
        this.role = Role.MEMBER;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public boolean isPlatformModerator() { return platformModerator; }
    public void setPlatformModerator(boolean platformModerator) { this.platformModerator = platformModerator; }

    public enum Role {
        ADMIN,
        MEMBER
    }
}
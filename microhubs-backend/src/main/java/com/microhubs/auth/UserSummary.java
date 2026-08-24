package com.microhubs.auth;

import java.util.UUID;

/**
 * Lightweight, safe projection of a user for directory lookups.
 *
 * Deliberately exposes only id, name, and email — never the password hash or
 * platform-moderator flag — so the search endpoint can't leak sensitive fields.
 */
public record UserSummary(UUID id, String name, String email) {

    public static UserSummary from(User user) {
        return new UserSummary(user.getId(), user.getName(), user.getEmail());
    }
}

package com.microhubs.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    /**
     * Directory search for the "add member" typeahead: matches either the
     * display name or the email, case-insensitively, and caps the result set
     * so a broad query can't enumerate the whole table in one call.
     */
    java.util.List<User> findTop20ByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(
            String name, String email);
}

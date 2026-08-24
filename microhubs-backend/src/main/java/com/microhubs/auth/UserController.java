package com.microhubs.auth;

import com.microhubs.common.ApiResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Read-only user directory.
 *
 * Powers the "add member" typeahead on the frontend: the caller searches by
 * name or email and picks a real account, so the workspace add always resolves
 * to an existing user instead of a free-typed string the backend can't match.
 *
 * Authentication is required (enforced globally in SecurityConfig — every route
 * except /api/auth/** needs a valid JWT).
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    /**
     * Search the directory by name or email (case-insensitive, max 20 results).
     * A blank query returns an empty list rather than dumping the whole table.
     */
    @GetMapping
    public ApiResponse<List<UserSummary>> search(
            @RequestParam(value = "search", required = false) String search) {

        if (search == null || search.isBlank()) {
            List<UserSummary> empty = Collections.emptyList();
            return ApiResponse.success(empty);
        }

        String q = search.trim();

        List<UserSummary> results = userRepository
                .findTop20ByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(q, q)
                .stream()
                .map(UserSummary::from)
                .collect(Collectors.toList());

        return ApiResponse.success(results);
    }
}

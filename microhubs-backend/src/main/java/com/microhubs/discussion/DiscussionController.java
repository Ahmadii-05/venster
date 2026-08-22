package com.microhubs.discussion;

import com.microhubs.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class DiscussionController {

    @Autowired
    private DiscussionService discussionService;

    @PostMapping("/api/capsules/{id}/comments")
    public ResponseEntity<ApiResponse<Comment>> postComment(
            @PathVariable UUID id,
            @Valid @RequestBody CommentRequest request) {
        String email = currentEmail();
        ApiResponse<Comment> response =
                discussionService.postComment(id, email, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/capsules/{id}/comments")
    public ResponseEntity<ApiResponse<List<Comment>>> listComments(
            @PathVariable UUID id) {
        ApiResponse<List<Comment>> response =
                discussionService.listComments(id);
        return ResponseEntity.ok(response);
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}

package com.microhubs.globalqa;

import com.microhubs.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class GlobalQAController {

    @Autowired
    private GlobalQAService globalQAService;

    // ── Questions ────────────────────────────────────────────

    @PostMapping("/global-questions")
    public ResponseEntity<ApiResponse<GlobalQuestion>> createQuestion(
            @RequestBody CreateQuestionRequest request) {
        String email = currentEmail();
        ApiResponse<GlobalQuestion> response = globalQAService.createQuestion(
                email, request.title, request.body, request.tags);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/global-questions")
    public ResponseEntity<ApiResponse<List<GlobalQuestion>>> listQuestions(
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String status) {
        ApiResponse<List<GlobalQuestion>> response = globalQAService.listQuestions(tag, status);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/global-questions/{id}")
    public ResponseEntity<ApiResponse<GlobalQuestion>> getQuestion(@PathVariable UUID id) {
        ApiResponse<GlobalQuestion> response = globalQAService.getQuestion(id);
        return ResponseEntity.ok(response);
    }

    // ── Answers ──────────────────────────────────────────────

    @PostMapping("/global-questions/{id}/answers")
    public ResponseEntity<ApiResponse<GlobalAnswer>> createAnswer(
            @PathVariable UUID id,
            @RequestBody CreateAnswerRequest request) {
        String email = currentEmail();
        ApiResponse<GlobalAnswer> response = globalQAService.createAnswer(email, id, request.body);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/global-questions/{id}/answers")
    public ResponseEntity<ApiResponse<List<GlobalAnswer>>> listAnswers(@PathVariable UUID id) {
        ApiResponse<List<GlobalAnswer>> response = globalQAService.listAnswers(id);
        return ResponseEntity.ok(response);
    }

    // ── Accept Answer ────────────────────────────────────────

    @PatchMapping("/global-questions/{id}/accept")
    public ResponseEntity<ApiResponse<GlobalQuestion>> acceptAnswer(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String email = currentEmail();
        UUID answerId = UUID.fromString(body.get("answerId"));
        ApiResponse<GlobalQuestion> response = globalQAService.acceptAnswer(email, id, answerId);
        return ResponseEntity.ok(response);
    }

    // ── Report ───────────────────────────────────────────────

    @PostMapping("/global-questions/{id}/report")
    public ResponseEntity<ApiResponse<String>> reportQuestion(@PathVariable UUID id) {
        String email = currentEmail();
        ApiResponse<String> response = globalQAService.reportQuestion(email, id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/global-answers/{id}/report")
    public ResponseEntity<ApiResponse<String>> reportAnswer(@PathVariable UUID id) {
        String email = currentEmail();
        ApiResponse<String> response = globalQAService.reportAnswer(email, id);
        return ResponseEntity.ok(response);
    }

    // ── Moderation ───────────────────────────────────────────

    @PatchMapping("/global-questions/{id}/hide")
    public ResponseEntity<ApiResponse<String>> hideQuestion(@PathVariable UUID id) {
        String email = currentEmail();
        ApiResponse<String> response = globalQAService.hideQuestion(email, id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/global-answers/{id}/hide")
    public ResponseEntity<ApiResponse<String>> hideAnswer(@PathVariable UUID id) {
        String email = currentEmail();
        ApiResponse<String> response = globalQAService.hideAnswer(email, id);
        return ResponseEntity.ok(response);
    }

    // ── Request DTOs ─────────────────────────────────────────

    public record CreateQuestionRequest(String title, String body, String[] tags) {}
    public record CreateAnswerRequest(String body) {}

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}

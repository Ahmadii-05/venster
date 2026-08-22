package com.microhubs.globalqa;

import com.microhubs.auth.User;
import com.microhubs.auth.UserRepository;
import com.microhubs.common.ApiResponse;
import com.microhubs.knowledge.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class GlobalQAService {

    private static final Logger log = LoggerFactory.getLogger(GlobalQAService.class);

    @Autowired private GlobalQuestionRepository questionRepository;
    @Autowired private GlobalAnswerRepository answerRepository;
    @Autowired private GlobalReportRepository reportRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private KnowledgeRepository knowledgeRepository;
    @Autowired private LlmClient llmClient;
    @Autowired private EmbeddingClient embeddingClient;

    // ── Questions ────────────────────────────────────────────

    @Transactional
    public ApiResponse<GlobalQuestion> createQuestion(String email, String title, String body, String[] tags) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        GlobalQuestion q = new GlobalQuestion();
        q.setAuthor(user);
        q.setTitle(title);
        q.setBody(body);
        q.setTags(tags);
        q.setStatus(GlobalQuestion.QuestionStatus.OPEN);

        q = questionRepository.save(q);
        return ApiResponse.success(q);
    }

    @Transactional(readOnly = true)
    public ApiResponse<List<GlobalQuestion>> listQuestions(String tag, String status) {
        List<GlobalQuestion> questions;
        if ((tag != null && !tag.isBlank()) || (status != null && !status.isBlank())) {
            questions = questionRepository.search(tag, status != null ? status.toUpperCase() : null);
        } else {
            questions = questionRepository.findByHiddenFalseOrderByCreatedAtDesc();
        }
        return ApiResponse.success(questions);
    }

    @Transactional(readOnly = true)
    public ApiResponse<GlobalQuestion> getQuestion(UUID id) {
        GlobalQuestion q = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found"));
        return ApiResponse.success(q);
    }

    // ── Answers ──────────────────────────────────────────────

    @Transactional
    public ApiResponse<GlobalAnswer> createAnswer(String email, UUID questionId, String body) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        GlobalQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        GlobalAnswer a = new GlobalAnswer();
        a.setQuestion(question);
        a.setAuthor(user);
        a.setBody(body);

        a = answerRepository.save(a);
        return ApiResponse.success(a);
    }

    @Transactional(readOnly = true)
    public ApiResponse<List<GlobalAnswer>> listAnswers(UUID questionId) {
        List<GlobalAnswer> answers = answerRepository.findByQuestionIdAndHiddenFalseOrderByCreatedAtAsc(questionId);
        return ApiResponse.success(answers);
    }

    // ── Accept Answer ────────────────────────────────────────

    @Transactional
    public ApiResponse<GlobalQuestion> acceptAnswer(String email, UUID questionId, UUID answerId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        GlobalQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        // Only the question author can accept
        if (!question.getAuthor().getId().equals(user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only the question author can accept an answer");
        }

        GlobalAnswer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new RuntimeException("Answer not found"));

        // Un-accept previous if any
        if (question.getAcceptedAnswer() != null) {
            GlobalAnswer prev = question.getAcceptedAnswer();
            prev.setAccepted(false);
            answerRepository.save(prev);
        }

        answer.setAccepted(true);
        answerRepository.save(answer);

        question.setAcceptedAnswer(answer);
        question.setStatus(GlobalQuestion.QuestionStatus.ANSWERED);
        question = questionRepository.save(question);

        // Trigger AI knowledge generation asynchronously
        generateKnowledgeFromAnswer(question, answer);

        return ApiResponse.success(question);
    }

    // ── Report ───────────────────────────────────────────────

    @Transactional
    public ApiResponse<String> reportQuestion(String email, UUID questionId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (reportRepository.existsByReporterAndTargetTypeAndTargetId(user, "QUESTION", questionId)) {
            throw new IllegalArgumentException("You have already reported this question");
        }

        GlobalQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));

        reportRepository.save(new GlobalReport(user, "QUESTION", questionId));
        question.setReportCount(question.getReportCount() + 1);
        questionRepository.save(question);

        return ApiResponse.success("Reported successfully");
    }

    @Transactional
    public ApiResponse<String> reportAnswer(String email, UUID answerId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (reportRepository.existsByReporterAndTargetTypeAndTargetId(user, "ANSWER", answerId)) {
            throw new IllegalArgumentException("You have already reported this answer");
        }

        GlobalAnswer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new RuntimeException("Answer not found"));

        reportRepository.save(new GlobalReport(user, "ANSWER", answerId));
        answer.setReportCount(answer.getReportCount() + 1);
        answerRepository.save(answer);

        return ApiResponse.success("Reported successfully");
    }

    // ── Moderation (hide) ────────────────────────────────────

    @Transactional
    public ApiResponse<String> hideQuestion(String email, UUID questionId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.isPlatformModerator()) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only platform moderators can hide content");
        }

        GlobalQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question not found"));
        question.setHidden(true);
        questionRepository.save(question);

        return ApiResponse.success("Question hidden");
    }

    @Transactional
    public ApiResponse<String> hideAnswer(String email, UUID answerId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.isPlatformModerator()) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only platform moderators can hide content");
        }

        GlobalAnswer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new RuntimeException("Answer not found"));
        answer.setHidden(true);
        answerRepository.save(answer);

        return ApiResponse.success("Answer hidden");
    }

    // ── AI Knowledge Generation ──────────────────────────────

    @Async
    @Transactional
    public void generateKnowledgeFromAnswer(GlobalQuestion question, GlobalAnswer answer) {
        try {
            // Check if knowledge item already exists
            if (knowledgeRepository.existsByGlobalAnswerId(answer.getId())) {
                log.info("KnowledgeItem already exists for globalAnswerId={}", answer.getId());
                return;
            }

            // Assemble context for LLM
            StringBuilder ctx = new StringBuilder();
            ctx.append("=== QUESTION ===\n");
            ctx.append("Title: ").append(question.getTitle()).append("\n");
            ctx.append("Body: ").append(question.getBody()).append("\n");
            if (question.getTags() != null) {
                ctx.append("Tags: ").append(String.join(", ", question.getTags())).append("\n");
            }
            ctx.append("\n=== ACCEPTED ANSWER ===\n");
            ctx.append(answer.getBody()).append("\n");

            String context = SecretRedactor.redact(ctx.toString());

            // Call LLM
            LlmClient.LlmResponse llmResponse;
            try {
                llmResponse = llmClient.extractKnowledge(context);
            } catch (LlmException e) {
                log.error("LLM extraction failed for global answer: {}", e.getMessage());
                return;
            }

            // Validate
            if (llmResponse.title() == null || llmResponse.title().isBlank()
                    || llmResponse.summary() == null || llmResponse.summary().isBlank()) {
                log.error("LLM response validation failed for global answer");
                return;
            }

            // Generate embedding
            float[] embedding;
            try {
                embedding = embeddingClient.embed(llmResponse.summary() + " " + llmResponse.solution());
            } catch (LlmException e) {
                log.error("Embedding generation failed: {}", e.getMessage());
                return;
            }

            // Persist as PUBLIC KnowledgeItem
            KnowledgeItem item = new KnowledgeItem();
            item.setTitle(llmResponse.title());
            item.setSummary(llmResponse.summary());
            item.setRootCause(llmResponse.rootCause());
            item.setSolution(llmResponse.solution());
            item.setTags(llmResponse.tags().toArray(new String[0]));
            item.setCategory(llmResponse.category());
            item.setConfidence(BigDecimal.valueOf(llmResponse.confidence()));
            item.setEmbedding(embedding);
            item.setApproved(false);
            item.setVisibility(KnowledgeVisibility.PUBLIC);
            item.setGlobalAnswerId(answer.getId());

            knowledgeRepository.save(item);
            log.info("KnowledgeItem created from global answer: id={}, title={}", item.getId(), item.getTitle());

        } catch (Exception e) {
            log.error("Failed to generate knowledge from global answer: {}", e.getMessage(), e);
        }
    }
}

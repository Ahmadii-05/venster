package com.microhubs.knowledge;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;

/**
 * Groq chat completions implementation of LlmClient.
 * Uses Groq's OpenAI-compatible API with llama-3.3-70b-versatile.
 * API key comes from LLM_API_KEY env var — never logged or exposed.
 */
@Component
public class OpenAiLlmClient implements LlmClient {

    private static final Logger log = LoggerFactory.getLogger(OpenAiLlmClient.class);
    private static final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${llm.api.key:}")
    private String apiKey;

    @Value("${llm.model:openai/gpt-oss-20b}")
    private String model;

    @Value("${llm.base-url:https://api.groq.com/openai/v1}")
    private String baseUrl;

    @Override
    public LlmResponse extractKnowledge(String context) throws LlmException {
        if (apiKey == null || apiKey.isBlank()) {
            throw new LlmException("LLM API key not configured (LLM_API_KEY env var)");
        }

        String systemPrompt = """
                You are a software engineering knowledge extraction assistant.
                Given a resolved coding issue (capsule), extract structured knowledge.

                Return ONLY valid JSON with these exact fields:
                {
                  "title": "short descriptive title",
                  "summary": "2-3 sentence summary of the issue and resolution",
                  "rootCause": "the underlying cause of the problem",
                  "solution": "how the problem was resolved, with enough detail to apply to similar issues",
                  "steps": ["step 1", "step 2", ...],
                  "tags": ["relevant", "tags"],
                  "category": "one of: BUG, PERFORMANCE, SECURITY, DESIGN, CONFIGURATION, TESTING, DOCUMENTATION",
                  "confidence": 0.85
                }

                Requirements:
                - confidence must be between 0.0 and 1.0
                - tags should be lowercase, relevant technical terms
                - summary and solution should be practical and actionable
                - Do NOT include any code in the summary unless it's essential
                - Return ONLY the JSON object, no markdown, no explanation
                """;

        String requestBody;
        try {
            requestBody = mapper.writeValueAsString(new Object() {
                public final String model = OpenAiLlmClient.this.model;
                public final int max_tokens = 1024;
                public final Object[] messages = new Object[]{
                        new Object() { public final String role = "system"; public final String content = systemPrompt; },
                        new Object() { public final String role = "user"; public final String content = "Extract knowledge from this resolved capsule:\n\n" + context; }
                };
            });
        } catch (Exception e) {
            throw new LlmException("Failed to build request", e);
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/chat/completions"))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new LlmException("LLM API returned status " + response.statusCode() + ": " + response.body());
            }

            JsonNode root = mapper.readTree(response.body());
            String content = root.path("choices").get(0).path("message").path("content").asText();

            // Strip markdown code fences if present
            content = content.trim();
            if (content.startsWith("```")) {
                content = content.replaceFirst("```json\\s*", "").replaceFirst("```\\s*$", "").trim();
            }

            JsonNode json = mapper.readTree(content);

            // Validate required fields
            String title = json.path("title").asText(null);
            String summary = json.path("summary").asText(null);
            String rootCause = json.path("rootCause").asText(null);
            String solution = json.path("solution").asText(null);
            String category = json.path("category").asText(null);
            double confidence = json.path("confidence").asDouble(-1);

            if (title == null || summary == null || rootCause == null || solution == null || category == null) {
                throw new LlmException("LLM response missing required fields. Got: " + content.substring(0, Math.min(200, content.length())));
            }
            if (confidence < 0.0 || confidence > 1.0) {
                throw new LlmException("LLM confidence out of range: " + confidence);
            }

            List<String> steps = new ArrayList<>();
            if (json.has("steps")) {
                json.path("steps").forEach(node -> steps.add(node.asText()));
            }

            List<String> tags = new ArrayList<>();
            if (json.has("tags")) {
                json.path("tags").forEach(node -> tags.add(node.asText()));
            }

            return new LlmResponse(title, summary, rootCause, solution, steps, tags, category, confidence);

        } catch (LlmException e) {
            throw e;
        } catch (Exception e) {
            throw new LlmException("LLM call failed: " + e.getMessage(), e);
        }
    }

    @Override
    public String answerQuestion(String question, String context) throws LlmException {
        if (apiKey == null || apiKey.isBlank()) {
            throw new LlmException("LLM API key not configured (LLM_API_KEY env var)");
        }

        String systemPrompt = """
                You are a senior software engineer answering a teammate's question using
                ONLY the numbered knowledge entries provided below. Each entry is a
                previously resolved issue with a summary, root cause, and solution.

                Rules:
                - Answer concisely and practically, in plain prose. No markdown headings.
                - Base your answer ONLY on the provided entries. Do not invent facts,
                  APIs, versions, or file names that are not in the entries.
                - Cite the entries you rely on inline, like [1] or [2], matching their
                  numbers. Cite every claim that comes from an entry.
                - If the entries do NOT contain enough information to answer, say so
                  plainly in one sentence and suggest asking the team. Do not guess.
                - Keep it under ~150 words.
                """;

        String userContent = "Question:\n" + question + "\n\nKnowledge entries:\n" + context;

        String requestBody;
        try {
            requestBody = mapper.writeValueAsString(new Object() {
                public final String model = OpenAiLlmClient.this.model;
                public final int max_tokens = 600;
                public final double temperature = 0.2;
                public final Object[] messages = new Object[]{
                        new Object() { public final String role = "system"; public final String content = systemPrompt; },
                        new Object() { public final String role = "user"; public final String content = userContent; }
                };
            });
        } catch (Exception e) {
            throw new LlmException("Failed to build request", e);
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/chat/completions"))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new LlmException("LLM API returned status " + response.statusCode() + ": " + response.body());
            }

            JsonNode root = mapper.readTree(response.body());
            String content = root.path("choices").get(0).path("message").path("content").asText();
            return content == null ? "" : content.trim();

        } catch (LlmException e) {
            throw e;
        } catch (Exception e) {
            throw new LlmException("LLM answer call failed: " + e.getMessage(), e);
        }
    }
}

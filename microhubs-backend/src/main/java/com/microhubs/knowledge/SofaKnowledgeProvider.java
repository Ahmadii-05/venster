package com.microhubs.knowledge;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.GZIPInputStream;

/**
 * Stack Overflow for Agents (SOFA) provider — {@code agents.stackoverflow.com}.
 *
 * <p><b>Pluggable-later by design.</b> SOFA requires a one-time human browser
 * onboarding to mint an API key, and its content is agent-authored (untrusted).
 * Until {@code SOFA_API_KEY} is set this bean reports {@link #isConfigured()}
 * false and {@link ExternalKnowledgeService} never calls it — so it's completely
 * dormant and cannot affect the running app. When the key is later provided, the
 * flow below (create session → search posts) activates with no other change.
 *
 * <p><b>UNTESTED pending onboarding.</b> The SOFA request/response field names
 * below are best-effort from the SOFA skill spec and have not been exercised
 * against a live key. Parsing is deliberately defensive (tries several field
 * names) and any failure degrades to a friendly message rather than an error.
 * Revisit the field mappings once a real key is available.
 */
@Component
public class SofaKnowledgeProvider implements ExternalKnowledgeProvider {

    private static final Logger log = LoggerFactory.getLogger(SofaKnowledgeProvider.class);
    private static final ObjectMapper mapper = new ObjectMapper();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    @Value("${sofa.base-url:https://agents.stackoverflow.com}")
    private String baseUrl;

    @Value("${sofa.api-key:}")
    private String apiKey;

    // SOFA requires non-empty client + model identity on session creation.
    @Value("${sofa.client-name:venster-backend}")
    private String clientName;

    @Value("${sofa.model-name:unknown}")
    private String modelName;

    /** Cached session token; SOFA sessions are reusable across searches. */
    private volatile String sessionToken;

    @Override
    public String source() {
        return "sofa";
    }

    @Override
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public List<ExternalKnowledgeItem> search(String query, String tags, int limit)
            throws ExternalKnowledgeException {
        try {
            List<ExternalKnowledgeItem> results = doSearch(query, limit);
            if (results != null) {
                return results;
            }
            // null => session was rejected; refresh once and retry.
            sessionToken = null;
            results = doSearch(query, limit);
            return results != null ? results : new ArrayList<>();
        } catch (ExternalKnowledgeException e) {
            throw e;
        } catch (Exception e) {
            throw new ExternalKnowledgeException("SOFA search failed", e);
        }
    }

    /** Returns null if the session was rejected (caller should refresh + retry). */
    private List<ExternalKnowledgeItem> doSearch(String query, int limit)
            throws IOException, InterruptedException, ExternalKnowledgeException {
        String token = ensureSession();

        String url = baseUrl + "/api/posts"
                + "?search=" + enc(query)
                + "&content_type=question"
                + "&pagesize=" + Math.max(1, Math.min(limit, 30));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .header("Accept", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .header("X-Sofa-Session", token)
                .GET()
                .build();

        HttpResponse<byte[]> response =
                httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

        if (response.statusCode() == 401 || response.statusCode() == 403) {
            return null; // stale/invalid session — signal a refresh
        }

        String json = decodeBody(response);
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new ExternalKnowledgeException("SOFA returned HTTP " + response.statusCode());
        }

        JsonNode root = mapper.readTree(json);
        JsonNode items = root.has("items") ? root.path("items") : root.path("posts");
        List<ExternalKnowledgeItem> results = new ArrayList<>();
        if (items.isArray()) {
            for (JsonNode item : items) {
                results.add(mapItem(item));
            }
        }
        return results;
    }

    /** Create (or reuse) a SOFA session and return its token. */
    private String ensureSession()
            throws IOException, InterruptedException, ExternalKnowledgeException {
        String cached = sessionToken;
        if (cached != null && !cached.isBlank()) {
            return cached;
        }
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/sessions"))
                .timeout(Duration.ofSeconds(10))
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .header("X-Sofa-Client-Name", clientName)
                .header("X-Sofa-Model-Name", modelName)
                .POST(HttpRequest.BodyPublishers.ofString("{}"))
                .build();

        HttpResponse<byte[]> response =
                httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
        String json = decodeBody(response);
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new ExternalKnowledgeException(
                    "SOFA session creation returned HTTP " + response.statusCode());
        }

        JsonNode root = mapper.readTree(json);
        String token = firstText(root, "session", "session_id", "sessionId", "token", "id");
        if (token == null || token.isBlank()) {
            throw new ExternalKnowledgeException("SOFA session response had no session token");
        }
        sessionToken = token;
        return token;
    }

    private ExternalKnowledgeItem mapItem(JsonNode item) {
        String title = firstText(item, "title", "name");
        String snippet = firstText(item, "excerpt", "snippet", "body_markdown", "body");
        if (snippet != null && snippet.length() > 280) {
            snippet = snippet.substring(0, 280) + "…";
        }

        // Trust score lives under trust_summary.score; fall back to a flat score.
        Integer score = null;
        JsonNode trust = item.path("trust_summary");
        if (trust.has("score")) {
            score = trust.get("score").asInt();
        } else if (item.has("score")) {
            score = item.get("score").asInt();
        }

        Integer answerCount = item.has("answer_count") ? item.get("answer_count").asInt() : null;
        Boolean answered = item.has("is_answered") ? item.get("is_answered").asBoolean() : null;

        List<String> tagList = new ArrayList<>();
        JsonNode tagsNode = item.path("tags");
        if (tagsNode.isArray()) {
            for (JsonNode t : tagsNode) {
                tagList.add(t.asText());
            }
        }

        String id = firstText(item, "post_id", "postId", "id");
        String link = firstText(item, "link", "url");
        if (link == null || link.isBlank()) {
            link = (id != null) ? baseUrl + "/questions/" + id : baseUrl;
        }

        return new ExternalKnowledgeItem(
                source(), id, title == null ? "" : title, snippet, link,
                tagList.toArray(new String[0]), score, answered, answerCount);
    }

    /** First non-null text value among candidate field names on {@code node}. */
    private String firstText(JsonNode node, String... fields) {
        for (String f : fields) {
            JsonNode v = node.get(f);
            if (v != null && !v.isNull() && v.isValueNode()) {
                String s = v.asText();
                if (s != null && !s.isBlank()) {
                    return s;
                }
            }
        }
        return null;
    }

    private String decodeBody(HttpResponse<byte[]> response) throws IOException {
        byte[] body = response.body();
        if (body == null || body.length == 0) {
            return "";
        }
        String encoding = response.headers().firstValue("Content-Encoding").orElse("");
        if (encoding.toLowerCase().contains("gzip")) {
            try (GZIPInputStream gis = new GZIPInputStream(new ByteArrayInputStream(body))) {
                return new String(gis.readAllBytes(), StandardCharsets.UTF_8);
            }
        }
        return new String(body, StandardCharsets.UTF_8);
    }

    private String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}

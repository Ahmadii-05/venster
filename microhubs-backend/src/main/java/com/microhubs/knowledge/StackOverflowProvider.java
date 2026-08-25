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
 * Public Stack Overflow search via the Stack Exchange API 2.3
 * ({@code /search/advanced}). No onboarding required — works anonymously; an
 * optional app key (kept server-side) only raises the daily quota.
 *
 * <p>GOTCHA: the Stack Exchange API <b>always</b> gzip-compresses responses and
 * {@link java.net.http.HttpClient} does NOT auto-decompress, so we read the body
 * as bytes and inflate via {@link GZIPInputStream} when {@code Content-Encoding}
 * says gzip. Reading it as a String directly would yield garbage.
 */
@Component
public class StackOverflowProvider implements ExternalKnowledgeProvider {

    private static final Logger log = LoggerFactory.getLogger(StackOverflowProvider.class);
    private static final ObjectMapper mapper = new ObjectMapper();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    @Value("${stackoverflow.base-url:https://api.stackexchange.com/2.3}")
    private String baseUrl;

    @Value("${stackoverflow.site:stackoverflow}")
    private String site;

    /**
     * Optional Stack Apps key. Not an OAuth secret (it identifies the app, not a
     * user) but kept server-side via env so it's never shipped to the browser.
     * Blank = anonymous access (lower quota, still works).
     */
    @Value("${stackoverflow.key:}")
    private String apiKey;

    @Override
    public String source() {
        return "stackoverflow";
    }

    @Override
    public boolean isConfigured() {
        return true; // public API — no key needed
    }

    @Override
    public List<ExternalKnowledgeItem> search(String query, String tags, int limit)
            throws ExternalKnowledgeException {
        try {
            int pageSize = Math.max(1, Math.min(limit, 30));
            StringBuilder url = new StringBuilder(baseUrl)
                    .append("/search/advanced")
                    .append("?order=desc&sort=relevance")
                    .append("&site=").append(enc(site))
                    .append("&pagesize=").append(pageSize)
                    .append("&q=").append(enc(query))
                    // default filter returns title/link/tags/score/is_answered/answer_count
                    .append("&filter=default");

            if (tags != null && !tags.isBlank()) {
                // Stack Exchange expects semicolon-separated tags.
                String normalized = tags.trim().replaceAll("\\s*,\\s*", ";");
                url.append("&tagged=").append(enc(normalized));
            }
            if (apiKey != null && !apiKey.isBlank()) {
                url.append("&key=").append(enc(apiKey));
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url.toString()))
                    .timeout(Duration.ofSeconds(10))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<byte[]> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            String json = decodeBody(response);

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Stack Exchange search failed: HTTP {} — {}",
                        response.statusCode(), truncate(json));
                throw new ExternalKnowledgeException(
                        "Stack Overflow returned HTTP " + response.statusCode());
            }

            JsonNode items = mapper.readTree(json).path("items");
            List<ExternalKnowledgeItem> results = new ArrayList<>();
            if (items.isArray()) {
                for (JsonNode item : items) {
                    results.add(mapItem(item));
                }
            }
            return results;
        } catch (ExternalKnowledgeException e) {
            throw e;
        } catch (Exception e) {
            throw new ExternalKnowledgeException("Stack Overflow search failed", e);
        }
    }

    /** Inflate the body when the server gzipped it (Stack Exchange always does). */
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

    private ExternalKnowledgeItem mapItem(JsonNode item) {
        String title = decodeHtml(item.path("title").asText(""));
        String link = item.path("link").asText("");
        Integer score = item.has("score") ? item.get("score").asInt() : null;
        Boolean answered = item.has("is_answered") ? item.get("is_answered").asBoolean() : null;
        Integer answerCount = item.has("answer_count") ? item.get("answer_count").asInt() : null;

        List<String> tagList = new ArrayList<>();
        JsonNode tagsNode = item.path("tags");
        if (tagsNode.isArray()) {
            for (JsonNode t : tagsNode) {
                tagList.add(t.asText());
            }
        }

        return new ExternalKnowledgeItem(
                source(),
                title,
                null, // default filter has no body; card shows metadata + links out
                link,
                tagList.toArray(new String[0]),
                score,
                answered,
                answerCount);
    }

    // Stack Exchange returns titles HTML-escaped (&quot; &amp; &#39; …). Unescape
    // the common entities so the card shows clean text.
    private String decodeHtml(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&amp;", "&");
    }

    private String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }

    private String truncate(String s) {
        if (s == null) {
            return "";
        }
        return s.length() > 200 ? s.substring(0, 200) : s;
    }
}

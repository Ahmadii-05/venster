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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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

    @Override
    public ExternalKnowledgeDetail detail(String id) throws ExternalKnowledgeException {
        // Guard against path/param injection — question ids are always numeric.
        if (id == null || !id.matches("\\d+")) {
            throw new ExternalKnowledgeException("Invalid Stack Overflow question id");
        }
        try {
            // 1) Question body + metadata. filter=withbody adds the HTML `body`.
            String qUrl = baseUrl + "/questions/" + id
                    + "?order=desc&sort=votes"
                    + "&site=" + enc(site)
                    + "&filter=withbody"
                    + keyParam();
            JsonNode qItems = getJson(qUrl).path("items");
            if (!qItems.isArray() || qItems.isEmpty()) {
                throw new ExternalKnowledgeException("Stack Overflow question not found: " + id);
            }
            JsonNode q = qItems.get(0);

            String title = decodeHtml(q.path("title").asText(""));
            String link = q.path("link").asText("https://stackoverflow.com/q/" + id);
            String body = htmlToText(q.path("body").asText(""));
            Integer score = q.has("score") ? q.get("score").asInt() : null;
            Boolean answered = q.has("is_answered") ? q.get("is_answered").asBoolean() : null;

            List<String> tagList = new ArrayList<>();
            JsonNode tagsNode = q.path("tags");
            if (tagsNode.isArray()) {
                for (JsonNode t : tagsNode) {
                    tagList.add(t.asText());
                }
            }

            // 2) Top answers, highest-voted first (cap the payload at 5).
            String aUrl = baseUrl + "/questions/" + id + "/answers"
                    + "?order=desc&sort=votes"
                    + "&site=" + enc(site)
                    + "&filter=withbody"
                    + "&pagesize=5"
                    + keyParam();
            JsonNode aItems = getJson(aUrl).path("items");
            List<ExternalKnowledgeDetail.ExternalAnswer> answers = new ArrayList<>();
            if (aItems.isArray()) {
                for (JsonNode a : aItems) {
                    answers.add(new ExternalKnowledgeDetail.ExternalAnswer(
                            htmlToText(a.path("body").asText("")),
                            a.has("score") ? a.get("score").asInt() : null,
                            a.path("is_accepted").asBoolean(false)));
                }
            }

            return new ExternalKnowledgeDetail(
                    source(),
                    id,
                    title,
                    body,
                    link,
                    tagList.toArray(new String[0]),
                    score,
                    answered,
                    answers);
        } catch (ExternalKnowledgeException e) {
            throw e;
        } catch (Exception e) {
            throw new ExternalKnowledgeException("Stack Overflow detail fetch failed", e);
        }
    }

    /** Optional app-key query fragment (raises quota); empty when anonymous. */
    private String keyParam() {
        return (apiKey != null && !apiKey.isBlank()) ? "&key=" + enc(apiKey) : "";
    }

    /** GET a Stack Exchange URL and parse the (gzip-inflated) JSON body. */
    private JsonNode getJson(String url)
            throws IOException, InterruptedException, ExternalKnowledgeException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .header("Accept", "application/json")
                .GET()
                .build();
        HttpResponse<byte[]> response =
                httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
        String json = decodeBody(response);
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            log.warn("Stack Exchange request failed: HTTP {} — {}",
                    response.statusCode(), truncate(json));
            throw new ExternalKnowledgeException(
                    "Stack Overflow returned HTTP " + response.statusCode());
        }
        return mapper.readTree(json);
    }

    /**
     * Convert Stack Overflow's HTML body to readable plain text WITHOUT treating
     * it as trusted markup (the frontend never uses dangerouslySetInnerHTML).
     * Code blocks become fenced {@code ```} segments and inline code becomes
     * {@code `backticks`}; all code and prose is extracted BEFORE entity decoding
     * so entities are decoded exactly once (no double-unescape).
     */
    private String htmlToText(String html) {
        if (html == null || html.isBlank()) {
            return "";
        }

        List<String> blocks = new ArrayList<>();  // fenced ``` code blocks
        List<String> inlines = new ArrayList<>(); // inline `code` spans

        // 1) <pre><code>…</code></pre> → placeholder. Decode entities in the code
        //    now, while it is safely isolated from the tag-stripping below.
        Matcher preCode = Pattern.compile(
                        "<pre[^>]*>\\s*<code[^>]*>(.*?)</code>\\s*</pre>",
                        Pattern.DOTALL | Pattern.CASE_INSENSITIVE)
                .matcher(html);
        StringBuilder sb = new StringBuilder();
        while (preCode.find()) {
            blocks.add(decodeHtml(preCode.group(1)));
            preCode.appendReplacement(sb,
                    Matcher.quoteReplacement("\uE000" + (blocks.size() - 1) + "\uE000"));
        }
        preCode.appendTail(sb);
        String text = sb.toString();

        // 1b) Any bare <pre>…</pre> left over → also treat as a code block.
        Matcher pre = Pattern.compile("<pre[^>]*>(.*?)</pre>",
                        Pattern.DOTALL | Pattern.CASE_INSENSITIVE)
                .matcher(text);
        sb = new StringBuilder();
        while (pre.find()) {
            blocks.add(decodeHtml(pre.group(1).replaceAll("<[^>]+>", "")));
            pre.appendReplacement(sb,
                    Matcher.quoteReplacement("\uE000" + (blocks.size() - 1) + "\uE000"));
        }
        pre.appendTail(sb);
        text = sb.toString();

        // 2) Inline <code>…</code> → placeholder (decode entities now).
        Matcher inline = Pattern.compile("<code[^>]*>(.*?)</code>",
                        Pattern.DOTALL | Pattern.CASE_INSENSITIVE)
                .matcher(text);
        sb = new StringBuilder();
        while (inline.find()) {
            inlines.add(decodeHtml(inline.group(1).replaceAll("<[^>]+>", "")));
            inline.appendReplacement(sb,
                    Matcher.quoteReplacement("\uE001" + (inlines.size() - 1) + "\uE001"));
        }
        inline.appendTail(sb);
        text = sb.toString();

        // 3) Block-level tags → newlines; list items get a bullet.
        text = text.replaceAll("(?i)<li[^>]*>", "\n- ");
        text = text.replaceAll("(?i)<br\\s*/?>", "\n");
        text = text.replaceAll("(?i)</(p|div|h[1-6]|ul|ol|li|blockquote|tr|table)>", "\n");

        // 4) Strip any remaining tags, then decode entities in the prose ONCE.
        text = text.replaceAll("<[^>]+>", "");
        text = decodeHtml(text);

        // 5) Reinsert inline code, then fenced blocks (placeholders survived 3–4).
        for (int i = 0; i < inlines.size(); i++) {
            text = text.replace("\uE001" + i + "\uE001", "`" + inlines.get(i) + "`");
        }
        for (int i = 0; i < blocks.size(); i++) {
            text = text.replace("\uE000" + i + "\uE000",
                    "\n```\n" + blocks.get(i).strip() + "\n```\n");
        }

        // 6) Tidy whitespace.
        text = text.replaceAll("[ \\t]+\n", "\n");
        text = text.replaceAll("\n{3,}", "\n\n");
        return text.strip();
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
        String id = item.has("question_id") ? item.get("question_id").asText() : null;
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
                id,
                title,
                null, // default filter has no body; card shows metadata + expands on demand
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
                .replace("&nbsp;", " ")
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

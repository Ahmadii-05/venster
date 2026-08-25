package com.microhubs.knowledge;

import com.microhubs.common.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Dispatches an external-source search to the right {@link ExternalKnowledgeProvider}.
 *
 * <p>All provider beans are injected and indexed by {@link ExternalKnowledgeProvider#source()},
 * so wiring a new source is purely additive. The service centralizes the graceful-
 * degradation policy: unknown source → error; configured-but-failing → a "degraded"
 * result with a friendly message; not-yet-connected (e.g. SOFA without a key) →
 * a "not configured" result. The result is always an {@link ApiResponse#success}
 * envelope (except unknown-source / blank-query), so the UI renders a helpful state
 * instead of a hard error.
 */
@Service
public class ExternalKnowledgeService {

    private static final Logger log = LoggerFactory.getLogger(ExternalKnowledgeService.class);
    private static final int DEFAULT_LIMIT = 10;
    private static final String DEFAULT_SOURCE = "stackoverflow";

    private final Map<String, ExternalKnowledgeProvider> providers;

    public ExternalKnowledgeService(List<ExternalKnowledgeProvider> providerList) {
        this.providers = providerList.stream()
                .collect(Collectors.toMap(
                        p -> p.source().toLowerCase(),
                        Function.identity()));
        log.info("External knowledge providers registered: {}", providers.keySet());
    }

    public ApiResponse<ExternalSearchResult> search(String source, String query, String tags) {
        if (query == null || query.isBlank()) {
            return ApiResponse.error("q is required");
        }

        String key = (source == null || source.isBlank())
                ? DEFAULT_SOURCE
                : source.trim().toLowerCase();

        ExternalKnowledgeProvider provider = providers.get(key);
        if (provider == null) {
            return ApiResponse.error("Unknown source: " + source);
        }

        if (!provider.isConfigured()) {
            return ApiResponse.success(
                    ExternalSearchResult.notConfigured(key, friendlyNotConfigured(key)));
        }

        try {
            List<ExternalKnowledgeItem> items = provider.search(query, tags, DEFAULT_LIMIT);
            return ApiResponse.success(ExternalSearchResult.of(key, items));
        } catch (ExternalKnowledgeException e) {
            log.warn("External search failed for source '{}': {}", key, e.getMessage());
            return ApiResponse.success(ExternalSearchResult.degraded(
                    key, prettyLabel(key) + " search is temporarily unavailable. Please try again."));
        }
    }

    /**
     * Fetch full detail (body + top answers) for a single external post so the UI
     * can expand a result inline. Unlike {@link #search}, a failure here returns an
     * {@code error} envelope: the card already has a "open on the source" fallback,
     * so the UI shows that rather than a fake-empty result.
     */
    public ApiResponse<ExternalKnowledgeDetail> detail(String source, String id) {
        if (id == null || id.isBlank()) {
            return ApiResponse.error("id is required");
        }

        String key = (source == null || source.isBlank())
                ? DEFAULT_SOURCE
                : source.trim().toLowerCase();

        ExternalKnowledgeProvider provider = providers.get(key);
        if (provider == null) {
            return ApiResponse.error("Unknown source: " + source);
        }
        if (!provider.isConfigured()) {
            return ApiResponse.error(friendlyNotConfigured(key));
        }

        try {
            return ApiResponse.success(provider.detail(id));
        } catch (ExternalKnowledgeException e) {
            log.warn("External detail failed for source '{}' id '{}': {}", key, id, e.getMessage());
            return ApiResponse.error(
                    prettyLabel(key) + " couldn't load this result. Try opening it on "
                            + prettyLabel(key) + ".");
        }
    }

    private String friendlyNotConfigured(String source) {
        if ("sofa".equals(source)) {
            return "Stack Overflow for Agents isn't connected yet. "
                    + "Complete SOFA onboarding and set SOFA_API_KEY to enable it.";
        }
        return prettyLabel(source) + " is not configured.";
    }

    private String prettyLabel(String source) {
        return switch (source) {
            case "stackoverflow" -> "Stack Overflow";
            case "sofa" -> "Stack Overflow for Agents";
            default -> source;
        };
    }
}

package com.microhubs.knowledge;

import java.util.List;

/**
 * A pluggable external knowledge source. Each implementation is a Spring bean;
 * {@link ExternalKnowledgeService} collects them all and dispatches by
 * {@link #source()}. Adding a new source (e.g. GitHub Discussions) is just a new
 * bean — no controller or service change.
 */
public interface ExternalKnowledgeProvider {

    /** Stable lowercase id used in the {@code ?source=} query param, e.g. "stackoverflow". */
    String source();

    /**
     * Whether this provider can actually run. Public Stack Overflow is always
     * configured; SOFA is only configured once its API key is present. When
     * false, the service short-circuits with a "not connected" result and never
     * calls {@link #search}.
     */
    boolean isConfigured();

    /**
     * Search the source for related issues/solutions.
     *
     * @param query the user's free-text query
     * @param tags  optional comma-separated tags to narrow results (may be null/blank)
     * @param limit soft cap on the number of results
     * @throws ExternalKnowledgeException on any upstream/parse failure
     */
    List<ExternalKnowledgeItem> search(String query, String tags, int limit)
            throws ExternalKnowledgeException;

    /**
     * Fetch full detail (body + top answers) for a single post, so the UI can
     * expand a result inline instead of sending the user to the external site.
     *
     * <p>Default: unsupported. Providers that can serve detail (public Stack
     * Overflow) override this; others (e.g. SOFA until its detail API is
     * exercised) inherit the default and {@link ExternalKnowledgeService}
     * degrades gracefully to a "open on the source" fallback.
     *
     * @param id provider post id, from {@link ExternalKnowledgeItem#id()}
     * @throws ExternalKnowledgeException on upstream/parse failure, or if unsupported
     */
    default ExternalKnowledgeDetail detail(String id) throws ExternalKnowledgeException {
        throw new ExternalKnowledgeException("Detail view is not supported for " + source());
    }
}

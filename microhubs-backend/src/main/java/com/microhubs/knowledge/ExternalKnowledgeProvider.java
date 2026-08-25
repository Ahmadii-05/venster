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
}

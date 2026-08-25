package com.microhubs.knowledge;

import java.util.List;

/**
 * Envelope for an external-source search. Carries enough state for the UI to
 * distinguish three cases without inspecting HTTP errors:
 * <ul>
 *   <li>{@code configured=true} + items — a normal result set.</li>
 *   <li>{@code configured=false} — the source isn't connected yet (e.g. SOFA
 *       with no API key); {@code message} explains how to enable it.</li>
 *   <li>{@code configured=true} + empty items + {@code message} — the source is
 *       connected but the call failed/degraded; show the message, not an error.</li>
 * </ul>
 */
public record ExternalSearchResult(
        String source,
        boolean configured,
        String message,
        List<ExternalKnowledgeItem> items
) {
    public static ExternalSearchResult of(String source, List<ExternalKnowledgeItem> items) {
        return new ExternalSearchResult(source, true, null, items);
    }

    public static ExternalSearchResult notConfigured(String source, String message) {
        return new ExternalSearchResult(source, false, message, List.of());
    }

    public static ExternalSearchResult degraded(String source, String message) {
        return new ExternalSearchResult(source, true, message, List.of());
    }
}

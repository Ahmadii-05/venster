package com.microhubs.knowledge;

import java.math.BigDecimal;

/**
 * Public-facing DTO for global knowledge search results.
 * Contains ONLY the generated knowledge fields — no workspace, code,
 * or internal details are exposed.
 */
public record PublicKnowledgeItem(
    java.util.UUID id,
    String title,
    String summary,
    String rootCause,
    String solution,
    String[] tags,
    String category,
    BigDecimal confidence
) {
    public static PublicKnowledgeItem from(KnowledgeItem item) {
        return new PublicKnowledgeItem(
            item.getId(),
            item.getTitle(),
            item.getSummary(),
            item.getRootCause(),
            item.getSolution(),
            item.getTags(),
            item.getCategory(),
            item.getConfidence()
        );
    }
}

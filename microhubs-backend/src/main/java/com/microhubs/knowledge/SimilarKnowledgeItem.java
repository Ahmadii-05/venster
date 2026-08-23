package com.microhubs.knowledge;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for duplicate capsule suggestion results.
 * Workspace items include more context; global items follow PublicKnowledgeItem restrictions.
 */
public record SimilarKnowledgeItem(
    UUID knowledgeItemId,
    String title,
    String summary,
    String category,
    BigDecimal confidence,
    double similarityScore,
    String source  // "WORKSPACE" or "GLOBAL"
) {}

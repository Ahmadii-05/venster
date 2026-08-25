package com.microhubs.knowledge;

/**
 * A single result from an EXTERNAL knowledge source (public Stack Overflow, or
 * Stack Overflow for Agents once connected).
 *
 * <p>Deliberately source-agnostic so the frontend renders one card shape
 * regardless of provider. Nullable metadata fields are simply omitted from the
 * card when a given source doesn't supply them.
 *
 * <p>Unlike {@link PublicKnowledgeItem}, this is NOT team data — it always links
 * out to the source, so there is no internal path/code/workspace to redact.
 */
public record ExternalKnowledgeItem(
        String source,      // "stackoverflow" | "sofa"
        String id,          // provider post id (SO question_id); powers inline detail fetch, may be null
        String title,
        String snippet,     // short excerpt, may be null (SO default filter omits body)
        String url,         // canonical link to the external post
        String[] tags,
        Integer score,      // votes (SO) / trust score (SOFA), may be null
        Boolean answered,   // has an accepted/any answer, may be null
        Integer answerCount // number of answers, may be null
) {}

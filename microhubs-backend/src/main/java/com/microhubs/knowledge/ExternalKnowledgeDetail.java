package com.microhubs.knowledge;

import java.util.List;

/**
 * Full detail for a single EXTERNAL knowledge post, fetched on demand when the
 * user expands a search result. Lets the app show the question body and top
 * answers inline — no need to open the external site.
 *
 * <p>Bodies are converted from the source's HTML to readable plain text
 * server-side, with code preserved as fenced {@code ```} segments and inline
 * code as {@code `backticks`}. This keeps the frontend free of
 * {@code dangerouslySetInnerHTML}: it renders trusted plain text, not raw HTML.
 */
public record ExternalKnowledgeDetail(
        String source,          // "stackoverflow" | "sofa"
        String id,              // provider post id (SO question_id)
        String title,
        String body,            // question body as plain text (``` fenced code)
        String url,             // canonical link to the external post
        String[] tags,
        Integer score,          // question votes, may be null
        Boolean answered,       // has an accepted/any answer, may be null
        List<ExternalAnswer> answers
) {
    /** A single answer on the external post. */
    public record ExternalAnswer(
            String body,        // answer body as plain text (``` fenced code)
            Integer score,      // answer votes, may be null
            boolean accepted    // whether this is the accepted answer
    ) {}
}

package com.microhubs.knowledge;

import java.util.List;

/**
 * Response for the AI "answer with citations" endpoint
 * ({@code POST /api/knowledge/answer}).
 *
 * <p>The answer is grounded in {@link #citations} — the knowledge entries that
 * were retrieved and fed to the model. The model cites them inline as
 * {@code [1]}, {@code [2]}, ... matching their order in the list.
 *
 * <p>Degrades gracefully: when no entries match, or the LLM is unconfigured or
 * fails, {@code hasAnswer} is {@code false} and {@code answer} is {@code null},
 * but any {@code citations} that were found are still returned so the UI can
 * show sources (or fall back to prompting the user to ask the team).
 *
 * @param hasAnswer true when the model produced a grounded answer
 * @param answer    the plain-text answer citing entries as {@code [n]}, or {@code null}
 * @param citations the knowledge entries used as grounding (also the {@code [n]} sources)
 */
public record KnowledgeAnswer(
        boolean hasAnswer,
        String answer,
        List<PublicKnowledgeItem> citations
) {}

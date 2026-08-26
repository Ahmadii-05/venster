package com.microhubs.knowledge;

import java.util.Collections;
import java.util.List;

/**
 * Response for the AI "answer with citations" endpoint
 * ({@code POST /api/knowledge/answer}).
 *
 * <p>The answer is grounded in real sources — never the model's general
 * knowledge. {@link #source} tells the UI which kind of source backs it:
 * <ul>
 *   <li>{@code "team"} — the answer is grounded in {@link #citations}, the
 *       team's own resolved issues (cited inline as {@code [1]}, {@code [2]}…).</li>
 *   <li>{@code "stackoverflow"} — the team had no matching resolved issue, so the
 *       answer is synthesized from public Stack Overflow threads in
 *       {@link #externalCitations} (also cited inline as {@code [n]}).</li>
 *   <li>{@code null} — no grounded answer was produced.</li>
 * </ul>
 *
 * <p>Degrades gracefully: when nothing matches, or the LLM is unconfigured or
 * fails, {@code hasAnswer} is {@code false} and {@code answer} is {@code null},
 * but any {@code citations} that were found are still returned so the UI can
 * show sources (or fall back to prompting the user to ask the team).
 *
 * @param hasAnswer         true when the model produced a grounded answer
 * @param answer            the plain-text answer citing sources as {@code [n]}, or {@code null}
 * @param citations         the team knowledge entries used as grounding (the {@code [n]} sources when {@code source="team"})
 * @param source            which source backs the answer: {@code "team"}, {@code "stackoverflow"}, or {@code null}
 * @param externalCitations the Stack Overflow threads used as grounding (the {@code [n]} sources when {@code source="stackoverflow"})
 */
public record KnowledgeAnswer(
        boolean hasAnswer,
        String answer,
        List<PublicKnowledgeItem> citations,
        String source,
        List<ExternalKnowledgeItem> externalCitations
) {
    /** No answer and no sources at all (e.g. blank query, or nothing found anywhere). */
    public static KnowledgeAnswer none() {
        return new KnowledgeAnswer(false, null, Collections.emptyList(), null, Collections.emptyList());
    }

    /** No grounded answer, but keep the team sources that were found so the UI can show them. */
    public static KnowledgeAnswer none(List<PublicKnowledgeItem> citations) {
        return new KnowledgeAnswer(false, null,
                citations == null ? Collections.emptyList() : citations,
                null, Collections.emptyList());
    }

    /** A grounded answer backed by the team's own resolved issues. */
    public static KnowledgeAnswer team(String answer, List<PublicKnowledgeItem> citations) {
        return new KnowledgeAnswer(true, answer,
                citations == null ? Collections.emptyList() : citations,
                "team", Collections.emptyList());
    }

    /** A grounded answer synthesized from public Stack Overflow threads. */
    public static KnowledgeAnswer external(String answer, List<ExternalKnowledgeItem> externalCitations) {
        return new KnowledgeAnswer(true, answer, Collections.emptyList(),
                "stackoverflow",
                externalCitations == null ? Collections.emptyList() : externalCitations);
    }
}

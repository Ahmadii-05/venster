package com.microhubs.knowledge;

import java.util.List;

/**
 * Interface for LLM integration — swappable provider.
 * Given assembled context, returns structured knowledge extraction.
 */
public interface LlmClient {

    /**
     * Structured response from the LLM.
     */
    record LlmResponse(
            String title,
            String summary,
            String rootCause,
            String solution,
            List<String> steps,
            List<String> tags,
            String category,
            double confidence
    ) {}

    /**
     * Extract structured knowledge from the given context.
     *
     * @param context the assembled context payload (capsule info, comments, resolution)
     * @return structured extraction result
     * @throws LlmException if the call fails or returns malformed data
     */
    LlmResponse extractKnowledge(String context) throws LlmException;

    /**
     * Answer a developer's natural-language question using ONLY the supplied
     * context (numbered knowledge entries retrieved from the store).
     *
     * <p>Implementations must instruct the model to ground its answer in the
     * provided entries, cite them inline as {@code [1]}, {@code [2]}, ... and
     * admit when the entries don't cover the question rather than inventing an
     * answer. The return value is plain text (no JSON, no markdown fences).
     *
     * @param question the user's question
     * @param context  numbered knowledge entries, each prefixed with {@code [n]}
     * @return a concise, plain-text answer that cites entries as {@code [n]}
     * @throws LlmException if the provider is unconfigured or the call fails
     */
    String answerQuestion(String question, String context) throws LlmException;
}

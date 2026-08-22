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
}

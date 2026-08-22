package com.microhubs.knowledge;

/**
 * Interface for text embedding — swappable provider.
 * Given text, returns a vector embedding for pgvector storage.
 */
public interface EmbeddingClient {

    /**
     * Generate an embedding vector for the given text.
     *
     * @param text the text to embed
     * @return float array of embedding dimensions (typically 1536)
     * @throws LlmException if the embedding call fails
     */
    float[] embed(String text) throws LlmException;
}

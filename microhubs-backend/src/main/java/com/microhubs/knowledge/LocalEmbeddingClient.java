package com.microhubs.knowledge;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Local embedding client using character n-gram hashing.
 * No external API needed — generates deterministic 1536-dim vectors from text.
 *
 * This is a MVP approach. For production, replace with a real embedding model
 * (e.g. OpenAI text-embedding-3-small, or a local ONNX model).
 *
 * Known limitation: similarity quality is lower than neural embeddings.
 */
@Component
public class LocalEmbeddingClient implements EmbeddingClient {

    private static final Logger log = LoggerFactory.getLogger(LocalEmbeddingClient.class);
    private static final int DIMENSIONS = 1536;
    private static final int NGRAM_SIZE = 3;

    @Override
    public float[] embed(String text) throws LlmException {
        if (text == null || text.isBlank()) {
            return new float[DIMENSIONS];
        }

        String normalized = text.toLowerCase().trim();
        float[] embedding = new float[DIMENSIONS];

        // Generate n-grams and hash them into the embedding vector
        for (int i = 0; i <= normalized.length() - NGRAM_SIZE; i++) {
            String ngram = normalized.substring(i, i + NGRAM_SIZE);
            int[] hash = hashNgram(ngram);

            // Use hash to set embedding dimensions
            for (int j = 0; j < hash.length && j < DIMENSIONS; j++) {
                embedding[j] += (hash[j] % 100) / 100.0f;
            }
        }

        // Also use word-level features for better semantic capture
        String[] words = normalized.split("\\s+");
        for (String word : words) {
            if (word.length() >= 2) {
                int[] wordHash = hashNgram(word);
                for (int j = 0; j < wordHash.length && j < DIMENSIONS; j++) {
                    embedding[j] += (wordHash[j] % 100) / 50.0f;
                }
            }
        }

        // Normalize the vector
        float norm = 0;
        for (float v : embedding) {
            norm += v * v;
        }
        norm = (float) Math.sqrt(norm);
        if (norm > 0) {
            for (int i = 0; i < DIMENSIONS; i++) {
                embedding[i] /= norm;
            }
        }

        log.info("Generated local embedding with {} dimensions for text length {}",
                embedding.length, text.length());
        return embedding;
    }

    /**
     * Hash an n-gram to produce deterministic int values.
     */
    private int[] hashNgram(String ngram) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(ngram.getBytes(StandardCharsets.UTF_8));
            int[] result = new int[DIMENSIONS];
            for (int i = 0; i < DIMENSIONS; i++) {
                int byteIdx = i % digest.length;
                result[i] = digest[byteIdx] & 0xFF;
            }
            return result;
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}

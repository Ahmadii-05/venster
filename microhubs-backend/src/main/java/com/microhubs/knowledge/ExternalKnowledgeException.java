package com.microhubs.knowledge;

/**
 * Exception for external knowledge-source call failures (Stack Overflow / SOFA).
 * Caught by {@link ExternalKnowledgeService} and turned into a graceful
 * "degraded" result — never propagated to the HTTP thread. Mirrors
 * {@link LlmException}.
 */
public class ExternalKnowledgeException extends Exception {
    public ExternalKnowledgeException(String message) { super(message); }
    public ExternalKnowledgeException(String message, Throwable cause) { super(message, cause); }
}

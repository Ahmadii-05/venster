package com.microhubs.knowledge;

/**
 * Exception for LLM call failures.
 * Caught and logged by KnowledgeService — never propagated to the HTTP thread.
 */
public class LlmException extends Exception {
    public LlmException(String message) { super(message); }
    public LlmException(String message, Throwable cause) { super(message, cause); }
}

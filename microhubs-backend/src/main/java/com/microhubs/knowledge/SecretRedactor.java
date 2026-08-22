package com.microhubs.knowledge;

import java.util.regex.Pattern;

/**
 * Pattern-based secret/credential redactor for LLM context.
 * MVP implementation — known limitation: not comprehensive.
 * Flags common patterns like API keys, tokens, passwords in strings.
 */
public class SecretRedactor {

    private static final Pattern[] PATTERNS = {
        // API keys / tokens (common formats)
        Pattern.compile("(?i)(api[_-]?key|apikey|token|secret|password|passwd|pwd)\\s*[:=]\\s*['\"]?([A-Za-z0-9_\\-\\.]{8,})['\"]?"),
        // Bearer tokens
        Pattern.compile("(?i)(Bearer\\s+[A-Za-z0-9\\-._~+/]+=*)"),
        // JWT tokens (three base64 segments separated by dots)
        Pattern.compile("eyJ[A-Za-z0-9_-]+\\.eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+"),
        // AWS-style keys
        Pattern.compile("(AKIA[0-9A-Z]{16})"),
        // Generic hex strings that look like secrets (32+ chars)
        Pattern.compile("(?i)(secret|key|token|hash)\\s*[:=]\\s*['\"]?([0-9a-f]{32,})['\"]?"),
    };

    private static final String REDACTED = "[REDACTED]";

    /**
     * Redact obvious secrets from text before sending to LLM.
     * Known limitation: pattern-based, not a comprehensive secret scanner.
     */
    public static String redact(String text) {
        if (text == null) return null;
        String result = text;
        for (Pattern p : PATTERNS) {
            result = p.matcher(result).replaceAll(REDACTED);
        }
        return result;
    }
}

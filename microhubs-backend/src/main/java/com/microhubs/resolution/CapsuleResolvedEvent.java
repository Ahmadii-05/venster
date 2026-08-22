package com.microhubs.resolution;

import org.springframework.context.ApplicationEvent;

import java.util.UUID;

/**
 * Published when a capsule is resolved.
 * This is the integration hook for the future Knowledge/AI module.
 *
 * Do NOT call any AI/LLM code — just publish this event and stop there.
 * A listener in the Knowledge module will pick this up later.
 */
public class CapsuleResolvedEvent extends ApplicationEvent {

    private final UUID capsuleId;
    private final UUID resolutionId;

    public CapsuleResolvedEvent(Object source, UUID capsuleId, UUID resolutionId) {
        super(source);
        this.capsuleId = capsuleId;
        this.resolutionId = resolutionId;
    }

    public UUID getCapsuleId() { return capsuleId; }
    public UUID getResolutionId() { return resolutionId; }
}

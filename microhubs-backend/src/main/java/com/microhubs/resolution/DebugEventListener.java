package com.microhubs.resolution;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Temporary debug listener that logs CapsuleResolvedEvent details to the console.
 * Harmless and useful for Phase 4 debugging.
 */
@Component
public class DebugEventListener {

    private static final Logger log = LoggerFactory.getLogger(DebugEventListener.class);

    @EventListener
    public void onCapsuleResolved(CapsuleResolvedEvent event) {
        log.info("[DEBUG EVENT] CapsuleResolvedEvent fired — capsuleId={}, resolutionId={}",
                event.getCapsuleId(), event.getResolutionId());
    }
}

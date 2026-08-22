package com.microhubs.capsule;

/**
 * Status of a capsule (discussion thread on code).
 * Values match the CHECK constraint in schema.sql exactly:
 * OPEN, IN_REVIEW, ANSWERED, RESOLVED, ARCHIVED
 */
public enum CapsuleStatus {
    OPEN,
    IN_REVIEW,
    ANSWERED,
    RESOLVED,
    ARCHIVED
}

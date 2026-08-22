package com.microhubs.capsule;

/**
 * Priority of a capsule.
 * Values match the CHECK constraint in schema.sql exactly:
 * LOW, MEDIUM, HIGH
 */
public enum CapsulePriority {
    LOW,
    MEDIUM,
    HIGH
}

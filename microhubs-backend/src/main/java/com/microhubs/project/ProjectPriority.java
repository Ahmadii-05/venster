package com.microhubs.project;

/**
 * Priority of a project.
 * Values match the CHECK constraint in schema.sql exactly:
 * LOW, MEDIUM, HIGH
 */
public enum ProjectPriority {
    LOW,
    MEDIUM,
    HIGH
}

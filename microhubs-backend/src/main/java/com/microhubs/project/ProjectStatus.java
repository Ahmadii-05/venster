package com.microhubs.project;

/**
 * Lifecycle status of a project.
 * Values match the CHECK constraint in schema.sql exactly:
 * PLANNING, ACTIVE, ON_HOLD, COMPLETED, ARCHIVED
 */
public enum ProjectStatus {
    PLANNING,
    ACTIVE,
    ON_HOLD,
    COMPLETED,
    ARCHIVED
}

-- Workflow-Embedded Micro-Hubs — canonical database schema
-- Postgres + pgvector
--
-- This is the schema that `docker-compose` mounts into the db container's
-- docker-entrypoint-initdb.d, and it MUST stay in sync with the JPA entities
-- because the app runs with `spring.jpa.hibernate.ddl-auto: validate` and will
-- refuse to start if a mapped table/column is missing.
--
-- It mirrors src/test/resources/schema-test.sql (used by the Testcontainers
-- integration tests), plus indexes for the hot query paths and pgvector search.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────────────────
-- Core identity / workspace tables
-- ─────────────────────────────────────────────────────────────

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    platform_moderator BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER','ADMIN','MEMBER')),
    joined_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, user_id)
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    repository_url VARCHAR(500),
    tech_stack VARCHAR(255),
    status VARCHAR(20) DEFAULT 'PLANNING'
        CHECK (status IN ('PLANNING','ACTIVE','ON_HOLD','COMPLETED','ARCHIVED')),
    priority VARCHAR(20) DEFAULT 'MEDIUM'
        CHECK (priority IN ('LOW','MEDIUM','HIGH')),
    target_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Artifact / anchor chain (code location a capsule is attached to)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    repository VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE artifact_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    commit_hash VARCHAR(100),
    version_label VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE artifact_anchors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_version_id UUID NOT NULL REFERENCES artifact_versions(id) ON DELETE CASCADE,
    start_line INT,
    end_line INT,
    selected_text TEXT,
    content_hash VARCHAR(128),
    symbol_name VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Capsules, discussion, resolution
-- ─────────────────────────────────────────────────────────────

CREATE TABLE capsules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_anchor_id UUID NOT NULL REFERENCES artifact_anchors(id),
    author_id UUID NOT NULL REFERENCES users(id),
    reviewer_id UUID REFERENCES users(id),
    priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH')),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN','IN_REVIEW','ANSWERED','RESOLVED','ARCHIVED')),
    title TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capsule_id UUID NOT NULL REFERENCES capsules(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capsule_id UUID NOT NULL UNIQUE REFERENCES capsules(id) ON DELETE CASCADE,
    resolver_id UUID NOT NULL REFERENCES users(id),
    final_solution TEXT NOT NULL,
    resolved_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Knowledge (AI-extracted, pgvector embedding)
-- resolution_id is nullable+unique to match the KnowledgeItem entity.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE knowledge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resolution_id UUID UNIQUE REFERENCES resolutions(id) ON DELETE CASCADE,
    title TEXT,
    summary TEXT,
    root_cause TEXT,
    solution TEXT,
    tags TEXT[],
    category VARCHAR(100),
    confidence NUMERIC(3,2),
    embedding vector(1536),
    approved BOOLEAN NOT NULL DEFAULT false,
    visibility VARCHAR(20) NOT NULL DEFAULT 'PRIVATE',
    published_by UUID REFERENCES users(id),
    published_at TIMESTAMP,
    global_answer_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Notifications & audit
-- ─────────────────────────────────────────────────────────────

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    context JSONB,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- Phase 6 — global Q&A
-- accepted_answer_id has no FK constraint on purpose (avoids a circular
-- dependency with global_answers, which references global_questions).
-- ─────────────────────────────────────────────────────────────

CREATE TABLE global_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    tags TEXT[],
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    accepted_answer_id UUID,
    hidden BOOLEAN NOT NULL DEFAULT false,
    report_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE global_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES global_questions(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    is_accepted BOOLEAN NOT NULL DEFAULT false,
    hidden BOOLEAN NOT NULL DEFAULT false,
    report_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE global_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    target_type VARCHAR(20) NOT NULL,
    target_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (reporter_id, target_type, target_id)
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────

-- Foreign-key / lookup indexes (Postgres does not auto-index FKs)
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user      ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace          ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_project           ON artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_artifact  ON artifact_versions(artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifact_anchors_version    ON artifact_anchors(artifact_version_id);

CREATE INDEX IF NOT EXISTS idx_capsules_anchor            ON capsules(artifact_anchor_id);
CREATE INDEX IF NOT EXISTS idx_capsules_author            ON capsules(author_id);
CREATE INDEX IF NOT EXISTS idx_capsules_reviewer          ON capsules(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_capsules_status            ON capsules(status);

CREATE INDEX IF NOT EXISTS idx_comments_capsule           ON comments(capsule_id);
CREATE INDEX IF NOT EXISTS idx_comments_author            ON comments(author_id);

CREATE INDEX IF NOT EXISTS idx_resolutions_resolver       ON resolutions(resolver_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_items_visibility ON knowledge_items(visibility);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_category   ON knowledge_items(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_published_by ON knowledge_items(published_by);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read    ON notifications(user_id, read);

CREATE INDEX IF NOT EXISTS idx_global_questions_author    ON global_questions(author_id);
CREATE INDEX IF NOT EXISTS idx_global_questions_status    ON global_questions(status);
CREATE INDEX IF NOT EXISTS idx_global_answers_question    ON global_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_global_answers_author      ON global_answers(author_id);
CREATE INDEX IF NOT EXISTS idx_global_reports_reporter    ON global_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_global_reports_target      ON global_reports(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_user             ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity           ON audit_log(entity_type, entity_id);

-- Approximate-nearest-neighbour index for pgvector semantic search.
-- The similarity queries order by cosine distance (the `<=>` operator),
-- so the index must use the matching cosine ops class.
CREATE INDEX IF NOT EXISTS idx_knowledge_items_embedding_hnsw
    ON knowledge_items USING hnsw (embedding vector_cosine_ops);

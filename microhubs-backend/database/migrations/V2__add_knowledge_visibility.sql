-- Phase 6: Public Knowledge Sharing + Global Q&A
-- Migration: add visibility to knowledge_items, create global Q&A tables

-- Feature A: Knowledge visibility
ALTER TABLE knowledge_items ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE knowledge_items ADD COLUMN published_by UUID REFERENCES users(id);
ALTER TABLE knowledge_items ADD COLUMN published_at TIMESTAMP;

-- Feature B: Global Questions & Answers
CREATE TABLE global_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    tags TEXT[],
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN','ANSWERED','CLOSED')),
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

-- Add FK for accepted_answer_id after both tables exist
ALTER TABLE global_questions ADD CONSTRAINT fk_accepted_answer
    FOREIGN KEY (accepted_answer_id) REFERENCES global_answers(id);

-- Moderation: platform moderator flag on users
ALTER TABLE users ADD COLUMN platform_moderator BOOLEAN NOT NULL DEFAULT false;

-- Report tracking: prevent duplicate reports
CREATE TABLE global_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('QUESTION','ANSWER')),
    target_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (reporter_id, target_type, target_id)
);

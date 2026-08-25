-- Phase 8: Project teams — hard project-level isolation.
--
-- Introduces the project_members join table. From here on, project-team
-- membership (not workspace membership) governs who can see and act on a
-- project and everything below it (artifacts, capsules, comments, resolutions).
--
-- Idempotent (IF NOT EXISTS) so it is safe to re-run. Because the app runs
-- under spring.jpa.hibernate.ddl-auto: validate, this table MUST exist before
-- the app boots against an existing database.

CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user    ON project_members(user_id);

-- Backfill: seed every existing project's team with the full workspace roster,
-- so no project becomes invisible on upgrade. New projects get an explicit team
-- (creator + chosen members) going forward.
INSERT INTO project_members (project_id, user_id)
SELECT p.id, wm.user_id
FROM projects p
JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
ON CONFLICT (project_id, user_id) DO NOTHING;

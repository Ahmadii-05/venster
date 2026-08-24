-- Phase 7: Project technical / production metadata
-- Migration: add the standard project detail fields.
--
-- Idempotent (IF NOT EXISTS) so it is safe to re-run. All columns are
-- nullable or defaulted, so existing project rows remain valid and the app
-- keeps starting under spring.jpa.hibernate.ddl-auto: validate.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS repository_url VARCHAR(500);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tech_stack VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PLANNING';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'MEDIUM';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_date DATE;

-- Constrain the enum-backed columns to the values the JPA enums can produce.
-- Wrapped so re-running the migration doesn't error on an existing constraint.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'projects_status_check'
    ) THEN
        ALTER TABLE projects ADD CONSTRAINT projects_status_check
            CHECK (status IN ('PLANNING','ACTIVE','ON_HOLD','COMPLETED','ARCHIVED'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'projects_priority_check'
    ) THEN
        ALTER TABLE projects ADD CONSTRAINT projects_priority_check
            CHECK (priority IN ('LOW','MEDIUM','HIGH'));
    END IF;
END $$;

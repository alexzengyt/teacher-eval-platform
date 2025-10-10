-- =========================
-- Database bootstrap script
-- Strategy:
--   - Keep Core tables normalized for app logic
--   - Keep Staging tables to land raw/near-raw Schoolday data
--   - Use `external_id` + `source` to decouple from providers
--   - Make schema idempotent (safe to run multiple times)
-- =========================

-- ---------- Core lookup / base ----------
CREATE TABLE IF NOT EXISTS schools (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  external_id   TEXT UNIQUE,                 -- Schoolday/other provider id
  source        TEXT NOT NULL DEFAULT 'manual',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teachers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  email         TEXT UNIQUE,
  school_id     UUID REFERENCES schools(id) ON DELETE SET NULL,
  external_id   TEXT UNIQUE,                 -- Schoolday teacher id
  source        TEXT NOT NULL DEFAULT 'manual',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL,
  title         TEXT NOT NULL,
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,
  external_id   TEXT UNIQUE,                 -- Schoolday course id
  source        TEXT NOT NULL DEFAULT 'manual',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  term          TEXT,
  external_id   TEXT UNIQUE,                 -- Schoolday section id
  source        TEXT NOT NULL DEFAULT 'manual',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Teaching assignment (teacher ↔ section)
CREATE TABLE IF NOT EXISTS teaching_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  section_id    UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  UNIQUE (teacher_id, section_id)
);

-- ---------- Evaluation domain ----------
-- One evaluation per teacher per period/type
CREATE TABLE IF NOT EXISTS evaluations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  period          DATERANGE NOT NULL,          -- e.g., [2025-08-01,2026-07-31)
  type            TEXT NOT NULL,               -- 'annual' | 'midterm' | etc.
  overall_score   NUMERIC(5,2),
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, period, type)
);

-- Fine-grained rubric/metric scores
CREATE TABLE IF NOT EXISTS evaluation_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id  UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  category       TEXT NOT NULL,                -- 'teaching' | 'research' | 'service' | 'professional'
  metric         TEXT NOT NULL,                -- e.g., 'student_satisfaction'
  score          NUMERIC(5,2) NOT NULL,
  comment        TEXT
);

-- Research outputs (simplified)
CREATE TABLE IF NOT EXISTS publications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  venue         TEXT,
  published_on  DATE,
  external_id   TEXT,                           -- link to external systems (e.g., ORCID)
  source        TEXT NOT NULL DEFAULT 'manual',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Professional development courses (e.g., Schoolday Academy)
CREATE TABLE IF NOT EXISTS pd_courses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,                  -- 'schoolday_academy' | 'internal' | etc.
  title         TEXT NOT NULL,
  hours         NUMERIC(6,2) DEFAULT 0,
  completed_on  DATE,
  external_id   TEXT,
  source        TEXT NOT NULL DEFAULT 'manual',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Files/CVs/Certificates (stored elsewhere; keep metadata here)
CREATE TABLE IF NOT EXISTS documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type    TEXT NOT NULL,                  -- 'teacher' | 'evaluation'
  owner_id      UUID NOT NULL,
  kind          TEXT NOT NULL,                  -- 'cv' | 'certificate' | 'evidence'
  url           TEXT NOT NULL,                  -- S3/GCS/etc.
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Staging (landing area for Schoolday/OneRoster) ----------
-- Keep raw/near-raw snapshots so adapters can evolve safely.

CREATE TABLE IF NOT EXISTS sd_sync_log (
  id            BIGSERIAL PRIMARY KEY,
  job           TEXT NOT NULL,                  -- 'discover' | 'roster' | 'academy'
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'running',-- 'running' | 'success' | 'failed'
  details       JSONB
);

CREATE TABLE IF NOT EXISTS sd_teachers (
  external_id   TEXT PRIMARY KEY,               -- Schoolday teacher id
  payload       JSONB NOT NULL,                 -- raw JSON snapshot
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sd_courses (
  external_id   TEXT PRIMARY KEY,               -- Schoolday course id
  payload       JSONB NOT NULL,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sd_sections (
  external_id   TEXT PRIMARY KEY,               -- Schoolday section id
  course_external_id TEXT,
  payload       JSONB NOT NULL,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional cursor to support incremental sync
CREATE TABLE IF NOT EXISTS sd_import_cursor (
  key           TEXT PRIMARY KEY,               -- e.g., 'roster_since'
  value         TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Helpful indexes ----------
CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_eval_teacher ON evaluations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_eval_period  ON evaluations USING GIST (period);

-- ---------- Minimal demo seed (OPTIONAL; safe to comment out) ----------
-- Make sure uuid generator exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $seed$
DECLARE
  _school_id  uuid;
  _teacher_id uuid;
  _eval_id    uuid;
BEGIN
  -- seed one school
  IF NOT EXISTS (SELECT 1 FROM schools WHERE name = 'Demo District') THEN
    INSERT INTO schools (id, name, source)
    VALUES (gen_random_uuid(), 'Demo District', 'manual');
  END IF;

  -- get school id
  SELECT id INTO _school_id FROM schools WHERE name = 'Demo District' LIMIT 1;

  -- seed one teacher
  IF NOT EXISTS (SELECT 1 FROM teachers WHERE email = 'alice@example.edu') THEN
    INSERT INTO teachers (id, first_name, last_name, email, school_id, external_id, source)
    VALUES (gen_random_uuid(), 'Alice', 'Chen', 'alice@example.edu', _school_id, NULL, 'manual');
  END IF;

  -- get teacher id
  SELECT id INTO _teacher_id FROM teachers WHERE email = 'alice@example.edu' LIMIT 1;

  -- seed one evaluation with a couple of items
  IF NOT EXISTS (SELECT 1 FROM evaluations WHERE teacher_id = _teacher_id) THEN
    INSERT INTO evaluations (id, teacher_id, period, type, overall_score)
    VALUES (
      gen_random_uuid(),
      _teacher_id,
      daterange(date(date_trunc('year', now())), date(date_trunc('year', now()) + INTERVAL '1 year'), '[]'),
      'annual',
      4.3
    )
    RETURNING id INTO _eval_id;

    INSERT INTO evaluation_items (evaluation_id, category, metric, score, comment)
    VALUES (_eval_id, 'teaching',  'student_satisfaction', 4.5, 'Strong engagement');

    INSERT INTO evaluation_items (evaluation_id, category, metric, score, comment)
    VALUES (_eval_id, 'research', 'publications',          4.0, 'Two conference papers');
  END IF;
END
$seed$ LANGUAGE plpgsql;

-- ===== OneRoster master data (separate namespace to avoid collision) =====
CREATE TABLE IF NOT EXISTS roster_teachers (
  id SERIAL PRIMARY KEY,
  external_id TEXT UNIQUE,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  org_external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roster_classes (
  id SERIAL PRIMARY KEY,
  external_id TEXT UNIQUE,
  title TEXT,
  school_external_id TEXT,
  term TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roster_teacher_class_enrollments (
  id SERIAL PRIMARY KEY,
  teacher_external_id TEXT NOT NULL,
  class_external_id TEXT NOT NULL,
  role TEXT,
  UNIQUE (teacher_external_id, class_external_id)
);

-- Sync run logs for debugging
CREATE TABLE IF NOT EXISTS sync_runs (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT,
  summary_json JSONB
);

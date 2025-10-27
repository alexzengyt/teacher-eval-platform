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
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  email             TEXT UNIQUE,
  school_id         UUID REFERENCES schools(id) ON DELETE SET NULL,
  external_id       TEXT UNIQUE,                 -- Schoolday teacher id
  source            TEXT NOT NULL DEFAULT 'manual',
  roster_source_id  TEXT,                        -- Link to roster_teachers (migration 007)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
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
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id        UUID REFERENCES teachers(id) ON DELETE CASCADE,
  filename          TEXT NOT NULL,                  -- Storage filename
  original_filename TEXT NOT NULL,                  -- Original filename
  file_path         TEXT NOT NULL,                  -- Full path to file
  file_size         BIGINT,                         -- File size in bytes
  mime_type         TEXT,                           -- MIME type
  document_type     TEXT,                           -- 'cv' | 'certificate' | 'evidence' | 'other'
  description       TEXT,                           -- Optional description
  uploaded_by       UUID,                           -- User who uploaded
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
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
CREATE INDEX IF NOT EXISTS idx_teachers_roster_source_id ON teachers(roster_source_id);
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
    INSERT INTO evaluations (id, teacher_id, period, type, overall_score, metadata)
    VALUES (
      gen_random_uuid(),
      _teacher_id,
      daterange(date(date_trunc('year', now())), date(date_trunc('year', now()) + INTERVAL '1 year'), '[]'),
      'annual',
      4.03,
      jsonb_build_object(
        'cards', jsonb_build_object(
          'teaching_effectiveness', 4.1,
          'research_output', 4.0,
          'service_contribution', 4.2,
          'grant_funding', 3.8
        ),
        'radar', jsonb_build_object(
          'teaching', 4.1,
          'research', 4.0,
          'service', 4.2,
          'professional_development', 4.1
        )
      )
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

-- ============================================================
-- MIGRATION 008: Service, Professional, and Career Tables
-- Added: January 2025
-- Purpose: Support full Multi-Tab Evaluation Interface
-- ============================================================

-- 1. SERVICE ACTIVITIES
CREATE TABLE IF NOT EXISTS service_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('committee', 'community', 'department', 'professional_org')),
  name TEXT NOT NULL,
  role TEXT,
  organization TEXT,
  start_date DATE,
  end_date DATE,
  hours NUMERIC(6,1),
  description TEXT,
  impact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_activities_teacher ON service_activities(teacher_id);
CREATE INDEX IF NOT EXISTS idx_service_activities_type ON service_activities(activity_type);

-- 2. EDUCATION HISTORY
CREATE TABLE IF NOT EXISTS education_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  degree TEXT NOT NULL,
  field TEXT NOT NULL,
  institution TEXT NOT NULL,
  location TEXT,
  graduation_year INT,
  gpa NUMERIC(3,2),
  honors TEXT,
  thesis_title TEXT,
  advisor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_education_history_teacher ON education_history(teacher_id);
CREATE INDEX IF NOT EXISTS idx_education_history_year ON education_history(graduation_year);

-- 3. CAREER HISTORY
CREATE TABLE IF NOT EXISTS career_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  institution TEXT NOT NULL,
  department TEXT,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  responsibilities TEXT,
  achievements TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_career_history_teacher ON career_history(teacher_id);
CREATE INDEX IF NOT EXISTS idx_career_history_current ON career_history(is_current);

-- 4. AWARDS
CREATE TABLE IF NOT EXISTS awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  award_type TEXT CHECK (award_type IN ('teaching', 'research', 'service', 'leadership', 'other')),
  awarded_date DATE NOT NULL,
  amount NUMERIC(12,2),
  description TEXT,
  significance TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_awards_teacher ON awards(teacher_id);
CREATE INDEX IF NOT EXISTS idx_awards_type ON awards(award_type);
CREATE INDEX IF NOT EXISTS idx_awards_date ON awards(awarded_date DESC);

-- 5. GRANTS
CREATE TABLE IF NOT EXISTS grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  funding_agency TEXT NOT NULL,
  grant_type TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('pending', 'active', 'completed', 'declined')),
  role TEXT,
  description TEXT,
  outcomes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grants_teacher ON grants(teacher_id);
CREATE INDEX IF NOT EXISTS idx_grants_status ON grants(status);
CREATE INDEX IF NOT EXISTS idx_grants_dates ON grants(start_date DESC, end_date DESC);

-- Helpful views
CREATE OR REPLACE VIEW active_service AS
SELECT sa.*, t.first_name, t.last_name, t.email
FROM service_activities sa
JOIN teachers t ON sa.teacher_id = t.id
WHERE sa.end_date IS NULL OR sa.end_date >= CURRENT_DATE
ORDER BY sa.start_date DESC;

CREATE OR REPLACE VIEW current_positions AS
SELECT ch.*, t.first_name, t.last_name, t.email
FROM career_history ch
JOIN teachers t ON ch.teacher_id = t.id
WHERE ch.is_current = true
ORDER BY ch.start_date DESC;

CREATE OR REPLACE VIEW active_grants AS
SELECT g.*, t.first_name, t.last_name, t.email
FROM grants g
JOIN teachers t ON g.teacher_id = t.id
WHERE g.status = 'active'
ORDER BY g.amount DESC;

-- ============================================================
-- SEED DATA: Service, Professional, and Career
-- ============================================================

DO $seed_new_tables$
DECLARE
  _alice_id UUID;
BEGIN
  SELECT id INTO _alice_id FROM teachers WHERE email = 'alice@example.edu' LIMIT 1;
  IF _alice_id IS NULL THEN RETURN; END IF;

  -- Service Activities
  INSERT INTO service_activities (teacher_id, activity_type, name, role, organization, start_date, end_date, hours, description, impact)
  VALUES 
    (_alice_id, 'committee', 'Curriculum Development Committee', 'Member', 'Economics Department', '2024-09-01', NULL, 20, 
     'Participate in reviewing and updating undergraduate curriculum', 'Redesigned 3 core courses'),
    (_alice_id, 'committee', 'Faculty Senate', 'Representative', 'University Senate', '2023-09-01', NULL, 35,
     'Represent Economics in university governance', 'Advocated for research funding'),
    (_alice_id, 'committee', 'Student Affairs Committee', 'Chair', 'College of Business', '2024-01-15', '2024-12-31', 45,
     'Lead committee on student concerns', 'Implemented mentorship program'),
    (_alice_id, 'community', 'Guest Lecture Series', 'Speaker', 'Lincoln High School', '2024-11-15', '2024-11-15', 2,
     'Lecture on "Economics in Everyday Life"', 'Reached 150 students'),
    (_alice_id, 'community', 'Career Fair Volunteer', 'Mentor', 'City Career Center', '2024-10-20', '2024-10-20', 4,
     'Career guidance to local students', 'Mentored 30+ students'),
    (_alice_id, 'professional_org', 'American Economic Association', 'Session Chair', 'AEA Meeting', '2024-01-05', '2024-01-07', 8,
     'Chaired behavioral economics session', '50+ attendees');

  -- Education History
  INSERT INTO education_history (teacher_id, degree, field, institution, location, graduation_year, gpa, honors, thesis_title, advisor)
  VALUES 
    (_alice_id, 'Ph.D.', 'Economics', 'Stanford University', 'Stanford, CA', 2018, 3.92, 'Distinction',
     'Behavioral Economics and Decision-Making Under Uncertainty', 'Prof. Robert Wilson'),
    (_alice_id, 'M.A.', 'Economics', 'UC Berkeley', 'Berkeley, CA', 2014, 3.88, NULL,
     'The Impact of Information Asymmetry on Market Efficiency', 'Prof. George Akerlof'),
    (_alice_id, 'B.A.', 'Business Administration', 'UCLA', 'Los Angeles, CA', 2012, 3.95, 'Summa Cum Laude', NULL, NULL);

  -- Career History
  INSERT INTO career_history (teacher_id, position, institution, department, location, start_date, end_date, is_current, responsibilities, achievements)
  VALUES 
    (_alice_id, 'Associate Professor', 'Current University', 'Department of Economics', 'City, State', 
     '2020-09-01', NULL, true,
     'Teaching undergraduate/graduate courses. Research on decision-making.',
     'Published 8 articles. Received Excellence Award. $250k funding.'),
    (_alice_id, 'Assistant Professor', 'Current University', 'Department of Economics', 'City, State',
     '2018-09-01', '2020-08-31', false,
     'Teaching core courses. Establishing research program.',
     'Published 5 articles. Developed new course.'),
    (_alice_id, 'Postdoctoral Researcher', 'Stanford University', 'Department of Economics', 'Stanford, CA',
     '2016-09-01', '2018-08-31', false,
     'Independent research. Grant proposals.',
     'Co-authored 3 papers. $120k fellowship.');

  -- Awards
  INSERT INTO awards (teacher_id, title, organization, award_type, awarded_date, amount, description, significance)
  VALUES 
    (_alice_id, 'Excellence in Teaching Award', 'University Faculty Association', 'teaching', 
     '2024-05-15', 5000.00, 'Outstanding teaching performance', 'Top university award'),
    (_alice_id, 'Best Paper Award', 'International Economics Conference', 'research',
     '2023-11-20', NULL, 'Best paper on behavioral economics', '300+ submissions'),
    (_alice_id, 'Early Career Research Award', 'American Economic Association', 'research',
     '2022-08-01', 10000.00, 'Exceptional early-career contributions', 'National award');

  -- Grants
  INSERT INTO grants (teacher_id, title, funding_agency, grant_type, amount, start_date, end_date, status, role, description, outcomes)
  VALUES 
    (_alice_id, 'Behavioral Economics in Digital Markets', 'National Science Foundation', 'Research',
     250000.00, '2023-09-01', '2026-08-31', 'active', 'PI',
     'Three-year research on online marketplaces', 'Published 2 papers'),
    (_alice_id, 'Teaching Innovation in Economics', 'University Teaching Fund', 'Teaching',
     15000.00, '2024-01-01', '2024-12-31', 'active', 'PI',
     'Innovative teaching methods with data analytics', 'Piloted in 3 classes'),
    (_alice_id, 'Market Microstructure Research', 'Sloan Foundation', 'Research',
     80000.00, '2021-09-01', '2023-08-31', 'completed', 'Co-PI',
     'Information flow in financial markets', 'Published 4 papers');

  -- Historical Evaluations (Alice Chen)
  -- 2023 Spring
  INSERT INTO evaluations (id, teacher_id, period, type, overall_score, metadata)
  VALUES (
    gen_random_uuid(),
    _alice_id,
    daterange('2023-01-01', '2023-06-01', '[]'),
    'semester',
    3.85,
    jsonb_build_object(
      'cards', jsonb_build_object(
        'teaching_effectiveness', 3.9,
        'research_output', 3.7,
        'service_contribution', 3.8,
        'grant_funding', 4.0
      ),
      'radar', jsonb_build_object(
        'teaching', 3.9,
        'research', 3.7,
        'service', 3.8,
        'professional_development', 3.9
      )
    )
  );

  -- 2023 Fall
  INSERT INTO evaluations (id, teacher_id, period, type, overall_score, metadata)
  VALUES (
    gen_random_uuid(),
    _alice_id,
    daterange('2023-08-01', '2023-12-31', '[]'),
    'semester',
    3.95,
    jsonb_build_object(
      'cards', jsonb_build_object(
        'teaching_effectiveness', 4.0,
        'research_output', 3.8,
        'service_contribution', 4.0,
        'grant_funding', 4.0
      ),
      'radar', jsonb_build_object(
        'teaching', 4.0,
        'research', 3.8,
        'service', 4.0,
        'professional_development', 4.0
      )
    )
  );

  -- 2024 Spring
  INSERT INTO evaluations (id, teacher_id, period, type, overall_score, metadata)
  VALUES (
    gen_random_uuid(),
    _alice_id,
    daterange('2024-01-01', '2024-06-01', '[]'),
    'semester',
    4.0,
    jsonb_build_object(
      'cards', jsonb_build_object(
        'teaching_effectiveness', 4.05,
        'research_output', 3.9,
        'service_contribution', 4.1,
        'grant_funding', 3.9
      ),
      'radar', jsonb_build_object(
        'teaching', 4.05,
        'research', 3.9,
        'service', 4.1,
        'professional_development', 4.0
      )
    )
  );

END $seed_new_tables$;

-- ============================================================
-- Migration 008: Add Service, Professional, and Career Tables
-- Purpose: Support full Multi-Tab Evaluation Interface
-- Date: January 2025
-- ============================================================

-- ============================================================
-- 1. SERVICE ACTIVITIES (Committee Work + Community Service)
-- ============================================================
CREATE TABLE IF NOT EXISTS service_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('committee', 'community', 'department', 'professional_org')),
  name TEXT NOT NULL,
  role TEXT,  -- e.g., 'Chair', 'Member', 'Organizer'
  organization TEXT,
  start_date DATE,
  end_date DATE,
  hours NUMERIC(6,1),  -- Total hours contributed
  description TEXT,
  impact TEXT,  -- Description of impact (e.g., "Reached 150 students")
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_activities_teacher 
  ON service_activities(teacher_id);
CREATE INDEX IF NOT EXISTS idx_service_activities_type 
  ON service_activities(activity_type);

COMMENT ON TABLE service_activities IS 
  'Tracks committee work, community service, and professional organization involvement';

-- ============================================================
-- 2. EDUCATION HISTORY (Degrees and Certifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS education_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  degree TEXT NOT NULL,  -- e.g., 'Ph.D.', 'M.A.', 'B.A.', 'Certificate'
  field TEXT NOT NULL,   -- e.g., 'Economics', 'Education'
  institution TEXT NOT NULL,
  location TEXT,  -- e.g., 'Stanford, CA'
  graduation_year INT,
  gpa NUMERIC(3,2),  -- e.g., 3.85
  honors TEXT,  -- e.g., 'Summa Cum Laude', 'Distinction'
  thesis_title TEXT,  -- For advanced degrees
  advisor TEXT,  -- Dissertation advisor
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_education_history_teacher 
  ON education_history(teacher_id);
CREATE INDEX IF NOT EXISTS idx_education_history_year 
  ON education_history(graduation_year);

COMMENT ON TABLE education_history IS 
  'Academic degrees and educational background of teachers';

-- ============================================================
-- 3. CAREER HISTORY (Employment Timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS career_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  position TEXT NOT NULL,  -- e.g., 'Associate Professor', 'Postdoctoral Researcher'
  institution TEXT NOT NULL,
  department TEXT,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE,  -- NULL if current position
  is_current BOOLEAN DEFAULT false,
  responsibilities TEXT,  -- Key duties and responsibilities
  achievements TEXT,  -- Notable achievements during this position
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_career_history_teacher 
  ON career_history(teacher_id);
CREATE INDEX IF NOT EXISTS idx_career_history_current 
  ON career_history(is_current);

COMMENT ON TABLE career_history IS 
  'Employment timeline and professional experience';

-- ============================================================
-- 4. AWARDS (Recognition and Honors)
-- ============================================================
CREATE TABLE IF NOT EXISTS awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,  -- e.g., 'Excellence in Teaching Award'
  organization TEXT NOT NULL,  -- Awarding body
  award_type TEXT CHECK (award_type IN ('teaching', 'research', 'service', 'leadership', 'other')),
  awarded_date DATE NOT NULL,
  amount NUMERIC(12,2),  -- Monetary value if applicable
  description TEXT,
  significance TEXT,  -- Why this award is significant
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_awards_teacher 
  ON awards(teacher_id);
CREATE INDEX IF NOT EXISTS idx_awards_type 
  ON awards(award_type);
CREATE INDEX IF NOT EXISTS idx_awards_date 
  ON awards(awarded_date DESC);

COMMENT ON TABLE awards IS 
  'Awards, honors, and recognition received by teachers';

-- ============================================================
-- 5. GRANTS (Research Funding)
-- ============================================================
CREATE TABLE IF NOT EXISTS grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  funding_agency TEXT NOT NULL,  -- e.g., 'National Science Foundation'
  grant_type TEXT,  -- e.g., 'Research', 'Equipment', 'Training'
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('pending', 'active', 'completed', 'declined')),
  role TEXT,  -- e.g., 'PI' (Principal Investigator), 'Co-PI'
  description TEXT,
  outcomes TEXT,  -- Results or outcomes of the grant
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grants_teacher 
  ON grants(teacher_id);
CREATE INDEX IF NOT EXISTS idx_grants_status 
  ON grants(status);
CREATE INDEX IF NOT EXISTS idx_grants_dates 
  ON grants(start_date DESC, end_date DESC);

COMMENT ON TABLE grants IS 
  'Research grants and funding received by teachers';

-- ============================================================
-- 6. Add helpful views for reporting
-- ============================================================

-- View: Active service commitments
CREATE OR REPLACE VIEW active_service AS
SELECT 
  sa.*,
  t.first_name,
  t.last_name,
  t.email
FROM service_activities sa
JOIN teachers t ON sa.teacher_id = t.id
WHERE sa.end_date IS NULL OR sa.end_date >= CURRENT_DATE
ORDER BY sa.start_date DESC;

-- View: Current positions
CREATE OR REPLACE VIEW current_positions AS
SELECT 
  ch.*,
  t.first_name,
  t.last_name,
  t.email
FROM career_history ch
JOIN teachers t ON ch.teacher_id = t.id
WHERE ch.is_current = true
ORDER BY ch.start_date DESC;

-- View: Active grants
CREATE OR REPLACE VIEW active_grants AS
SELECT 
  g.*,
  t.first_name,
  t.last_name,
  t.email
FROM grants g
JOIN teachers t ON g.teacher_id = t.id
WHERE g.status = 'active'
ORDER BY g.amount DESC;

-- ============================================================
-- Success message
-- ============================================================
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migration 008 completed successfully!';
  RAISE NOTICE '📊 Created 5 new tables:';
  RAISE NOTICE '   - service_activities';
  RAISE NOTICE '   - education_history';
  RAISE NOTICE '   - career_history';
  RAISE NOTICE '   - awards';
  RAISE NOTICE '   - grants';
  RAISE NOTICE '🎯 Multi-Tab Evaluation Interface is now fully supported!';
END $$;


-- ============================================================================
-- 011_seed_historical_evaluations.sql
-- Purpose: Add historical evaluation data (3-4 semesters) for all teachers
-- ============================================================================

DO $$
DECLARE
  _alice_id UUID;
  _ben_id UUID;
  _peiyao_id UUID;
  _alex_id UUID;
BEGIN
  -- Get teacher IDs
  SELECT id INTO _alice_id FROM teachers WHERE email = 'alice@example.edu';
  SELECT id INTO _ben_id FROM teachers WHERE email = 'ben@springfield.edu';
  SELECT id INTO _peiyao_id FROM teachers WHERE email = 'peiyao@example.com';
  SELECT id INTO _alex_id FROM teachers WHERE email = 'alex@example.com';

  -- =========================================================================
  -- ALICE CHEN - Historical Evaluations (showing improvement trend)
  -- =========================================================================
  
  -- 2023 Spring (baseline - lower scores)
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

  -- 2023 Fall (slight improvement)
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

  -- 2024 Spring (continued improvement)
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

  -- 2024 Fall is already in init.sql with score 4.03

  -- =========================================================================
  -- BEN WANG - Historical Evaluations (showing fluctuation)
  -- =========================================================================
  
  -- 2023 Spring (high start)
  INSERT INTO evaluations (id, teacher_id, period, type, overall_score, metadata)
  VALUES (
    gen_random_uuid(),
    _ben_id,
    daterange('2023-01-01', '2023-06-01', '[]'),
    'semester',
    4.25,
    jsonb_build_object(
      'cards', jsonb_build_object(
        'teaching_effectiveness', 4.4,
        'research_output', 4.2,
        'service_contribution', 4.1,
        'grant_funding', 4.3
      ),
      'radar', jsonb_build_object(
        'teaching', 4.4,
        'research', 4.2,
        'service', 4.1,
        'professional_development', 4.2
      )
    )
  );

  -- 2023 Fall (slight dip)
  INSERT INTO evaluations (id, teacher_id, period, type, overall_score, metadata)
  VALUES (
    gen_random_uuid(),
    _ben_id,
    daterange('2023-08-01', '2023-12-31', '[]'),
    'semester',
    4.18,
    jsonb_build_object(
      'cards', jsonb_build_object(
        'teaching_effectiveness', 4.35,
        'research_output', 4.1,
        'service_contribution', 4.0,
        'grant_funding', 4.25
      ),
      'radar', jsonb_build_object(
        'teaching', 4.35,
        'research', 4.1,
        'service', 4.0,
        'professional_development', 4.15
      )
    )
  );

  -- 2024 Spring (recovery)
  INSERT INTO evaluations (id, teacher_id, period, type, overall_score, metadata)
  VALUES (
    gen_random_uuid(),
    _ben_id,
    daterange('2024-01-01', '2024-06-01', '[]'),
    'semester',
    4.28,
    jsonb_build_object(
      'cards', jsonb_build_object(
        'teaching_effectiveness', 4.42,
        'research_output', 4.2,
        'service_contribution', 4.15,
        'grant_funding', 4.35
      ),
      'radar', jsonb_build_object(
        'teaching', 4.42,
        'research', 4.2,
        'service', 4.15,
        'professional_development', 4.25
      )
    )
  );

  -- 2024 Fall is already in 010_seed_three_teachers.sql with score 4.33

  -- =========================================================================
  -- PEIYAO YANG - Historical Evaluations (showing steady growth)
  -- =========================================================================
  
  -- 2023 Spring (good baseline)
  INSERT INTO evaluations (id, teacher_id, period, type, overall_score, metadata)
  VALUES (
    gen_random_uuid(),
    _peiyao_id,
    daterange('2023-01-01', '2023-06-01', '[]'),
    'semester',
    4.0,
    jsonb_build_object(
      'cards', jsonb_build_object(
        'teaching_effectiveness', 4.1,
        'research_output', 3.9,
        'service_contribution', 3.95,
        'grant_funding', 4.05
      ),
      'radar', jsonb_build_object(
        'teaching', 4.1,
        'research', 3.9,
        'service', 3.95,
        'professional_development', 4.0
      )
    )
  );

  -- 2023 Fall (steady improvement)
  INSERT INTO evaluations (id, teacher_id, period, type, overall_score, metadata)
  VALUES (
    gen_random_uuid(),
    _peiyao_id,
    daterange('2023-08-01', '2023-12-31', '[]'),
    'semester',
    4.08,
    jsonb_build_object(
      'cards', jsonb_build_object(
        'teaching_effectiveness', 4.18,
        'research_output', 3.95,
        'service_contribution', 4.0,
        'grant_funding', 4.2
      ),
      'radar', jsonb_build_object(
        'teaching', 4.18,
        'research', 3.95,
        'service', 4.0,
        'professional_development', 4.1
      )
    )
  );

  -- 2024 Spring (continued growth)
  INSERT INTO evaluations (id, teacher_id, period, type, overall_score, metadata)
  VALUES (
    gen_random_uuid(),
    _peiyao_id,
    daterange('2024-01-01', '2024-06-01', '[]'),
    'semester',
    4.15,
    jsonb_build_object(
      'cards', jsonb_build_object(
        'teaching_effectiveness', 4.25,
        'research_output', 4.0,
        'service_contribution', 4.1,
        'grant_funding', 4.25
      ),
      'radar', jsonb_build_object(
        'teaching', 4.25,
        'research', 4.0,
        'service', 4.1,
        'professional_development', 4.15
      )
    )
  );

  -- 2024 Fall is already in 010_seed_three_teachers.sql with score 4.23

  -- =========================================================================
  -- ALEX ZENG - Historical Evaluations (showing recent decline)
  -- =========================================================================
  
  -- 2023 Spring (strong start)
  INSERT INTO evaluations (id, teacher_id, period, type, overall_score, metadata)
  VALUES (
    gen_random_uuid(),
    _alex_id,
    daterange('2023-01-01', '2023-06-01', '[]'),
    'semester',
    3.75,
    jsonb_build_object(
      'cards', jsonb_build_object(
        'teaching_effectiveness', 3.9,
        'research_output', 3.7,
        'service_contribution', 3.65,
        'grant_funding', 3.75
      ),
      'radar', jsonb_build_object(
        'teaching', 3.9,
        'research', 3.7,
        'service', 3.65,
        'professional_development', 3.75
      )
    )
  );

  -- 2023 Fall (improvement)
  INSERT INTO evaluations (id, teacher_id, period, type, overall_score, metadata)
  VALUES (
    gen_random_uuid(),
    _alex_id,
    daterange('2023-08-01', '2023-12-31', '[]'),
    'semester',
    3.68,
    jsonb_build_object(
      'cards', jsonb_build_object(
        'teaching_effectiveness', 3.85,
        'research_output', 3.6,
        'service_contribution', 3.6,
        'grant_funding', 3.65
      ),
      'radar', jsonb_build_object(
        'teaching', 3.85,
        'research', 3.6,
        'service', 3.6,
        'professional_development', 3.7
      )
    )
  );

  -- 2024 Spring (slight decline)
  INSERT INTO evaluations (id, teacher_id, period, type, overall_score, metadata)
  VALUES (
    gen_random_uuid(),
    _alex_id,
    daterange('2024-01-01', '2024-06-01', '[]'),
    'semester',
    3.55,
    jsonb_build_object(
      'cards', jsonb_build_object(
        'teaching_effectiveness', 3.75,
        'research_output', 3.5,
        'service_contribution', 3.45,
        'grant_funding', 3.5
      ),
      'radar', jsonb_build_object(
        'teaching', 3.75,
        'research', 3.5,
        'service', 3.45,
        'professional_development', 3.5
      )
    )
  );

  -- 2024 Fall is already in 010_seed_three_teachers.sql with score 3.48

  RAISE NOTICE '✅ Historical evaluation data seeded successfully for 4 teachers';
END $$;


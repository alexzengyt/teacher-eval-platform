-- Seed data for Ben Wang, Peiyao Yang, and Alex Zeng
-- Run this after init.sql to add these three teachers with complete data

DO $seed_three_teachers$
DECLARE
  _ben_id UUID;
  _peiyao_id UUID;
  _alex_id UUID;
  _ben_eval_id UUID;
  _peiyao_eval_id UUID;
  _alex_eval_id UUID;
  _school_id UUID;
BEGIN
  -- Get school ID
  SELECT id INTO _school_id FROM schools LIMIT 1;

  -- ========== BEN WANG ==========
  -- Insert teacher
  INSERT INTO teachers (first_name, last_name, email, school_id, source)
  VALUES ('Ben', 'Wang', 'ben@springfield.edu', _school_id, 'manual')
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO _ben_id;
  
  IF _ben_id IS NULL THEN
    SELECT id INTO _ben_id FROM teachers WHERE email = 'ben@springfield.edu';
  END IF;

  -- Insert evaluation with metadata
  INSERT INTO evaluations (teacher_id, period, type, overall_score, metadata)
  VALUES (
    _ben_id,
    daterange(date(date_trunc('year', now())), date(date_trunc('year', now()) + INTERVAL '1 year'), '[]'),
    'annual',
    3.83,
    jsonb_build_object(
      'cards', jsonb_build_object(
        'teaching_effectiveness', 4.1,
        'research_output', 3.8,
        'service_contribution', 3.9,
        'grant_funding', 3.5
      ),
      'radar', jsonb_build_object(
        'teaching', 4.1,
        'research', 3.8,
        'service', 3.9,
        'professional_development', 3.9
      )
    )
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO _ben_eval_id;

  -- Insert courses and sections
  INSERT INTO courses (code, title, description, credits) VALUES
    ('BIO-101', 'Introduction to Biology', 'Fundamentals of biology', 4),
    ('BIO-201', 'Cell Biology', 'Advanced cell biology', 4)
  ON CONFLICT (code) DO NOTHING;

  INSERT INTO sections (course_id, term) VALUES
    ((SELECT id FROM courses WHERE code = 'BIO-101'), '2025-Spring'),
    ((SELECT id FROM courses WHERE code = 'BIO-201'), '2024-Fall')
  ON CONFLICT DO NOTHING;

  INSERT INTO teaching_assignments (teacher_id, section_id) VALUES
    (_ben_id, (SELECT s.id FROM sections s JOIN courses c ON s.course_id = c.id WHERE c.code = 'BIO-101' AND s.term = '2025-Spring')),
    (_ben_id, (SELECT s.id FROM sections s JOIN courses c ON s.course_id = c.id WHERE c.code = 'BIO-201' AND s.term = '2024-Fall'))
  ON CONFLICT DO NOTHING;

  -- Service activities
  INSERT INTO service_activities (teacher_id, activity_type, name, role, organization, start_date, hours, impact) VALUES
    (_ben_id, 'committee', 'Curriculum Committee', 'Member', NULL, '2023-09-01', 20.0, NULL),
    (_ben_id, 'community', 'Science Fair Judge', NULL, 'Regional Science Competition', '2024-05-15', NULL, 'Evaluated 25 student projects')
  ON CONFLICT DO NOTHING;

  -- Education history
  INSERT INTO education_history (teacher_id, degree, field, institution, graduation_year) VALUES
    (_ben_id, 'Ph.D.', 'Biology', 'University of Michigan', 2017),
    (_ben_id, 'B.S.', 'Biology', 'UCLA', 2012)
  ON CONFLICT DO NOTHING;

  -- Career history
  INSERT INTO career_history (teacher_id, position, institution, department, location, start_date, end_date, is_current, responsibilities, achievements) VALUES
    (_ben_id, 'Associate Professor', 'Northwestern University', 'Department of Statistics and Data Science', 'Evanston, IL', '2021-09-01', NULL, true, 'Teaching data science courses, research in statistical learning', 'Developed new online course curriculum'),
    (_ben_id, 'Assistant Professor', 'Northwestern University', 'Department of Statistics', 'Evanston, IL', '2017-08-01', '2021-08-31', false, 'Teaching statistics, conducting research', 'Published 10 papers, received teaching excellence award'),
    (_ben_id, 'Data Scientist', 'Microsoft Research', 'Machine Learning Group', 'Redmond, WA', '2015-06-01', '2017-07-31', false, 'Applied research in machine learning', 'Filed 2 patents, contributed to Azure ML platform')
  ON CONFLICT DO NOTHING;

  -- Awards
  INSERT INTO awards (teacher_id, title, organization, award_type, awarded_date, description) VALUES
    (_ben_id, 'Excellence in Teaching Award', 'Northwestern University', 'teaching', '2023-05-15', 'Outstanding teaching performance')
  ON CONFLICT DO NOTHING;

  -- ========== PEIYAO YANG ==========
  -- Insert teacher
  INSERT INTO teachers (first_name, last_name, email, school_id, source)
  VALUES ('Peiyao', 'Yang', 'peiyao@example.com', _school_id, 'manual')
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO _peiyao_id;
  
  IF _peiyao_id IS NULL THEN
    SELECT id INTO _peiyao_id FROM teachers WHERE email = 'peiyao@example.com';
  END IF;

  -- Insert evaluation with metadata
  INSERT INTO evaluations (teacher_id, period, type, overall_score, metadata)
  VALUES (
    _peiyao_id,
    daterange(date(date_trunc('year', now())), date(date_trunc('year', now()) + INTERVAL '1 year'), '[]'),
    'annual',
    3.70,
    jsonb_build_object(
      'cards', jsonb_build_object(
        'teaching_effectiveness', 4.4,
        'research_output', 3.5,
        'service_contribution', 3.7,
        'grant_funding', 3.2
      ),
      'radar', jsonb_build_object(
        'teaching', 4.4,
        'research', 3.5,
        'service', 3.7,
        'professional_development', 3.6
      )
    )
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO _peiyao_eval_id;

  -- Insert courses and sections
  INSERT INTO courses (code, title, description, credits) VALUES
    ('MATH-101', 'Calculus I', 'Introduction to calculus', 4),
    ('MATH-201', 'Calculus II', 'Advanced calculus', 4)
  ON CONFLICT (code) DO NOTHING;

  INSERT INTO sections (course_id, term) VALUES
    ((SELECT id FROM courses WHERE code = 'MATH-101'), '2024-Fall'),
    ((SELECT id FROM courses WHERE code = 'MATH-201'), '2025-Spring')
  ON CONFLICT DO NOTHING;

  INSERT INTO teaching_assignments (teacher_id, section_id) VALUES
    (_peiyao_id, (SELECT s.id FROM sections s JOIN courses c ON s.course_id = c.id WHERE c.code = 'MATH-101' AND s.term = '2024-Fall')),
    (_peiyao_id, (SELECT s.id FROM sections s JOIN courses c ON s.course_id = c.id WHERE c.code = 'MATH-201' AND s.term = '2025-Spring'))
  ON CONFLICT DO NOTHING;

  -- Service activities
  INSERT INTO service_activities (teacher_id, activity_type, name, role, start_date, hours) VALUES
    (_peiyao_id, 'committee', 'Assessment Committee', 'Member', '2024-01-15', 12.0),
    (_peiyao_id, 'community', 'Math Tutoring Program', NULL, '2024-03-01', NULL)
  ON CONFLICT DO NOTHING;

  -- Update community contribution with organization and impact
  UPDATE service_activities
  SET organization = 'Community Education Center', impact = 'Helped 12 students improve math skills'
  WHERE teacher_id = _peiyao_id AND name = 'Math Tutoring Program';

  -- Education history
  INSERT INTO education_history (teacher_id, degree, field, institution, graduation_year) VALUES
    (_peiyao_id, 'Ph.D.', 'Mathematics', 'MIT', 2018),
    (_peiyao_id, 'M.S.', 'Mathematics', 'Stanford University', 2014),
    (_peiyao_id, 'B.S.', 'Mathematics', 'Peking University', 2012)
  ON CONFLICT DO NOTHING;

  -- Career history
  INSERT INTO career_history (teacher_id, position, institution, department, location, start_date, end_date, is_current, responsibilities, achievements) VALUES
    (_peiyao_id, 'Assistant Professor', 'University of Chicago', 'Department of Economics', 'Chicago, IL', '2020-09-01', NULL, true, 'Teaching economics courses, research in behavioral economics', 'Published 8 papers, won junior faculty research grant'),
    (_peiyao_id, 'Postdoctoral Fellow', 'MIT', 'Department of Economics', 'Cambridge, MA', '2018-09-01', '2020-08-31', false, 'Research in experimental economics', 'Co-authored 4 publications'),
    (_peiyao_id, 'Research Assistant', 'University of California, Berkeley', 'Haas School of Business', 'Berkeley, CA', '2016-09-01', '2018-08-31', false, 'Assisted with behavioral economics research', 'Contributed to 3 published studies')
  ON CONFLICT DO NOTHING;

  -- ========== ALEX ZENG ==========
  -- Insert teacher
  INSERT INTO teachers (first_name, last_name, email, school_id, source)
  VALUES ('Alex', 'Zeng', 'alex@example.com', _school_id, 'manual')
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO _alex_id;
  
  IF _alex_id IS NULL THEN
    SELECT id INTO _alex_id FROM teachers WHERE email = 'alex@example.com';
  END IF;

  -- Insert evaluation with metadata
  INSERT INTO evaluations (teacher_id, period, type, overall_score, metadata)
  VALUES (
    _alex_id,
    daterange(date(date_trunc('year', now())), date(date_trunc('year', now()) + INTERVAL '1 year'), '[]'),
    'annual',
    3.48,
    jsonb_build_object(
      'cards', jsonb_build_object(
        'teaching_effectiveness', 4.2,
        'research_output', 3.3,
        'service_contribution', 3.4,
        'grant_funding', 3.0
      ),
      'radar', jsonb_build_object(
        'teaching', 4.2,
        'research', 3.3,
        'service', 3.4,
        'professional_development', 3.3
      )
    )
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO _alex_eval_id;

  -- Insert courses and sections
  INSERT INTO courses (code, title, description, credits) VALUES
    ('CS-101', 'Intro to Programming', 'Introduction to programming', 4),
    ('CS-201', 'Data Structures', 'Data structures and algorithms', 4)
  ON CONFLICT (code) DO NOTHING;

  INSERT INTO sections (course_id, term) VALUES
    ((SELECT id FROM courses WHERE code = 'CS-101'), '2025-Spring'),
    ((SELECT id FROM courses WHERE code = 'CS-201'), '2024-Fall')
  ON CONFLICT DO NOTHING;

  INSERT INTO teaching_assignments (teacher_id, section_id) VALUES
    (_alex_id, (SELECT s.id FROM sections s JOIN courses c ON s.course_id = c.id WHERE c.code = 'CS-101' AND s.term = '2025-Spring')),
    (_alex_id, (SELECT s.id FROM sections s JOIN courses c ON s.course_id = c.id WHERE c.code = 'CS-201' AND s.term = '2024-Fall'))
  ON CONFLICT DO NOTHING;

  -- Service activities
  INSERT INTO service_activities (teacher_id, activity_type, name, role, organization, start_date, hours, impact) VALUES
    (_alex_id, 'committee', 'Academic Standards Committee', 'Member', NULL, '2023-09-01', 18.0, NULL),
    (_alex_id, 'committee', 'Curriculum Committee', 'Chair', NULL, '2023-09-01', 0, NULL),
    (_alex_id, 'community', 'Coding Bootcamp for Teens', NULL, 'Youth Coding Academy', '2024-07-01', NULL, 'Taught 20+ teenagers programming basics'),
    (_alex_id, 'community', 'Code for Kids Workshop', NULL, 'Community Learning Center', '2024-06-01', NULL, 'Introduced 15 kids to coding concepts')
  ON CONFLICT DO NOTHING;

  -- Education history
  INSERT INTO education_history (teacher_id, degree, field, institution, graduation_year) VALUES
    (_alex_id, 'Ph.D.', 'Information Science', 'University of Washington', 2017),
    (_alex_id, 'M.S.', 'Computer Science', 'Carnegie Mellon University', 2013),
    (_alex_id, 'B.S.', 'Computer Science', 'Tsinghua University', 2011)
  ON CONFLICT DO NOTHING;

  -- Career history
  INSERT INTO career_history (teacher_id, position, institution, department, location, start_date, end_date, is_current, responsibilities, achievements) VALUES
    (_alex_id, 'Assistant Professor', 'University of Michigan', 'School of Information', 'Ann Arbor, MI', '2021-08-01', NULL, true, 'Teaching information systems, research in HCI', 'Launched new course on UX design'),
    (_alex_id, 'Lecturer', 'University of Michigan', 'School of Information', 'Ann Arbor, MI', '2019-08-01', '2021-07-31', false, 'Teaching undergraduate courses', 'Received outstanding teaching award'),
    (_alex_id, 'UX Researcher', 'Google', 'User Experience Research', 'Mountain View, CA', '2017-06-01', '2019-07-31', false, 'Conducted user research for Google products', 'Led 10+ major research studies')
  ON CONFLICT DO NOTHING;

  -- Awards
  INSERT INTO awards (teacher_id, title, organization, award_type, awarded_date, description) VALUES
    (_alex_id, 'Outstanding Teaching Award', 'University of Michigan', 'teaching', '2022-05-10', 'Excellence in undergraduate teaching')
  ON CONFLICT DO NOTHING;

  -- PD courses for Alex
  INSERT INTO pd_courses (teacher_id, course_name, provider, hours, completed_date) VALUES
    (_alex_id, 'Advanced HCI Methods', 'ACM', 15.0, '2023-08-20'),
    (_alex_id, 'Teaching Large Classes Effectively', 'University of Michigan', 10.0, '2023-06-15')
  ON CONFLICT DO NOTHING;

END
$seed_three_teachers$ LANGUAGE plpgsql;


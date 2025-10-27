-- ============================================================
-- Seed Data 009: Service, Professional, and Career Data
-- Purpose: Populate demo data for Multi-Tab Evaluation Interface
-- Date: January 2025
-- ============================================================

-- This script populates the new tables with realistic demo data
-- for the existing teacher "Alice Chen" (alice@example.edu)

DO $seed_data$
DECLARE
  _alice_id UUID;
BEGIN
  -- Get Alice Chen's teacher ID
  SELECT id INTO _alice_id 
  FROM teachers 
  WHERE email = 'alice@example.edu' 
  LIMIT 1;

  IF _alice_id IS NULL THEN
    RAISE NOTICE '⚠️  Teacher Alice Chen not found. Skipping seed data.';
    RETURN;
  END IF;

  RAISE NOTICE '📝 Seeding data for teacher: Alice Chen (ID: %)', _alice_id;

  -- ============================================================
  -- 1. SERVICE ACTIVITIES
  -- ============================================================
  
  -- Committee Work
  INSERT INTO service_activities (teacher_id, activity_type, name, role, organization, start_date, end_date, hours, description, impact)
  VALUES 
    (_alice_id, 'committee', 'Curriculum Development Committee', 'Member', 'Economics Department', '2024-09-01', NULL, 20, 
     'Participate in reviewing and updating undergraduate curriculum for economics courses', 
     'Helped redesign 3 core courses to incorporate data analytics'),
    
    (_alice_id, 'committee', 'Faculty Senate', 'Representative', 'University Senate', '2023-09-01', NULL, 35,
     'Represent the Economics Department in university-wide governance', 
     'Advocated for increased research funding allocation'),
    
    (_alice_id, 'committee', 'Student Affairs Committee', 'Chair', 'College of Business', '2024-01-15', '2024-12-31', 45,
     'Lead committee addressing student academic concerns and policy recommendations',
     'Implemented new mentorship program serving 80+ students'),
    
    (_alice_id, 'department', 'Graduate Admissions Committee', 'Member', 'Economics Department', '2023-01-01', '2023-12-31', 15,
     'Review and evaluate graduate school applications',
     'Reviewed 120+ applications, selected 12 top candidates');

  -- Community Service
  INSERT INTO service_activities (teacher_id, activity_type, name, role, organization, start_date, end_date, hours, description, impact)
  VALUES 
    (_alice_id, 'community', 'Guest Lecture Series', 'Speaker', 'Lincoln High School', '2024-11-15', '2024-11-15', 2,
     'Delivered guest lecture on "Economics in Everyday Life" to high school students',
     'Reached 150 students, inspired 12 to pursue economics'),
    
    (_alice_id, 'community', 'Career Fair Volunteer', 'Mentor', 'City Career Center', '2024-10-20', '2024-10-20', 4,
     'Provided career guidance and mentorship to local students',
     'Mentored 30+ students, provided resume reviews'),
    
    (_alice_id, 'community', 'Community Education Workshop', 'Instructor', 'Public Library', '2024-09-10', '2024-09-10', 3,
     'Led workshop on "Understanding Personal Finance and Investment"',
     '75 attendees, 95% positive feedback');

  -- Professional Organizations
  INSERT INTO service_activities (teacher_id, activity_type, name, role, organization, start_date, end_date, hours, description, impact)
  VALUES 
    (_alice_id, 'professional_org', 'American Economic Association', 'Session Chair', 'AEA Annual Meeting', '2024-01-05', '2024-01-07', 8,
     'Chaired session on behavioral economics research',
     'Facilitated discussion among 6 presenters and 50+ attendees'),
    
    (_alice_id, 'professional_org', 'Journal of Economic Behavior', 'Reviewer', 'Academic Journal', '2023-01-01', NULL, 25,
     'Peer review manuscripts for publication',
     'Reviewed 8 manuscripts, maintaining high standards');

  RAISE NOTICE '✅ Inserted % service activities', 
    (SELECT COUNT(*) FROM service_activities WHERE teacher_id = _alice_id);

  -- ============================================================
  -- 2. EDUCATION HISTORY
  -- ============================================================
  
  INSERT INTO education_history (teacher_id, degree, field, institution, location, graduation_year, gpa, honors, thesis_title, advisor)
  VALUES 
    (_alice_id, 'Ph.D.', 'Economics', 'Stanford University', 'Stanford, CA', 2018, 3.92, 'Distinction',
     'Behavioral Economics and Decision-Making Under Uncertainty', 'Prof. Robert Wilson'),
    
    (_alice_id, 'M.A.', 'Economics', 'UC Berkeley', 'Berkeley, CA', 2014, 3.88, NULL,
     'The Impact of Information Asymmetry on Market Efficiency', 'Prof. George Akerlof'),
    
    (_alice_id, 'B.A.', 'Business Administration', 'UCLA', 'Los Angeles, CA', 2012, 3.95, 'Summa Cum Laude',
     NULL, NULL);

  RAISE NOTICE '✅ Inserted % education records', 
    (SELECT COUNT(*) FROM education_history WHERE teacher_id = _alice_id);

  -- ============================================================
  -- 3. CAREER HISTORY
  -- ============================================================
  
  INSERT INTO career_history (teacher_id, position, institution, department, location, start_date, end_date, is_current, responsibilities, achievements)
  VALUES 
    (_alice_id, 'Associate Professor', 'Current University', 'Department of Economics', 'City, State', 
     '2020-09-01', NULL, true,
     'Teaching undergraduate and graduate courses in microeconomics and behavioral economics. Conducting research on decision-making and market behavior. Mentoring Ph.D. students.',
     'Published 8 peer-reviewed articles. Received Excellence in Teaching Award (2024). Secured $250k in research funding.'),
    
    (_alice_id, 'Assistant Professor', 'Current University', 'Department of Economics', 'City, State',
     '2018-09-01', '2020-08-31', false,
     'Teaching core economics courses. Establishing research program in behavioral economics. Serving on department committees.',
     'Published 5 articles in top-tier journals. Developed new undergraduate course in behavioral economics.'),
    
    (_alice_id, 'Postdoctoral Researcher', 'Stanford University', 'Department of Economics', 'Stanford, CA',
     '2016-09-01', '2018-08-31', false,
     'Conducting independent research on experimental economics. Collaborating with faculty on grant proposals.',
     'Co-authored 3 papers. Secured postdoctoral fellowship worth $120k.'),
    
    (_alice_id, 'Ph.D. Candidate', 'Stanford University', 'Department of Economics', 'Stanford, CA',
     '2012-09-01', '2016-08-31', false,
     'Conducting dissertation research. Teaching assistant for undergraduate courses. Participating in research seminars.',
     'Completed dissertation with distinction. Won Best Ph.D. Paper Award (2016).');

  RAISE NOTICE '✅ Inserted % career history records', 
    (SELECT COUNT(*) FROM career_history WHERE teacher_id = _alice_id);

  -- ============================================================
  -- 4. AWARDS
  -- ============================================================
  
  INSERT INTO awards (teacher_id, title, organization, award_type, awarded_date, amount, description, significance)
  VALUES 
    (_alice_id, 'Excellence in Teaching Award', 'University Faculty Association', 'teaching', 
     '2024-05-15', 5000.00,
     'Recognized for outstanding teaching performance, student engagement, and innovative pedagogy',
     'Top teaching award at university level, selected from 500+ faculty'),
    
    (_alice_id, 'Best Paper Award', 'International Economics Conference', 'research',
     '2023-11-20', NULL,
     'Best paper award for research on behavioral economics and market microstructure',
     'Competitive international conference with 300+ submissions'),
    
    (_alice_id, 'Early Career Research Award', 'American Economic Association', 'research',
     '2022-08-01', 10000.00,
     'Recognizes exceptional research contributions by early-career economists',
     'Prestigious national award, 5 recipients per year'),
    
    (_alice_id, 'Outstanding Service Award', 'College of Business', 'service',
     '2024-04-10', NULL,
     'Recognition for exceptional service to the college through committee work and student mentorship',
     'Selected by faculty peers'),
    
    (_alice_id, 'Best Dissertation Award', 'Stanford Economics Department', 'research',
     '2016-06-15', 2500.00,
     'Best doctoral dissertation in economics',
     'Top dissertation among 15 graduates');

  RAISE NOTICE '✅ Inserted % awards', 
    (SELECT COUNT(*) FROM awards WHERE teacher_id = _alice_id);

  -- ============================================================
  -- 5. GRANTS
  -- ============================================================
  
  INSERT INTO grants (teacher_id, title, funding_agency, grant_type, amount, start_date, end_date, status, role, description, outcomes)
  VALUES 
    (_alice_id, 'Behavioral Economics in Digital Markets', 'National Science Foundation', 'Research',
     250000.00, '2023-09-01', '2026-08-31', 'active', 'PI',
     'Three-year research project investigating decision-making behavior in online marketplaces and digital platforms',
     'Published 2 papers so far, presented at 5 conferences'),
    
    (_alice_id, 'Teaching Innovation in Economics', 'University Teaching Enhancement Fund', 'Teaching',
     15000.00, '2024-01-01', '2024-12-31', 'active', 'PI',
     'Develop and implement innovative teaching methods using data analytics and real-time market simulations',
     'Developed new course materials, piloted in 3 classes'),
    
    (_alice_id, 'Experimental Economics Laboratory Equipment', 'College Research Fund', 'Equipment',
     35000.00, '2023-01-01', '2023-12-31', 'completed', 'PI',
     'Purchase equipment for experimental economics research including eye-tracking and physiological monitoring',
     'Lab established, serving 4 faculty members and 12 graduate students'),
    
    (_alice_id, 'Market Microstructure and Information Dynamics', 'Sloan Foundation', 'Research',
     80000.00, '2021-09-01', '2023-08-31', 'completed', 'Co-PI',
     'Collaborative research on information flow and price discovery in financial markets',
     'Published 4 papers, mentored 2 Ph.D. students'),
    
    (_alice_id, 'Graduate Student Summer Research Support', 'Economics Department', 'Training',
     12000.00, '2024-06-01', '2024-08-31', 'completed', 'PI',
     'Fund summer research for two graduate students working on behavioral economics projects',
     'Both students presented at conferences, 1 paper submitted');

  RAISE NOTICE '✅ Inserted % grants', 
    (SELECT COUNT(*) FROM grants WHERE teacher_id = _alice_id);

  -- ============================================================
  -- Summary
  -- ============================================================
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Seed data insertion completed successfully!';
  RAISE NOTICE '📊 Summary for Alice Chen:';
  RAISE NOTICE '   - Service Activities: %', (SELECT COUNT(*) FROM service_activities WHERE teacher_id = _alice_id);
  RAISE NOTICE '   - Education Records: %', (SELECT COUNT(*) FROM education_history WHERE teacher_id = _alice_id);
  RAISE NOTICE '   - Career Positions: %', (SELECT COUNT(*) FROM career_history WHERE teacher_id = _alice_id);
  RAISE NOTICE '   - Awards: %', (SELECT COUNT(*) FROM awards WHERE teacher_id = _alice_id);
  RAISE NOTICE '   - Grants: %', (SELECT COUNT(*) FROM grants WHERE teacher_id = _alice_id);
  RAISE NOTICE '';

END $seed_data$;

-- ============================================================
-- Verify data insertion
-- ============================================================
DO $verify$
BEGIN
  RAISE NOTICE '🔍 Verification:';
  RAISE NOTICE '   Total service_activities: %', (SELECT COUNT(*) FROM service_activities);
  RAISE NOTICE '   Total education_history: %', (SELECT COUNT(*) FROM education_history);
  RAISE NOTICE '   Total career_history: %', (SELECT COUNT(*) FROM career_history);
  RAISE NOTICE '   Total awards: %', (SELECT COUNT(*) FROM awards);
  RAISE NOTICE '   Total grants: %', (SELECT COUNT(*) FROM grants);
END $verify$;


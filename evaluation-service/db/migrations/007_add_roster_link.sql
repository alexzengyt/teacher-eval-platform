-- 007_add_roster_link.sql
-- Purpose: Add a nullable link from evaluation.teachers -> roster_teachers
-- Enables tagging/filtering "from roster" in the UI later.

ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS roster_source_id TEXT;

CREATE INDEX IF NOT EXISTS idx_teachers_roster_source_id
  ON public.teachers (roster_source_id);

COMMENT ON COLUMN public.teachers.roster_source_id
  IS 'ID of roster_teachers row this teacher came from; nullable. No FK yet (type uncertainty).';

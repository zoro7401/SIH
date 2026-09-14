-- Student onboarding questionnaire — a one-time, qualitative self-report
-- shown right after a student signs up. Separate from skill_profile
-- (assessment_questions_schema.sql / assessments_schema.sql), which is
-- scored/verified data; this is unscored self-report that enriches the
-- portfolio card. Run this after schema.sql (users table must already exist).

CREATE TABLE IF NOT EXISTS onboarding_responses (
  student_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  field_of_study VARCHAR(255) NOT NULL,
  -- Skill names, not ids — this codebase has no standalone `skills` table;
  -- skill_profile/skill_test_results already key on skill_name (VARCHAR),
  -- so confident/struggle skills reuse that same vocabulary for consistency.
  -- Free-text entries (skills outside the canonical list) are stored the
  -- same way, as plain strings.
  confident_skills JSONB NOT NULL DEFAULT '[]',
  struggle_skills JSONB NOT NULL DEFAULT '[]',
  -- Array of 'Internship' | 'Full-time job' | 'Apprenticeship' | 'Learning
  -- program' | 'Not sure yet' — a student can be interested in more than
  -- one. Validated in onboardingController.js rather than a CHECK, same as
  -- confident/struggle_skills, since Postgres CHECK can't easily constrain
  -- every element of a JSONB array.
  interest_types JSONB NOT NULL DEFAULT '[]',
  highlight VARCHAR(120),
  completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

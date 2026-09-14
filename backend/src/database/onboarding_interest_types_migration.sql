-- Converts onboarding_responses.interest_type (single VARCHAR) into
-- interest_types (JSONB array) so a student can select more than one
-- opportunity type. Safe to run against an existing database that still has
-- the old column — a no-op if it's already been converted or the table was
-- created fresh with interest_types (see onboarding_schema.sql).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_responses' AND column_name = 'interest_type'
  ) THEN
    ALTER TABLE onboarding_responses DROP CONSTRAINT IF EXISTS onboarding_responses_interest_type_check;
    ALTER TABLE onboarding_responses RENAME COLUMN interest_type TO interest_types;
    ALTER TABLE onboarding_responses ALTER COLUMN interest_types TYPE JSONB USING to_jsonb(ARRAY[interest_types]);
    ALTER TABLE onboarding_responses ALTER COLUMN interest_types SET DEFAULT '[]'::jsonb;
  END IF;
END $$;

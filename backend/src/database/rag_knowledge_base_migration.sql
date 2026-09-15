-- ============================================================
-- RAG Knowledge Base Migration
-- Run this in the Supabase SQL editor (Project > SQL Editor)
-- ============================================================

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Create the knowledge base table
CREATE TABLE IF NOT EXISTS advisor_knowledge_base (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 'skill_explainer' | 'career_role'
  category           text NOT NULL CHECK (category IN ('skill_explainer', 'career_role')),
  skill_or_role_name text NOT NULL,
  content            text NOT NULL,
  -- 768 dims = Google text-embedding-004 output dimension
  embedding          vector(768),
  created_at         timestamp with time zone DEFAULT now()
);

-- Step 3: HNSW index for fast cosine similarity search
-- HNSW is preferred over IVFFlat for small tables (<100 rows): no
-- minimum row count requirement and better recall at this scale.
CREATE INDEX IF NOT EXISTS advisor_knowledge_base_embedding_idx
  ON advisor_knowledge_base
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Step 4: Unique constraint so the seed script can upsert idempotently
ALTER TABLE advisor_knowledge_base
  DROP CONSTRAINT IF EXISTS advisor_knowledge_base_name_category_unique;

ALTER TABLE advisor_knowledge_base
  ADD CONSTRAINT advisor_knowledge_base_name_category_unique
  UNIQUE (skill_or_role_name, category);

-- Step 5: RPC function for vector similarity match
CREATE OR REPLACE FUNCTION match_advisor_knowledge (
  query_embedding vector(768),
  match_count int DEFAULT 4
)
RETURNS TABLE (
  id uuid,
  category text,
  skill_or_role_name text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    akb.id,
    akb.category,
    akb.skill_or_role_name,
    akb.content,
    1 - (akb.embedding <=> query_embedding) AS similarity
  FROM advisor_knowledge_base akb
  WHERE akb.embedding IS NOT NULL
  ORDER BY akb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

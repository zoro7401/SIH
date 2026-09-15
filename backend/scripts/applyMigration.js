// backend/scripts/applyMigration.js
// One-time script to apply the RAG knowledge base migration.
// Run from the backend directory: node scripts/applyMigration.js
import dotenv from "dotenv";
dotenv.config();

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/rest\/v1\/?$/i, "");

const STATEMENTS = [
  `CREATE EXTENSION IF NOT EXISTS vector`,
  `CREATE TABLE IF NOT EXISTS advisor_knowledge_base (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category           text NOT NULL CHECK (category IN ('skill_explainer', 'career_role')),
    skill_or_role_name text NOT NULL,
    content            text NOT NULL,
    embedding          vector(768),
    created_at         timestamp with time zone DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS advisor_knowledge_base_embedding_idx
    ON advisor_knowledge_base
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)`,
  `ALTER TABLE advisor_knowledge_base
    DROP CONSTRAINT IF EXISTS advisor_knowledge_base_name_category_unique`,
  `ALTER TABLE advisor_knowledge_base
    ADD CONSTRAINT advisor_knowledge_base_name_category_unique
    UNIQUE (skill_or_role_name, category)`,
];

async function execSQL(sql) {
  // Supabase service role can execute arbitrary SQL via the pg REST proxy
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql_query: sql }),
  });
  const text = await res.text();
  if (!res.ok && !text.includes("already exists") && !text.includes("does not exist")) {
    throw new Error(`SQL failed (${res.status}): ${text.slice(0, 400)}`);
  }
  return text;
}

// Alternative: use Supabase's pg endpoint if exec_sql RPC isn't available
async function execSQLViaPg(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "X-Client-Info": "migration-script",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function main() {
  console.log("Supabase URL:", SUPABASE_URL);
  console.log("Service key present:", !!SERVICE_KEY);

  for (const stmt of STATEMENTS) {
    const preview = stmt.trim().split("\n")[0].trim().slice(0, 60);
    try {
      const result = await execSQL(stmt);
      console.log(`OK: ${preview}... -> ${result.slice(0, 80)}`);
    } catch (err) {
      console.warn(`WARN: ${preview}... -> ${err.message.slice(0, 120)}`);
    }
  }
  console.log("\nMigration complete. Verify table in Supabase dashboard > Table Editor.");
}

main().catch(console.error);

# SkillBridge — Academia–Industry Skill Intelligence Portal

A platform connecting students, academic institutions, and industry recruiters through verified skill assessments, AI-driven career guidance, and a matched-opportunity marketplace.

## Overview

Students build a verified skill profile through assessments and portfolio evidence, get matched to internships/jobs by real skill fit, and get AI-backed career advice grounded in their own data. Industry users post opportunities, review matched candidates, and manage their hiring pipeline.

## Tech Stack

**Frontend** — React 18 + Vite, React Router, Tailwind CSS, Phosphor Icons
**Backend** — Node.js + Express, Supabase (Postgres + Auth), JWT (cookie-based sessions)
**AI** — Google Gemini, called only from the backend (the API key never reaches the browser)

## Project Structure

```
frontend/   React SPA (student, industry, admin, and public pages)
backend/    Express API (auth, assessments, portfolio, messages, industry, AI advisor)
render.yaml Render deployment config for the backend
```

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project (Postgres + Auth)
- A Google Gemini API key (for the AI Career Advisor)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in Supabase, JWT, Gemini, and frontend URL values
npm run dev             # http://localhost:5000
```

Run the SQL files in `backend/src/database/` against your Supabase project, in order:
`schema.sql` → `assessments_schema.sql` → `full_migration_schema.sql` → `settings_schema.sql` → `onboarding_schema.sql` → `onboarding_interest_types_migration.sql`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # fill in VITE_API_URL and VITE_SUPABASE_* values
npm run dev              # http://localhost:5173
```

## Deployment

- **Backend**: deployed via `render.yaml` (Render). Set the `sync: false` environment variables (Supabase keys, Gemini key) in the Render dashboard — they are never committed to source.
- **Frontend**: static build (`npm run build`) deployable to Vercel or any static host; `vercel.json` includes the SPA rewrite.

## Security Notes

- The Gemini API key lives only on the backend; the frontend calls `/api/ai-advisor/ask`, which proxies to Gemini server-side.
- Auth uses an HttpOnly cookie set by the backend — never stored in `localStorage`.
- No secrets are committed to this repository; see each `.env.example` for required variables.

## License

Proprietary — Smart India Hackathon 2026 submission.

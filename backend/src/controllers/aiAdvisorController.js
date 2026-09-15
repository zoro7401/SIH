import { supabase } from "../config/supabase.js";
import { resolveUserId } from "../utils/resolveUserId.js";
import { generateEmbedding } from "../utils/generateEmbedding.js";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const GROQ_MODELS = (process.env.GROQ_MODELS || GROQ_MODEL)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OPENROUTER_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "deepseek/deepseek-r1-0528:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
];
const FREE_OPENROUTER_MODELS = (process.env.OPENROUTER_MODELS || process.env.OPENROUTER_MODEL)
  ? (process.env.OPENROUTER_MODELS || process.env.OPENROUTER_MODEL)
      .split(",")
      .map((model) => model.trim())
      .filter((model) => model.endsWith(":free"))
  : DEFAULT_OPENROUTER_MODELS;
const OPENROUTER_MODEL = FREE_OPENROUTER_MODELS[0] || "nvidia/nemotron-3-super-120b-a12b:free";

// How many prior turns (user+assistant messages combined) to replay to
// Gemini as conversation history so a follow-up like "tell me more about
// that" resolves with context, without the prompt growing unbounded.
const HISTORY_TURNS = 8;

const SYSTEM_PROMPT = `You are the AI Career Advisor inside SkillBridge, a student skill-and-placement platform.

You will receive two clearly labelled sections in every prompt:
- "STUDENT'S VERIFIED DATA": the student's real, live data — readiness percentage, matched skills, missing skills, and their full verified score profile.
- "RELEVANT KNOWLEDGE": general explanations of skills and career roles retrieved from the platform's knowledge base.

Ground rules:
- Be concise and encouraging, not generic. Reference the student's actual numbers (e.g. "You're at 72% readiness for Data Analyst").
- Structure your answer roughly as: current readiness -> skills they already have -> skills they still need -> 2-4 concrete recommended next steps (in priority order).
- If they ask about a role that isn't in the provided target-role data, say you can only give a data-backed answer for a role they've selected as their target on the platform, and suggest they set it there first.
- You RECOMMEND. You do not verify skills or make placement decisions — final verification always comes from real assessments, projects, or institution/industry review, not from you. Say this if it's relevant to the question.
- Keep responses under ~180 words unless the student asks for more detail.
- Reply in PLAIN TEXT only — no markdown (no **bold**, no # headers, no markdown bullet syntax). Use line breaks and plain "-" or numbered lists if you need structure; the UI renders your response as plain text exactly as written.

RAG grounding rules (IMPORTANT):
- Numeric or factual claims about THIS student (scores, readiness %, skill names, role) must come ONLY from the "STUDENT'S VERIFIED DATA" section. Never invent or modify these numbers.
- The "RELEVANT KNOWLEDGE" section explains concepts, skills, and roles in general terms — use it to enrich explanations and first-step recommendations, but NEVER present it as a fact specific to this student.
- If the retrieved knowledge does not clearly relate to the student's question, IGNORE IT entirely rather than forcing a connection.`;

// GET /api/ai-advisor/history — the persisted conversation, oldest first, so
// reopening /ai-advisor renders where the student left off instead of always
// starting empty.
export const getConversationHistory = async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return res.status(404).json({ error: "User not found" });

    const { data, error } = await supabase
      .from("ai_advisor_messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Fetch AI advisor history error:", error);
      return res.status(500).json({ error: "Failed to load conversation history" });
    }

    res.status(200).json({
      messages: data.map((m) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.created_at })),
    });
  } catch (error) {
    console.error("Get AI advisor history error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE /api/ai-advisor/history — clears all messages for the current user
export const clearConversationHistory = async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return res.status(404).json({ error: "User not found" });

    const { error } = await supabase
      .from("ai_advisor_messages")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Clear AI advisor history error:", error);
      return res.status(500).json({ error: "Failed to clear conversation history" });
    }

    res.status(200).json({ success: true, message: "Conversation history cleared" });
  } catch (error) {
    console.error("Clear AI advisor history error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// The frontend sends the student's real data (readiness %, matched/missing
// skills, target role) rather than the backend re-deriving it — that data
// lives in the frontend's skill-profile/career-role services (localStorage +
// Supabase-backed skill tests), not in a backend table the server can query
// independently. This keeps the advisor grounded in real numbers without
// requiring a second copy of that logic server-side.
export const askCareerAdvisor = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "AI Career Advisor is not configured on the server." });
    }

    const userId = await resolveUserId(req);
    if (!userId) return res.status(404).json({ error: "User not found" });

    const { message, context } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "A message is required." });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: "Message is too long (max 1000 characters)." });
    }
    const trimmedMessage = message.trim();

    // Recent turns for context, oldest-first, capped at HISTORY_TURNS so the
    // request doesn't grow unbounded over a long-running conversation.
    const { data: recentHistory, error: historyError } = await supabase
      .from("ai_advisor_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_TURNS);
    if (historyError) console.error("Fetch AI advisor recent history error:", historyError); // non-fatal — fall back to no history

    const history = (recentHistory ?? []).slice().reverse();

    // ── RAG: embed question + retrieve top-4 knowledge base entries ──────────
    let ragSection = "";
    try {
      const t0 = Date.now();
      const questionEmbedding = await generateEmbedding(trimmedMessage);
      const embedMs = Date.now() - t0;

      const t1 = Date.now();
      const { data: kbRows, error: kbError } = await supabase.rpc(
        "match_advisor_knowledge",
        {
          query_embedding: questionEmbedding,
          match_count: 4,
        }
      );
      const searchMs = Date.now() - t1;

      console.log(`[RAG] embed: ${embedMs}ms | search: ${searchMs}ms | total retrieval: ${embedMs + searchMs}ms`);

      if (kbError) {
        console.warn("[RAG] KB search error (degrading gracefully):", kbError.message);
      } else if (kbRows && kbRows.length > 0) {
        ragSection =
          "\n\n=== RELEVANT KNOWLEDGE ===\n" +
          kbRows
            .map((row) => `[${row.skill_or_role_name}]: ${row.content}`)
            .join("\n\n");
      }
    } catch (ragErr) {
      // RAG failure is non-fatal — advisor still answers from verified student data
      console.warn("[RAG] Retrieval failed (degrading gracefully):", ragErr.message);
    }
    // ─────────────────────────────────────────────────────────────────────────

    const contextSummary = buildContextSummary(context);
    const prompt =
      `=== STUDENT'S VERIFIED DATA ===\n${contextSummary}` +
      ragSection +
      `\n\nStudent's question:\n${trimmedMessage}`;

    let reply = null;
    let upstreamError = null;

    if (apiKey) {
      ({ reply, error: upstreamError } = await callGemini(apiKey, prompt, history));
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!reply && groqKey) {
      console.warn("[AI Advisor] Gemini unavailable, falling back to Groq. Upstream error:", upstreamError);
      ({ reply, error: upstreamError } = await callGroqAdvisor(groqKey, prompt, history));
    }

    if (!reply) {
      console.error("All AI Advisor providers failed:", upstreamError);
      return res.status(502).json({ error: "AI Career Advisor is temporarily unavailable. Please try again in a moment." });
    }

    // Persist both turns. Best-effort: if this fails the student still gets
    // their reply, they just won't see it on next reload — not worth
    // failing an otherwise-successful answer over.
    const { error: saveError } = await supabase.from("ai_advisor_messages").insert([
      { user_id: userId, role: "user", content: trimmedMessage },
      { user_id: userId, role: "assistant", content: reply },
    ]);
    if (saveError) console.error("Save AI advisor turn error:", saveError);

    res.status(200).json({ reply });
  } catch (error) {
    console.error("AI advisor error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const generateSkillRoadmap = async (req, res) => {
  try {
    const { skill, currentLevel, format = "roadmap" } = req.body;
    if (!skill || typeof skill !== "string" || skill.length > 150) {
      return res.status(400).json({ error: "A valid skill is required." });
    }
    if (!["module", "roadmap"].includes(format)) {
      return res.status(400).json({ error: "Format must be module or roadmap." });
    }

    const skillName = skill.trim();
    const prompt = buildRoadmapPrompt(skillName, currentLevel, format);
    const groqKey = process.env.GROQ_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    let roadmap = null;
    let provider = null;
    let model = null;
    let upstreamError = null;

    if (groqKey) {
      ({ roadmap, error: upstreamError } = await callGroqRoadmap(groqKey, prompt));
      if (roadmap) {
        provider = "groq";
        model = GROQ_MODELS.join(", ");
      }
    }
    if (!roadmap && openRouterKey) {
      ({ roadmap, error: upstreamError } = await callOpenRouter(openRouterKey, prompt));
      if (roadmap) {
        provider = "openrouter";
        model = OPENROUTER_MODEL;
      }
    }
    if (!roadmap && geminiKey) {
      ({ roadmap, error: upstreamError } = await callGeminiRoadmap(geminiKey, prompt));
      if (roadmap) {
        provider = "gemini";
        model = GEMINI_MODEL;
      }
    }
    if (!roadmap) {
      console.error("Roadmap generation failed:", upstreamError);
      return res.status(503).json({ error: "Roadmap generation is temporarily unavailable." });
    }

    res.status(200).json({ roadmap, provider, model, cached: false });
  } catch (error) {
    console.error("Roadmap generation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// How close together (ms) two skill_test_results rows' completed_at values
// must be to count as the "same run" — DynamicTestRun submits every
// selected skill within milliseconds of each other (Promise.all), so a
// generous 2-minute window comfortably covers one run without pulling in an
// unrelated earlier retake of some other skill.
const SAME_RUN_WINDOW_MS = 2 * 60 * 1000;

// GET /api/ai-advisor/analyze-latest-run
// Analyzes the student's most recently completed skill-test run (one or more
// skills submitted together from DynamicTestRun.jsx) — strengths, weaknesses,
// and an improvement roadmap grounded in the actual scores and per-level
// (beginner/intermediate/advanced) breakdowns, never invented. Reuses the
// same OpenRouter/Gemini JSON-mode call path as generateSkillRoadmap.
export const analyzeLatestSkillRun = async (req, res) => {
  try {
    const shouldGenerate = req.query.generate === "true";
    const userId = await resolveUserId(req);
    if (!userId) return res.status(404).json({ error: "User not found" });

    const { data: recent, error: fetchError } = await supabase
      .from("skill_test_results")
      .select("skill_name, score_percent, passing_score, passed, level_breakdown, question_review, completed_at")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(30);

    if (fetchError) {
      console.error("Fetch latest skill run error:", fetchError);
      return res.status(500).json({ error: "Failed to load your assessment results" });
    }

    if (!recent || recent.length === 0) {
      return res.status(404).json({ error: "Take a skill assessment first to get an analysis of your results." });
    }

    // Cluster the newest row together with every row within SAME_RUN_WINDOW_MS
    // of it — that's "this run", whether it was one skill or several.
    const latestTime = new Date(recent[0].completed_at).getTime();
    const batch = recent.filter((r) => latestTime - new Date(r.completed_at).getTime() <= SAME_RUN_WINDOW_MS);

    const { data: savedAnalysis, error: savedAnalysisError } = await supabase
      .from("ai_skill_analyses")
      .select("analysis, based_on, provider, model, created_at, latest_run_at")
      .eq("user_id", userId)
      .eq("latest_run_at", recent[0].completed_at)
      .maybeSingle();
    if (savedAnalysisError) console.error("Fetch saved skill analysis error:", savedAnalysisError);
    if (savedAnalysis) {
      return res.status(200).json({
        analysis: savedAnalysis.analysis,
        basedOn: savedAnalysis.based_on,
        provider: savedAnalysis.provider,
        model: savedAnalysis.model,
        stored: true,
        createdAt: savedAnalysis.created_at,
      });
    }

    if (!shouldGenerate) {
      return res.status(404).json({ error: "No saved AI analysis exists for the latest assessment." });
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey && !openRouterKey && !geminiKey) {
      return res.status(503).json({ error: "AI skill analysis is not configured on the server." });
    }

    const prompt = buildAnalysisPrompt(batch);
    let analysis = null;
    let analysisModel = null;
    let analysisModels = [];
    let provider = null;
    let upstreamError = null;

    // Prefer Groq for fast post-assessment analysis. Gemini and OpenRouter
    // remain fallbacks when Groq is unavailable or its model rejects a call.
    if (groqKey) {
      ({ analysis, models: analysisModels, error: upstreamError } = await callGroqAnalysis(groqKey, prompt));
      if (analysis) {
        provider = "groq";
        analysisModel = analysisModels.join(", ");
      }
    }
    if (!analysis && geminiKey) {
      ({ analysis, error: upstreamError } = await callGeminiAnalysis(geminiKey, prompt));
      if (analysis) {
        provider = "gemini";
        analysisModel = GEMINI_MODEL;
      }
    }
    if (!analysis && openRouterKey) {
      ({ analysis, model: analysisModel, error: upstreamError } = await callOpenRouterAnalysis(openRouterKey, prompt));
      if (analysis) provider = "openrouter";
    }
    if (!analysis) {
      console.error("Skill analysis generation failed:", upstreamError);
      return res.status(503).json({
        error: groqKey
          ? "Groq could not generate the analysis. Check that the Render GROQ_API_KEY is valid and that GROQ_MODEL is available."
          : openRouterKey
            ? "OpenRouter could not generate the analysis. Check that the Render OPENROUTER_API_KEY is valid and that OPENROUTER_MODELS contains active :free models."
          : "AI skill analysis is not configured on the deployed server. Add GROQ_API_KEY in Render environment variables and redeploy.",
      });
    }

    const { error: saveAnalysisError } = await supabase.from("ai_skill_analyses").upsert(
      {
        user_id: userId,
        latest_run_at: recent[0].completed_at,
        analysis,
        based_on: batch.map((r) => ({ skillName: r.skill_name, scorePercent: r.score_percent, passed: r.passed })),
        provider,
        model: analysisModel,
      },
      { onConflict: "user_id,latest_run_at" }
    );
    if (saveAnalysisError) console.error("Save skill analysis error:", saveAnalysisError);

    res.status(200).json({
      analysis,
      basedOn: batch.map((r) => ({ skillName: r.skill_name, scorePercent: r.score_percent, passed: r.passed })),
      provider,
      model: analysisModel,
      stored: !saveAnalysisError,
    });
  } catch (error) {
    console.error("Analyze latest skill run error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

function buildAnalysisPrompt(batch) {
  const dataLines = batch
    .map((r) => {
      const levelPart = Array.isArray(r.level_breakdown) && r.level_breakdown.length > 0
        ? " Level breakdown: " +
          r.level_breakdown.map((lb) => `${lb.level} ${lb.correct}/${lb.total} (${lb.scorePercent}%)`).join(", ") + "."
        : "";
      const questionPart = Array.isArray(r.question_review) && r.question_review.length > 0
        ? " Question review:\n" + r.question_review.map((q, index) =>
            `  ${index + 1}. [${q.level}] ${q.prompt} | Student answer: ${q.submittedAnswer || "No answer"} | Correct: ${q.correct ? "yes" : "no"} | Expected: ${q.correctAnswer} | Explanation: ${q.explanation}`
          ).join("\n")
        : "";
      return `- ${r.skill_name}: ${r.score_percent}% overall (passing score ${r.passing_score}%, ${r.passed ? "passed" : "not passed"}).${levelPart}${questionPart}`;
    })
    .join("\n");

  return `A student just completed a skill assessment run. Here is their REAL, exact data — do not invent any skill, number, or level not listed here:
${dataLines}

Analyze this data and respond with strict JSON only, no markdown, no commentary outside the JSON, in this exact shape:
{"strengths":[{"skill":"...","note":"detailed evidence-based review of strong topics and question patterns"}],"weaknesses":[{"skill":"...","note":"detailed evidence-based review of weak topics and missed questions"}],"questionReview":[{"skill":"...","question":"short question text","level":"beginner|intermediate|advanced","result":"correct|incorrect","review":"what the answer shows and what to improve"}],"roadmap":[{"title":"...","focus":"which weak topic this step targets","steps":["concrete action 1","concrete action 2","concrete action 3"]}]}

Rules:
- strengths: detailed strengths based on high scores and repeated correct topics; cite question evidence and levels — 1 to 6 entries.
- weaknesses: detailed weaknesses based on missed questions and low levels; cite the missed topic/question and explain the knowledge gap — 1 to 6 entries.
- questionReview: review every supplied question, not just a sample. Keep each review concise but specific, and never invent a question or answer.
- roadmap: 3 to 5 ordered steps, each targeting the weakest areas first, with concrete, actionable steps a student can start this week (specific topics/practice, not vague advice like "practice more").
- Every claim must be traceable to a number in the data above. Do not mention skills that aren't listed.`;
}

async function callGroqAnalysis(apiKey, prompt) {
  const results = await Promise.all(GROQ_MODELS.map((model) => callGroqJson(apiKey, prompt, "analysis", model)));
  const successful = results.filter((result) => result.analysis);
  if (successful.length === 0) {
    return { analysis: null, models: [], error: results.map((result) => result.error).filter(Boolean).join(" | ") };
  }

  return {
    analysis: mergeAnalyses(successful.map((result) => result.analysis)),
    models: successful.map((result) => result.model),
    error: null,
  };
}

async function callGroqRoadmap(apiKey, prompt) {
  const results = await Promise.all(GROQ_MODELS.map((model) => callGroqJson(apiKey, prompt, "roadmap", model)));
  const successful = results.find((result) => result.roadmap);
  return successful || { roadmap: null, error: results.map((result) => result.error).filter(Boolean).join(" | ") };
}

async function callGroqJson(apiKey, prompt, type, model = GROQ_MODEL) {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: type === "analysis"
              ? "Analyze assessment scores strictly from the supplied data. Return valid JSON only."
              : "Create a practical learning roadmap. Return valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: type === "analysis" ? 4500 : 1800,
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) {
      return { [type]: null, model, error: `${model} ${response.status}: ${(await response.text()).slice(0, 300)}` };
    }
    const data = await response.json();
    const result = type === "analysis"
      ? parseAnalysis(data?.choices?.[0]?.message?.content)
      : parseRoadmap(data?.choices?.[0]?.message?.content);
    return { ...result, model };
  } catch (error) {
    return { [type]: null, model, error: `${model}: ${error.message}` };
  }
}

function mergeAnalyses(analyses) {
  const uniqueBy = (items, key) => {
    const seen = new Set();
    return items.filter((item) => {
      const value = String(item?.[key] || "").trim().toLowerCase();
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  };

  return {
    strengths: uniqueBy(analyses.flatMap((analysis) => analysis.strengths || []), "skill").slice(0, 8),
    weaknesses: uniqueBy(analyses.flatMap((analysis) => analysis.weaknesses || []), "skill").slice(0, 8),
    questionReview: uniqueBy(
      analyses.flatMap((analysis) => analysis.questionReview || []),
      "question"
    ),
    roadmap: analyses.find((analysis) => analysis.roadmap?.length > 0)?.roadmap || [],
  };
}

async function callOpenRouterAnalysis(apiKey, prompt) {
  let lastError = "No free OpenRouter model is configured.";
  for (const model of FREE_OPENROUTER_MODELS) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.FRONTEND_URL?.split(",")[0] || "http://localhost:5173",
          "X-Title": "SIH Student Portal",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You analyze student assessment data and return valid JSON only, grounded strictly in the provided numbers." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4500,
          response_format: { type: "json_object" },
        }),
      });
      if (!response.ok) {
        lastError = `${model} ${response.status}: ${(await response.text()).slice(0, 300)}`;
        continue;
      }
      const data = await response.json();
      const result = parseAnalysis(data?.choices?.[0]?.message?.content);
      if (result.analysis) return { ...result, model };
      lastError = `${model}: ${result.error}`;
    } catch (error) {
      lastError = `${model}: ${error.message}`;
    }
  }
  return { analysis: null, model: null, error: lastError };
}

async function callGeminiAnalysis(apiKey, prompt) {
  try {
    const response = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "Return valid JSON only for the requested skill analysis." }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4500, responseMimeType: "application/json" },
      }),
    });
    if (!response.ok) return { analysis: null, error: `${response.status}: ${(await response.text()).slice(0, 300)}` };
    const data = await response.json();
    return parseAnalysis(data?.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n"));
  } catch (error) {
    return { analysis: null, error: error.message };
  }
}

function parseAnalysis(content) {
  try {
    const normalized = String(content || "")
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    const analysis = JSON.parse(normalized);
    if (!Array.isArray(analysis?.strengths) || !Array.isArray(analysis?.weaknesses) || !Array.isArray(analysis?.roadmap)) {
      return { analysis: null, error: "The model returned an incomplete analysis" };
    }
    return { analysis, error: null };
  } catch {
    return { analysis: null, error: "The model returned invalid JSON" };
  }
}

function buildRoadmapPrompt(skill, currentLevel, format) {
  return `Create a practical ${format} learning roadmap for the specific skill "${skill}"${currentLevel ? `, considering the student's current level "${currentLevel}"` : ""}.
The roadmap must take a complete beginner to advanced/expert capability in a logical sequence. Cover these progression stages in order: Beginner fundamentals, Core foundations, Intermediate application, Advanced engineering or analysis, and Expert-level production practice. Do not skip foundations or assume prior knowledge. Every step must focus only on "${skill}" and must contain concrete topics, a learning activity, a practice exercise, and an applied task.
Return valid JSON only with this shape:
{"title":"...","summary":"...","steps":[{"title":"...","topics":["..."],"learn":"...","practice":"...","apply":"..."}],"project":{"title":"...","description":"..."},"resources":[{"type":"documentation","label":"...","url":"https://..."},{"type":"free-course","label":"...","url":"https://..."}]}
Use official documentation and genuinely free learning resources. Include exactly 5 ordered steps, one for each progression stage, and finish with a practical production-style project. Keep URLs direct and relevant to "${skill}". Do not include markdown or commentary outside the JSON.`;
}

async function callOpenRouter(apiKey, prompt) {
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.FRONTEND_URL?.split(",")[0] || "http://localhost:5173",
        "X-Title": "SIH Student Portal",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: "You create accurate, structured learning roadmaps. Return valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1800,
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) return { roadmap: null, error: `${response.status}: ${(await response.text()).slice(0, 300)}` };
    const data = await response.json();
    return parseRoadmap(data?.choices?.[0]?.message?.content);
  } catch (error) {
    return { roadmap: null, error: error.message };
  }
}

async function callGeminiRoadmap(apiKey, prompt) {
  try {
    const response = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "Return valid JSON only for the requested learning roadmap." }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1800, responseMimeType: "application/json" },
      }),
    });
    if (!response.ok) return { roadmap: null, error: `${response.status}: ${(await response.text()).slice(0, 300)}` };
    const data = await response.json();
    return parseRoadmap(data?.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n"));
  } catch (error) {
    return { roadmap: null, error: error.message };
  }
}

function parseRoadmap(content) {
  try {
    const roadmap = JSON.parse(content);
    if (!roadmap?.title || !Array.isArray(roadmap.steps) || roadmap.steps.length === 0) {
      return { roadmap: null, error: "The model returned an incomplete roadmap" };
    }
    return { roadmap, error: null };
  } catch {
    return { roadmap: null, error: "The model returned invalid JSON" };
  }
}

async function callGemini(apiKey, prompt, history = []) {
  try {
    // Prior turns come first (each mapped to Gemini's role names — its API
    // uses "model" for the assistant, not "assistant"), then the current
    // question as the final "user" turn — a single multi-turn contents
    // array, not a single-message request, so follow-ups actually resolve
    // against what was said before.
    const contents = [
      ...history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      { role: "user", parts: [{ text: prompt }] },
    ];

    const candidateModels = [GEMINI_MODEL, "gemini-3.6-flash"].filter(
      (m, i, arr) => arr.indexOf(m) === i
    );

    let lastError = null;
    for (const model of candidateModels) {
      const response = await fetch(
        `${GEMINI_API_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
            generationConfig: { temperature: 0.4, maxOutputTokens: 1500 },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const reply = data?.candidates?.[0]?.content?.parts
          ?.map((part) => part.text)
          .filter(Boolean)
          .join("\n")
          .trim();

        if (reply) return { reply };
      } else {
        const errorText = await response.text().catch(() => "");
        lastError = `${response.status}: ${errorText.slice(0, 300)}`;
      }
    }

    return { reply: null, error: lastError || "Gemini returned an empty response" };
  } catch (error) {
    return { reply: null, error: error.message };
  }
}

async function callGroqAdvisor(apiKey, prompt, history = []) {
  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: prompt },
    ];

    const modelsToTry = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b", "groq/compound-mini"];
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const response = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.4,
            max_tokens: 1000,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data?.choices?.[0]?.message?.content?.trim();
          if (reply) return { reply };
        } else {
          const errText = await response.text().catch(() => "");
          lastError = `${model} ${response.status}: ${errText.slice(0, 200)}`;
        }
      } catch (err) {
        lastError = `${model}: ${err.message}`;
      }
    }

    return { reply: null, error: lastError || "Groq models failed to return a response" };
  } catch (error) {
    return { reply: null, error: error.message };
  }
}

function buildContextSummary(context) {
  if (!context || typeof context !== "object") return "No profile data was provided.";

  const lines = [];

  if (context.targetRole) {
    lines.push(`Target role: ${context.targetRole}`);
  }
  if (typeof context.readinessPercent === "number") {
    lines.push(`Readiness for target role: ${context.readinessPercent}%`);
  }
  if (Array.isArray(context.matchedSkills) && context.matchedSkills.length > 0) {
    lines.push(`Skills already verified for this role: ${context.matchedSkills.map((s) => s.name ?? s).join(", ")}`);
  }
  if (Array.isArray(context.missingSkills) && context.missingSkills.length > 0) {
    lines.push(`Skills still missing for this role: ${context.missingSkills.map((s) => s.name ?? s).join(", ")}`);
  }
  if (Array.isArray(context.allSkills) && context.allSkills.length > 0) {
    const summary = context.allSkills.map((s) => `${s.name} (${s.currentScore}%, ${s.trustLevel})`).join("; ");
    lines.push(`Full verified skill profile: ${summary}`);
  }

  return lines.length > 0 ? lines.join("\n") : "No profile data was provided.";
}

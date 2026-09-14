import { supabase } from "../config/supabase.js";
import { resolveUserId } from "../utils/resolveUserId.js";
import { ASSESSABLE_SKILLS } from "./assessmentController.js";

const INTEREST_TYPES = new Set(["Internship", "Full-time job", "Apprenticeship", "Learning program", "Not sure yet"]);

// Skill tags are free-text-friendly: anything from the canonical assessable
// list is kept as-is, and anything else is kept too (trimmed), so a student
// can self-report a skill the platform doesn't test for yet.
function normalizeSkillTags(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean))].slice(0, 3);
}

function normalizeInterestTypes(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v) => INTEREST_TYPES.has(v)))];
}

// Shared by every route here: resolves the caller to a users row and
// confirms it's a student — the questionnaire is student-only, and
// req.user.role can't be trusted directly (see onboardingRoutes.js).
// Returns the row on success, or null after sending the error response.
async function requireStudent(req, res) {
  const userId = await resolveUserId(req);
  if (!userId) {
    res.status(404).json({ error: "User not found" });
    return null;
  }

  const { data, error } = await supabase.from("users").select("id, role, onboarding_completed").eq("id", userId).single();

  if (error || !data) {
    console.error("Fetch user for onboarding error:", error);
    res.status(404).json({ error: "User not found" });
    return null;
  }

  if (data.role !== "student") {
    res.status(403).json({ error: "Onboarding is only available for student accounts" });
    return null;
  }

  return data;
}

export const getOnboardingStatus = async (req, res) => {
  try {
    const user = await requireStudent(req, res);
    if (!user) return;

    res.status(200).json({ completed: Boolean(user.onboarding_completed) });
  } catch (error) {
    console.error("Get onboarding status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const submitOnboarding = async (req, res) => {
  try {
    const user = await requireStudent(req, res);
    if (!user) return;
    const userId = user.id;

    const { fieldOfStudy, confidentSkills, struggleSkills, interestTypes, highlight } = req.body ?? {};

    if (!fieldOfStudy?.trim()) {
      return res.status(400).json({ error: "Field of study is required" });
    }
    const normalizedInterestTypes = normalizeInterestTypes(interestTypes);
    if (normalizedInterestTypes.length === 0) {
      return res.status(400).json({ error: "Please select at least one opportunity type" });
    }
    if (highlight && highlight.length > 120) {
      return res.status(400).json({ error: "Highlight must be 120 characters or fewer" });
    }

    const completedAt = new Date().toISOString();

    const { data: response, error: upsertError } = await supabase
      .from("onboarding_responses")
      .upsert(
        {
          student_id: userId,
          field_of_study: fieldOfStudy.trim(),
          confident_skills: normalizeSkillTags(confidentSkills),
          struggle_skills: normalizeSkillTags(struggleSkills),
          interest_types: normalizedInterestTypes,
          highlight: highlight?.trim() || null,
          completed_at: completedAt,
        },
        { onConflict: "student_id" }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("Upsert onboarding response error:", upsertError);
      return res.status(500).json({ error: "Failed to save your answers" });
    }

    const { error: userUpdateError } = await supabase.from("users").update({ onboarding_completed: true }).eq("id", userId);

    if (userUpdateError) {
      console.error("Mark onboarding complete error:", userUpdateError);
      return res.status(500).json({ error: "Saved your answers, but failed to mark onboarding complete" });
    }

    res.status(200).json({
      response: {
        fieldOfStudy: response.field_of_study,
        confidentSkills: response.confident_skills,
        struggleSkills: response.struggle_skills,
        interestTypes: response.interest_types,
        highlight: response.highlight,
      },
      completed: true,
    });
  } catch (error) {
    console.error("Submit onboarding error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Backs the confident/struggle skill tag inputs — the same canonical
// vocabulary skill_profile/skill_test_results already use, so self-reported
// tags line up with assessment-verified ones instead of drifting apart.
export const getSkillSuggestions = async (req, res) => {
  res.status(200).json({ skills: [...ASSESSABLE_SKILLS].sort() });
};

// Full saved questionnaire answers — used by the portfolio view to surface
// field of study, the recruiter highlight, and confident/struggle skill
// tags. Separate from getOnboardingStatus, which stays a cheap
// completed-only check for StudentOnboardingGate to call on every route.
export const getOnboardingResponse = async (req, res) => {
  try {
    const user = await requireStudent(req, res);
    if (!user) return;

    if (!user.onboarding_completed) {
      return res.status(200).json({ response: null });
    }

    const { data, error } = await supabase.from("onboarding_responses").select("*").eq("student_id", user.id).maybeSingle();

    if (error) {
      console.error("Fetch onboarding response error:", error);
      return res.status(500).json({ error: "Failed to load onboarding answers" });
    }

    res.status(200).json({
      response: data
        ? {
            fieldOfStudy: data.field_of_study,
            confidentSkills: data.confident_skills,
            struggleSkills: data.struggle_skills,
            interestTypes: data.interest_types,
            highlight: data.highlight,
          }
        : null,
    });
  } catch (error) {
    console.error("Get onboarding response error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

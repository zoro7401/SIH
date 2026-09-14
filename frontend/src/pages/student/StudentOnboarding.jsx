import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getSkillSuggestions, submitOnboarding } from "../../services/onboardingService";
import SkillTagInput from "../../components/common/SkillTagInput";
import { ArrowClockwise, WarningCircle, Sparkle } from "@phosphor-icons/react";

const inputClass =
  "w-full border border-hairline rounded-md px-3 py-2.5 bg-bone focus:border-ink focus:ring-0 text-sm placeholder:text-muted outline-none transition-colors";

const FIELD_OPTIONS = [
  "Computer Science / IT",
  "Electronics & Communication",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Biotechnology",
  "Commerce",
  "Business / Management",
  "Other",
];

const INTEREST_OPTIONS = ["Internship", "Full-time job", "Apprenticeship", "Learning program", "Not sure yet"];

const HIGHLIGHT_MAX = 120;

// Curated subset of the canonical assessable-skill vocabulary per field, so
// the confident-skills dropdown (Q2) starts from something relevant instead
// of the full 30-skill list. Free typing still covers anything not listed
// here or outside a student's field entirely.
const FIELD_SKILLS = {
  "Computer Science / IT": [
    "JavaScript",
    "Python Programming",
    "React",
    "SQL / Databases",
    "Data Structures & Algorithms",
    "Git & Version Control",
    "TypeScript",
    "Java / C++ / C#",
    "Node.js",
    "REST APIs / GraphQL",
  ],
  "Electronics & Communication": ["Python Programming", "Problem Solving", "Statistics", "Excel", "Teamwork", "Communication"],
  "Electrical Engineering": ["Python Programming", "Problem Solving", "Statistics", "Excel", "Teamwork", "Communication"],
  "Mechanical Engineering": ["Problem Solving", "Statistics", "Excel", "Teamwork", "Time Management", "Communication"],
  "Civil Engineering": ["Problem Solving", "Statistics", "Excel", "Teamwork", "Time Management", "Communication"],
  "Chemical Engineering": ["Problem Solving", "Statistics", "Excel", "Teamwork", "Time Management", "Communication"],
  Biotechnology: ["Statistics", "Data Visualization (Tableau)", "Python Programming", "Excel", "Communication"],
  Commerce: ["Excel", "Statistics", "Power BI", "Communication", "Teamwork", "Time Management"],
  "Business / Management": ["Communication", "Teamwork", "Time Management", "Excel", "Power BI", "Problem Solving"],
};

// Shown once, right after a student account is created — a short qualitative
// self-report (not the scored skill assessment quiz) that seeds the
// portfolio card with a field of study, confident/struggle skill tags, and
// a one-line recruiter highlight. StudentOnboardingGate redirects every
// other student route here until it's completed.
export default function StudentOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const [fieldChoice, setFieldChoice] = useState("");
  const [fieldOther, setFieldOther] = useState("");
  const [confidentSkills, setConfidentSkills] = useState([]);
  const [struggleSkills, setStruggleSkills] = useState([]);
  const [interestTypes, setInterestTypes] = useState([]);
  const [highlight, setHighlight] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSkillSuggestions()
      .then(setSkillSuggestions)
      .catch(() => setSkillSuggestions([]));
  }, []);

  const fieldOfStudy = fieldChoice === "Other" ? fieldOther.trim() : fieldChoice;
  const fieldSkillOptions = FIELD_SKILLS[fieldChoice] || [];

  const toggleInterestType = (opt) => {
    setInterestTypes((prev) => (prev.includes(opt) ? prev.filter((t) => t !== opt) : [...prev, opt]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!fieldOfStudy) {
      setError("Please tell us what you're studying");
      return;
    }
    if (confidentSkills.length === 0) {
      setError("Pick at least one skill you're confident in");
      return;
    }
    if (struggleSkills.length === 0) {
      setError("Pick at least one area you'd like to improve");
      return;
    }
    if (interestTypes.length === 0) {
      setError("Please select at least one kind of opportunity you're interested in");
      return;
    }

    setSaving(true);
    try {
      await submitOnboarding({
        fieldOfStudy,
        confidentSkills,
        struggleSkills,
        interestTypes,
        highlight: highlight.trim(),
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Could not save your answers. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas text-charcoal px-4 py-12">
      <main className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-bone border border-hairline flex items-center justify-center mx-auto mb-4">
            <Sparkle size={22} className="text-ink" />
          </div>
          <h1 className="font-geist text-3xl text-ink tracking-tight mb-2">
            Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""} — a few quick questions
          </h1>
          <p className="text-muted">
            This takes under a minute and helps us tailor your dashboard. It's separate from the full skill assessment,
            which you can take anytime.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-bone border border-hairline rounded-xl p-8 space-y-6">
          {error && (
            <div className="px-3 py-2.5 bg-pastel-red rounded-md flex items-start gap-2">
              <WarningCircle size={18} weight="bold" className="text-pastel-red-ink flex-shrink-0 mt-0.5" />
              <p className="text-sm text-pastel-red-ink">{error}</p>
            </div>
          )}

          {/* Q1 — field of study */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted font-bold mb-1.5">
              1. What field or course are you currently studying?
            </label>
            <select className={inputClass} value={fieldChoice} onChange={(e) => setFieldChoice(e.target.value)} disabled={saving}>
              <option value="" disabled>
                Select a field
              </option>
              {FIELD_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {fieldChoice === "Other" && (
              <input
                className={`${inputClass} mt-2`}
                type="text"
                placeholder="Tell us your field"
                value={fieldOther}
                onChange={(e) => setFieldOther(e.target.value)}
                disabled={saving}
              />
            )}
          </div>

          {/* Q2 — confident skills */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted font-bold mb-1.5">
              2. Which 2–3 skills are you most confident in right now?
            </label>
            <SkillTagInput
              value={confidentSkills}
              onChange={setConfidentSkills}
              suggestions={skillSuggestions}
              dropdownOptions={fieldSkillOptions}
              dropdownLabel={fieldChoice ? `Common skills for ${fieldChoice}` : "Select a field above to see suggestions"}
            />
          </div>

          {/* Q3 — struggle skills */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted font-bold mb-1.5">
              3. Which 2–3 areas do you feel you need to improve or struggle with?
            </label>
            <SkillTagInput value={struggleSkills} onChange={setStruggleSkills} suggestions={skillSuggestions} />
          </div>

          {/* Q4 — opportunity type */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted font-bold mb-2">
              4. What kind of opportunity are you most interested in right now? (select all that apply)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INTEREST_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleInterestType(opt)}
                  disabled={saving}
                  aria-pressed={interestTypes.includes(opt)}
                  className={`border rounded-md px-3 py-2.5 text-sm text-left transition-colors ${
                    interestTypes.includes(opt) ? "border-ink bg-canvas text-ink" : "border-hairline text-charcoal hover:border-charcoal"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Q5 — recruiter highlight */}
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted font-bold mb-1.5" htmlFor="highlight">
              5. In one line, what's something you'd want a recruiter to know about you?
            </label>
            <input
              className={inputClass}
              id="highlight"
              type="text"
              maxLength={HIGHLIGHT_MAX}
              value={highlight}
              onChange={(e) => setHighlight(e.target.value)}
              disabled={saving}
            />
            <p className="text-xs text-muted mt-1 text-right">
              {highlight.length}/{HIGHLIGHT_MAX}
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-ink text-ink-contrast text-sm font-medium rounded-md py-2.5 px-4 hover:bg-ink-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <ArrowClockwise size={16} className="animate-spin" />
                Saving…
              </>
            ) : (
              "Continue to Dashboard"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}

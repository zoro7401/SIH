import { useEffect, useState } from "react";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { getMySkillPrograms, createSkillProgram } from "../../services/skillProgramsService";
import { SKILL_CATALOG } from "../../services/mockData/skills";
import { GraduationCap, Plus, Trash, ArrowRight } from "@phosphor-icons/react";

const CLOSING_WEEKS = ["Industry Project", "Final Assessment"];

function emptyForm() {
  return { title: "", skills: [], weeks: [] };
}

// Building the week list from selected skills + the two closing weeks keeps
// the "6-Week Skill Development Program" shape (content weeks -> project ->
// final assessment) the spec describes, without the recruiter hand-typing
// week numbers.
function weeksFromSkills(skillNames) {
  const contentWeeks = skillNames.map((skill, i) => ({ week: i + 1, focus: skill }));
  const closingWeeks = CLOSING_WEEKS.map((focus, i) => ({ week: skillNames.length + i + 1, focus }));
  return [...contentWeeks, ...closingWeeks];
}

export default function SkillPrograms() {
  const [programs, setPrograms] = useState(undefined);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadPrograms = () => getMySkillPrograms().then(setPrograms);

  useEffect(() => {
    loadPrograms();
  }, []);

  const toggleSkill = (skillName) => {
    setForm((prev) => {
      const skills = prev.skills.includes(skillName) ? prev.skills.filter((s) => s !== skillName) : [...prev.skills, skillName];
      return { ...prev, skills, weeks: weeksFromSkills(skills) };
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createSkillProgram(form);
      setForm(emptyForm());
      setShowForm(false);
      await loadPrograms();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <h2 className="font-geist text-3xl text-ink tracking-tight">Skill Development Programs</h2>
          <p className="text-muted mt-2 max-w-xl">
            "We need candidates but nobody is ready" — define a week-by-week program to turn students into
            industry-ready candidates for your open roles.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-ink text-white px-4 py-2 rounded-md text-sm hover:bg-ink-hover active:scale-[0.98] transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <Plus size={16} />
          {showForm ? "Cancel" : "Create Program"}
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-hairline rounded-xl p-8 mb-10 flex flex-col gap-6 max-w-3xl">
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Program Title</label>
            <input
              className="w-full border border-hairline rounded-md px-3 py-2.5 bg-white focus:border-ink focus:ring-0 text-sm outline-none transition-colors"
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Data Analytics Job-Ready Program"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-2">Target Skills (one per week)</label>
            <div className="flex flex-wrap gap-2">
              {SKILL_CATALOG.map((s) => {
                const selected = form.skills.includes(s.name);
                return (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => toggleSkill(s.name)}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                      selected ? "bg-ink text-white border-ink" : "bg-white text-charcoal border-hairline hover:border-ink"
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>

          {form.weeks.length > 0 && (
            <div>
              <label className="block text-xs uppercase tracking-wide text-muted mb-2">
                Program Timeline ({form.weeks.length} Weeks)
              </label>
              <ul className="flex flex-col gap-2">
                {form.weeks.map((w) => (
                  <li key={w.week} className="flex items-center gap-3 bg-bone px-3 py-2 rounded-md text-sm text-charcoal">
                    <span className="text-xs text-muted w-16 shrink-0">Week {w.week}</span>
                    {w.focus}
                    {CLOSING_WEEKS.includes(w.focus) ? null : (
                      <button
                        type="button"
                        onClick={() => toggleSkill(w.focus)}
                        className="ml-auto text-muted hover:text-pastel-red-ink"
                        aria-label={`Remove ${w.focus}`}
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-pastel-red-ink">{error}</p>}

          <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-ink text-white rounded-md text-sm hover:bg-ink-hover active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {submitting ? "Publishing…" : "Publish Program"}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      )}

      {programs === undefined && <LoadingState label="Loading programs…" />}

      {programs && programs.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title="No skill programs yet"
          description="Create a program to help students close the gaps standing between them and your open roles."
          actionLabel="Create Program"
          onAction={() => setShowForm(true)}
        />
      )}

      {programs && programs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {programs.map((program) => (
            <article key={program.id} className="bg-white border border-hairline rounded-xl p-6">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="text-base font-medium text-ink">{program.title}</h4>
                <span className="bg-bone px-2.5 py-1 rounded-full text-xs uppercase tracking-wide text-charcoal whitespace-nowrap">
                  {program.durationWeeks} Weeks
                </span>
              </div>
              <ul className="flex flex-col gap-1.5 mt-4">
                {program.weeks.map((w) => (
                  <li key={w.week} className="flex items-center gap-2 text-sm text-charcoal">
                    <span className="text-xs text-muted w-14 shrink-0">Week {w.week}</span>
                    {w.focus}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

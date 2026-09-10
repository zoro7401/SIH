import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createOpportunity } from "../../services/opportunitiesService";
import { getCompanyProfile } from "../../services/companyProfileService";
import { OPPORTUNITY_SKILLS, OPPORTUNITY_CITIES } from "../../constants/opportunityFilters";
import { WORK_MODES } from "../../utils/locationUtils";
import { PaperPlaneTilt, Plus, X } from "@phosphor-icons/react";

const inputClass =
  "w-full border border-hairline rounded-md px-3 py-2.5 bg-white focus:border-ink focus:ring-0 text-sm outline-none transition-colors";

const TYPES = ["Internship", "Full-time", "Part-time"];

const initialForm = {
  title: "",
  type: "Internship",
  city: OPPORTUNITY_CITIES[0],
  mode: "On-site",
  duration: "",
  stipend: "",
  commitment: "",
  description: "",
  responsibilities: "",
  skills: [],
  eligibility: [],
};

const ELIGIBILITY_SUGGESTIONS = [
  "3rd year or above",
  "Final year or recent graduate",
  "Remote-friendly",
  "Willing to relocate",
  "Minimum CGPA 7.0",
];

export default function PostOpportunity() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [customEligibility, setCustomEligibility] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [posted, setPosted] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
  };

  const toggleSkill = (skillName) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skillName) ? prev.skills.filter((s) => s !== skillName) : [...prev.skills, skillName],
    }));
  };

  // Eligibility criteria are stored as {label, met:true} — "met" always true
  // here because the recruiter is defining a *requirement* to check students
  // against, not evaluating a specific student (that's what calculateMatch's
  // evaluateEducation does downstream, per-candidate).
  const addEligibility = (label) => {
    const trimmed = label.trim();
    if (!trimmed || form.eligibility.some((c) => c.label === trimmed)) return;
    setForm((prev) => ({ ...prev, eligibility: [...prev.eligibility, { label: trimmed, met: true }] }));
    setCustomEligibility("");
  };

  const removeEligibility = (label) => {
    setForm((prev) => ({ ...prev, eligibility: prev.eligibility.filter((c) => c.label !== label) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError("Title is required.");
    if (form.skills.length === 0) return setError("Select at least one required skill.");

    setSubmitting(true);
    setError("");
    setPosted(false);
    try {
      const company = await getCompanyProfile();
      // Stored as a single "location" string for compatibility with existing
      // data/services (e.g. "Bangalore (Hybrid)") — utils/locationUtils.js
      // parses it back into { city, mode } everywhere it's displayed/filtered.
      const location = form.mode === "Remote" ? "Remote" : `${form.city.trim()} (${form.mode})`;
      await createOpportunity({
        title: form.title,
        company: company.name,
        type: form.type,
        location,
        duration: form.duration || undefined,
        stipend: form.stipend || undefined,
        commitment: form.commitment || undefined,
        overview: form.description ? [form.description] : undefined,
        responsibilities: form.responsibilities
          ? form.responsibilities.split("\n").map((line) => line.trim()).filter(Boolean)
          : undefined,
        skills: form.skills,
        eligibility: form.eligibility,
      });
      // createOpportunity() throws on any real failure now (no more silent
      // local-only fallback masquerading as success — see
      // opportunitiesService.js) — reaching here means the row genuinely
      // landed in Supabase, so it's safe to confirm and redirect.
      setPosted(true);
      setTimeout(() => navigate("/industry/opportunities"), 900);
    } catch (err) {
      // Surface the real backend/validation error instead of a generic
      // message — a recruiter needs to know *why* a post failed (expired
      // session, a missing required field the backend rejected, etc.).
      setError(err.message || "Something went wrong posting this opportunity. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <>
      <header className="mb-10">
        <h2 className="font-geist text-3xl text-ink tracking-tight">Post an Opportunity</h2>
        <p className="text-muted mt-2">Define the role and required skills — matched candidates appear the moment it's published.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white border border-hairline rounded-xl p-8 flex flex-col gap-6 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Title</label>
            <input className={inputClass} type="text" value={form.title} onChange={handleChange("title")} placeholder="e.g. Frontend Engineer Intern" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Opportunity Type</label>
            <select className={inputClass} value={form.type} onChange={handleChange("type")}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Work Mode</label>
            <select className={inputClass} value={form.mode} onChange={handleChange("mode")}>
              {WORK_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className={form.mode === "Remote" ? "opacity-50" : ""}>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">City</label>
            <select className={inputClass} value={form.city} onChange={handleChange("city")} disabled={form.mode === "Remote"}>
              {OPPORTUNITY_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Duration</label>
            <input className={inputClass} type="text" value={form.duration} onChange={handleChange("duration")} placeholder="e.g. 3 Months" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Stipend / Salary</label>
            <input className={inputClass} type="text" value={form.stipend} onChange={handleChange("stipend")} placeholder="e.g. ₹20,000 / Month" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Commitment</label>
            <input className={inputClass} type="text" value={form.commitment} onChange={handleChange("commitment")} placeholder="e.g. Full-Time (40 hrs/week)" />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Description</label>
          <textarea className={`${inputClass} min-h-[100px] resize-y`} value={form.description} onChange={handleChange("description")} placeholder="What will this person work on?" />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Key Responsibilities</label>
          <textarea
            className={`${inputClass} min-h-[100px] resize-y`}
            value={form.responsibilities}
            onChange={handleChange("responsibilities")}
            placeholder={"One responsibility per line, e.g.\nBuild and iterate on features using React.\nParticipate in sprint planning and code review."}
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-muted mb-2">Required Skills</label>
          <div className="flex flex-wrap gap-2">
            {OPPORTUNITY_SKILLS.map((skill) => {
              const selected = form.skills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    selected ? "bg-ink text-white border-ink" : "bg-white text-charcoal border-hairline hover:border-ink"
                  }`}
                >
                  {skill}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-muted mb-2">Eligibility Requirements</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {ELIGIBILITY_SUGGESTIONS.map((label) => {
              const selected = form.eligibility.some((c) => c.label === label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => (selected ? removeEligibility(label) : addEligibility(label))}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    selected ? "bg-ink text-white border-ink" : "bg-white text-charcoal border-hairline hover:border-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mb-3">
            <input
              className={inputClass}
              type="text"
              value={customEligibility}
              onChange={(e) => setCustomEligibility(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEligibility(customEligibility);
                }
              }}
              placeholder="Add a custom requirement…"
            />
            <button
              type="button"
              onClick={() => addEligibility(customEligibility)}
              className="shrink-0 px-3 border border-hairline rounded-md text-charcoal hover:bg-bone transition-colors flex items-center gap-1.5 text-sm"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
          {form.eligibility.length > 0 && (
            <ul className="flex flex-col gap-2">
              {form.eligibility.map((c) => (
                <li key={c.label} className="flex items-center justify-between gap-2 bg-bone px-3 py-2 rounded-md text-sm text-charcoal">
                  {c.label}
                  <button type="button" onClick={() => removeEligibility(c.label)} className="text-muted hover:text-ink">
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p className="text-sm text-pastel-red-ink bg-pastel-red/20 border border-pastel-red rounded-md px-3 py-2">{error}</p>
        )}
        {posted && (
          <p className="text-sm text-pastel-green-ink bg-pastel-green/20 border border-pastel-green rounded-md px-3 py-2">
            Opportunity published — redirecting to your opportunities…
          </p>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
          <button
            type="button"
            onClick={() => navigate("/industry/opportunities")}
            className="px-6 py-2.5 border border-hairline rounded-md text-charcoal text-sm hover:bg-bone transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || posted}
            className="px-6 py-2.5 bg-ink text-white rounded-md text-sm hover:bg-ink-hover active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {posted ? "Published ✓" : submitting ? "Publishing…" : "Publish Opportunity"}
            <PaperPlaneTilt size={16} />
          </button>
        </div>
      </form>
    </>
  );
}

import { Check, X } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

// Reusable "Why This Match?" breakdown. Takes the result of calculateMatch()
// (see matchingEngine.js) so it renders identically wherever it's used —
// job listings detail, the full breakdown page, and later the industry
// candidate view — with no page inventing its own match copy.
export default function WhyThisMatch({ match, compact = false, action }) {
  const { overallScore, matchedSkills, missingSkills, eligibility, bestNextAction } = match;

  return (
    <div className={compact ? "" : "border-t border-hairline pt-6"}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-ink">Why this match?</h2>
        <div className="text-right">
          <div className="font-editorial text-3xl text-ink leading-none">{overallScore}%</div>
          <div className="text-xs text-muted mt-1">Match Score</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs uppercase tracking-wide text-muted mb-2">Matched Skills</h3>
          <ul className="space-y-2 text-sm text-charcoal">
            {matchedSkills.length === 0 && <li className="text-muted py-2">No required skills matched yet.</li>}
            {matchedSkills.map((skill) => (
              <li key={skill.name} className="flex items-center gap-2 py-2 border-b border-hairline">
                <Check size={16} className="text-pastel-green-ink" />
                {skill.name}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wide text-muted mb-2">Missing Skills</h3>
          <ul className="space-y-2 text-sm text-charcoal">
            {missingSkills.length === 0 && <li className="text-muted py-2">No gaps — you meet every required skill.</li>}
            {missingSkills.map((skill) => (
              <li key={skill.name} className="flex items-center gap-2 py-2 border-b border-hairline">
                <X size={16} className="text-pastel-red-ink" />
                {skill.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-xs uppercase tracking-wide text-muted mb-2">Eligibility</h3>
        <ul className="space-y-2 text-sm text-charcoal">
          {eligibility.criteria.map((c) => (
            <li key={c.label} className="flex items-center gap-2 py-2 border-b border-hairline">
              {c.met ? <Check size={16} className="text-pastel-green-ink" /> : <X size={16} className="text-pastel-red-ink" />}
              {c.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 bg-bone p-5 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-sm text-charcoal">
          <span className="font-medium text-ink">Best next action:</span> {bestNextAction}
        </p>
        <Link
          to={action?.to ?? "/learning-paths"}
          className="bg-ink text-white text-sm px-4 py-2 rounded-md whitespace-nowrap hover:bg-ink-hover active:scale-[0.98] transition-all"
        >
          {action?.label ?? "Start Learning Path"}
        </Link>
      </div>
    </div>
  );
}

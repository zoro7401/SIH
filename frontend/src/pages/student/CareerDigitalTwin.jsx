import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import { getSkillProfile } from "../../services/skillsService";
import { getLearningPaths } from "../../services/learningPathsService";
import { TrendUp, Target, GraduationCap } from "@phosphor-icons/react";

// Projects readiness after the student's currently-recommended learning paths
// are completed — real skill gaps in, a real (if estimated) number out. All
// numbers here are clearly labeled as projections, per the spec's requirement
// that Career Digital Twin estimates be marked as such.
function projectReadiness(profile, learningPaths) {
  const gapNames = new Set(learningPaths.map((p) => p.skillName));
  const projectedProfile = profile.map((s) =>
    gapNames.has(s.name) ? { ...s, currentScore: Math.min(s.requiredScore, s.currentScore + 25) } : s
  );
  const projectedPercent = Math.round(
    (projectedProfile.reduce((sum, s) => sum + Math.min(s.currentScore / s.requiredScore, 1), 0) / projectedProfile.length) * 100
  );
  return projectedPercent;
}

export default function CareerDigitalTwin() {
  const [skillData, setSkillData] = useState(undefined);
  const [learningPaths, setLearningPaths] = useState(undefined);

  useEffect(() => {
    getSkillProfile().then(setSkillData);
    getLearningPaths().then(setLearningPaths);
  }, []);

  if (!skillData || !learningPaths) {
    return (
      <DashboardLayout>
        <LoadingState fullScreen={false} label="Building your career projection…" />
      </DashboardLayout>
    );
  }

  const { overallMatchPercent, skillGaps } = skillData;
  const projectedPercent = projectReadiness(skillData.profile, learningPaths);

  return (
    <DashboardLayout>
      <header className="mb-10 border-b border-hairline pb-6">
        <h1 className="font-geist text-3xl text-ink tracking-tight mb-1">Career Digital Twin</h1>
        <p className="text-muted">A model of your career readiness, and where it could go.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <section className="bg-white border border-hairline rounded-xl p-8 text-center">
          <h2 className="text-xs uppercase tracking-wide text-muted mb-3">Current Profile</h2>
          <div className="font-editorial text-5xl text-ink tracking-tight mb-2">{overallMatchPercent}%</div>
          <p className="text-sm text-muted">Software Developer Readiness</p>
        </section>
        <section className="bg-white border border-hairline rounded-xl p-8 text-center relative overflow-hidden">
          <span className="absolute top-3 right-3 text-xs uppercase tracking-wide text-muted bg-bone px-2 py-0.5 rounded-full">Estimate</span>
          <h2 className="text-xs uppercase tracking-wide text-muted mb-3">Projected After Learning Paths</h2>
          <div className="font-editorial text-5xl text-pastel-green-ink tracking-tight mb-2 flex items-center justify-center gap-2">
            <TrendUp size={32} />
            {projectedPercent}%
          </div>
          <p className="text-sm text-muted">If you complete your recommended learning paths</p>
        </section>
      </div>

      <section className="bg-white border border-hairline rounded-xl p-8 mb-6">
        <h2 className="text-lg font-medium text-ink mb-2 flex items-center gap-2">
          <Target size={20} />
          Skill Gaps Driving This Projection
        </h2>
        <p className="text-sm text-muted mb-6">These are the skills closing the gap between your current and projected readiness (estimated, not guaranteed).</p>
        <div className="flex flex-col gap-4">
          {skillGaps.slice(0, 5).map((gap) => (
            <div key={gap.name}>
              <div className="flex justify-between mb-1.5 text-sm">
                <span className="text-charcoal">{gap.name}</span>
                <span className="text-muted">
                  {gap.currentScore}% → <span className="text-pastel-green-ink">{Math.min(gap.requiredScore, gap.currentScore + 25)}%</span> (est.)
                </span>
              </div>
              <div className="h-1.5 w-full bg-bone rounded-full overflow-hidden relative">
                <div className="h-full bg-ink rounded-full absolute" style={{ width: `${gap.currentScore}%` }} />
                <div
                  className="h-full bg-pastel-green rounded-full absolute opacity-60"
                  style={{ width: `${Math.min(gap.requiredScore, gap.currentScore + 25)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-bone border border-hairline rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-sm text-charcoal flex items-center gap-2">
          <GraduationCap size={20} />
          <span>
            <span className="font-medium text-ink">Recommended action:</span> Start your learning paths to move toward the projected readiness.
          </span>
        </p>
        <Link to="/learning-paths" className="bg-ink text-white text-sm px-6 py-2.5 rounded-md whitespace-nowrap hover:bg-ink-hover active:scale-[0.98] transition-all">
          View Learning Paths
        </Link>
      </section>
    </DashboardLayout>
  );
}

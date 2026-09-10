import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import { CheckCircle, Circle, ArrowRight } from "@phosphor-icons/react";
import { CAREER_ROLES } from "../../services/mockData/careerRoles";
import { getTargetRoleId, getTargetRoleIdAsync, setTargetRoleId, getRoleReadiness } from "../../services/careerRoleService";

// All roles ranked by current readiness — lets the student see which role
// they're already closest to, not just the one they've explicitly picked.
async function getRankedRoleReadiness() {
  const all = await Promise.all(CAREER_ROLES.map((r) => getRoleReadiness(r.id)));
  return all.sort((a, b) => b.readinessPercent - a.readinessPercent);
}

function RoadmapTrack({ steps, currentIndex }) {
  return (
    <div className="flex flex-col">
      {steps.map((step, i) => {
        const isDone = i <= currentIndex;
        const isLast = i === steps.length - 1;
        return (
          <div key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              {isDone ? (
                <CheckCircle size={22} weight="fill" className="text-pastel-green-ink shrink-0" />
              ) : (
                <Circle size={22} className="text-muted shrink-0" />
              )}
              {!isLast && <div className={`w-px flex-1 my-1 ${isDone ? "bg-pastel-green-ink" : "bg-hairline"}`} style={{ minHeight: "24px" }} />}
            </div>
            <div className={`pb-6 text-sm ${isDone ? "text-ink font-medium" : "text-muted"}`}>{step}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function CareerPath() {
  const [ranked, setRanked] = useState(undefined);
  const [selectedRoleId, setSelectedRoleId] = useState(getTargetRoleId());
  const [readiness, setReadiness] = useState(undefined);

  useEffect(() => {
    getRankedRoleReadiness().then(setRanked);
    getTargetRoleIdAsync().then(setSelectedRoleId);
  }, []);

  useEffect(() => {
    setReadiness(undefined);
    getRoleReadiness(selectedRoleId).then(setReadiness);
  }, [selectedRoleId]);

  const handleSelectRole = (roleId) => {
    setSelectedRoleId(roleId);
    setTargetRoleId(roleId);
  };

  if (!ranked || !readiness) {
    return (
      <DashboardLayout>
        <LoadingState label="Building your career recommendations…" />
      </DashboardLayout>
    );
  }

  // Only "Current Skills" (the roadmap's first step) is ever marked done —
  // every later step (learning a specific gap, completing a project,
  // re-assessment, internship) requires progress no page tracks yet (that's
  // Step 5+), so showing them as complete would overstate readiness. This
  // stays accurate once real progress tracking exists: swap 0 for however
  // many roadmap steps are actually confirmed complete.
  const currentIndex = readiness.missingSkills.length === 0 ? readiness.role.roadmap.length - 1 : 0;

  return (
    <DashboardLayout>
      <header className="mb-8 border-b border-hairline pb-6">
        <h1 className="font-geist text-3xl text-ink tracking-tight mb-1">Career Path</h1>
        <p className="text-muted">See which roles you're closest to, and what it takes to get there.</p>
      </header>

      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-wide text-muted mb-4">Recommended Roles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ranked.map((r) => {
            const isSelected = r.role.id === selectedRoleId;
            return (
              <button
                key={r.role.id}
                onClick={() => handleSelectRole(r.role.id)}
                className={`text-left bg-white border rounded-xl p-5 transition-colors ${
                  isSelected ? "border-ink" : "border-hairline hover:border-ink"
                }`}
              >
                <p className="text-xs text-muted mb-1">{r.role.category}</p>
                <h3 className="text-base font-medium text-ink mb-3">{r.role.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-editorial text-ink tracking-tight">{r.readinessPercent}%</span>
                  <span className="text-xs text-muted">Readiness</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 flex flex-col gap-6">
          <section className="bg-white border border-hairline rounded-xl p-8">
            <p className="text-xs uppercase tracking-wide text-muted mb-1">Selected Role</p>
            <h2 className="font-geist text-2xl text-ink tracking-tight mb-4">{readiness.role.title}</h2>
            <div className="flex items-end gap-2 mb-1">
              <span className="font-editorial text-4xl text-ink tracking-tight">{readiness.readinessPercent}%</span>
              <span className="text-sm text-muted mb-1">Readiness</span>
            </div>
            <p className="text-sm text-muted mb-6">{readiness.role.description}</p>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-ink mb-2">Strong Skills</h4>
              {readiness.matchedSkills.length === 0 ? (
                <p className="text-sm text-muted">None verified yet.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {readiness.matchedSkills.map((s) => (
                    <li key={s.name} className="flex items-center gap-2 text-sm text-ink">
                      <CheckCircle size={16} weight="fill" className="text-pastel-green-ink" />
                      {s.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium text-ink mb-2">Needs Improvement</h4>
              {readiness.missingSkills.length === 0 ? (
                <p className="text-sm text-muted">You meet every required skill for this role.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {readiness.missingSkills.map((s) => (
                    <li key={s.name} className="flex items-center gap-2 text-sm text-charcoal">
                      <Circle size={16} className="text-muted" />
                      {s.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Link
              to="/skill-tests"
              className="mt-6 w-full flex items-center justify-center gap-2 bg-ink text-white text-sm px-4 py-2.5 rounded-md hover:bg-ink-hover active:scale-[0.98] transition-all"
            >
              Close a Skill Gap
              <ArrowRight size={16} />
            </Link>
          </section>
        </div>

        <div className="lg:col-span-7">
          <section className="bg-white border border-hairline rounded-xl p-8 h-full">
            <h3 className="text-base font-medium text-ink mb-6">Career Roadmap</h3>
            <RoadmapTrack steps={readiness.role.roadmap} currentIndex={currentIndex} />
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

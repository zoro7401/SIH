import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import { ArrowUpRight, CheckCircle, SealCheck, Warning } from "@phosphor-icons/react";
import { getSkillProfile } from "../../services/skillsService";

function overallProficiencyLabel(percent) {
  if (percent >= 85) return "Expert";
  if (percent >= 70) return "Advanced";
  if (percent >= 50) return "Intermediate";
  return "Developing";
}

function levelLabel(score) {
  if (score >= 90) return "Expert";
  if (score >= 70) return "Advanced";
  if (score >= 50) return "Intermediate";
  if (score >= 25) return "Beginner";
  return "Not yet started";
}

function formatDate(iso) {
  if (!iso) return "Not yet assessed";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const DISPLAY_THRESHOLD = 70;

export default function SkillProfileGapReport() {
  const navigate = useNavigate();
  const [data, setData] = useState(undefined);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("gap");

  useEffect(() => {
    getSkillProfile().then(setData);
  }, []);

  if (!data) {
    return (
      <DashboardLayout>
        <LoadingState fullScreen={false} label="Loading skill profile…" />
      </DashboardLayout>
    );
  }

  const { profile, strongSkills, skillGaps, overallMatchPercent, completedAt } = data;
  const reportSkills = profile.filter((skill) => skill.currentScore < DISPLAY_THRESHOLD);
  const reportGaps = skillGaps.filter((skill) => skill.currentScore < DISPLAY_THRESHOLD);
  const unassessedSkills = reportSkills.filter((skill) => skill.currentScore === 0);
  const visibleSkills = useMemo(() => {
    const skills = reportSkills.filter((skill) => {
      if (filter === "gaps") return skill.currentScore > 0;
      if (filter === "unassessed") return skill.currentScore === 0;
      return true;
    });
    return [...skills].sort((a, b) => {
      if (sortBy === "score") return b.currentScore - a.currentScore;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return (b.requiredScore - b.currentScore) - (a.requiredScore - a.currentScore);
    });
  }, [filter, reportSkills, sortBy]);
  const primaryDomain = strongSkills[0]?.category ?? "General";

  return (
    <DashboardLayout>
      {/*Header*/}
      <header className="border-b border-hairline pb-6 mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-geist text-3xl text-ink tracking-tight">Skill Profile &amp; Gap Report</h1>
          <p className="text-muted mt-2">Last assessed: {formatDate(completedAt)}</p>
        </div>
        <button
          onClick={() => navigate("/skill-assessment")}
          className="bg-ink text-white px-4 py-2 rounded-md text-sm hover:bg-ink-hover active:scale-[0.98] transition-all self-start md:self-auto"
        >
          Retake Assessment
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/*Left Column: Summary & Strong Skills*/}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/*Overview Card*/}
          <section className="bg-white border border-hairline rounded-xl p-8">
            <div className="flex items-start justify-between gap-4 mb-4 border-b border-hairline pb-3">
              <div>
                <h3 className="text-base font-medium text-ink">Core Competency Overview</h3>
                <p className="text-sm text-muted mt-1">
                  Your score measures progress toward each skill&apos;s readiness target.
                </p>
              </div>
              <span className="text-2xl font-medium text-ink">{overallMatchPercent}%</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="border border-hairline p-4 rounded-lg flex flex-col items-start bg-bone">
                <span className="text-xs uppercase tracking-wide text-muted mb-1">Overall Proficiency</span>
                <span className="text-lg font-medium text-ink">{overallProficiencyLabel(overallMatchPercent)}</span>
              </div>
              <div className="border border-hairline p-4 rounded-lg flex flex-col items-start bg-bone">
                <span className="text-xs uppercase tracking-wide text-muted mb-1">Primary Domain</span>
                <span className="text-lg font-medium text-ink">{primaryDomain}</span>
              </div>
              <div className="border border-hairline p-4 rounded-lg flex flex-col items-start bg-bone">
                <span className="text-xs uppercase tracking-wide text-muted mb-1">Identified Gaps</span>
                <span className="text-lg font-medium text-pastel-red-ink">{reportGaps.length} {reportGaps.length === 1 ? "Gap" : "Gaps"}</span>
              </div>
              <div className="border border-hairline p-4 rounded-lg flex flex-col items-start bg-bone">
                <span className="text-xs uppercase tracking-wide text-muted mb-1">Not assessed</span>
                <span className="text-lg font-medium text-ink">{unassessedSkills.length}</span>
              </div>
            </div>
          </section>

          {/*Skill breakdown*/}
          <section className="bg-white border border-hairline rounded-xl p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 border-b border-hairline pb-4">
              <div className="flex items-center gap-2">
                <SealCheck size={18} className="text-pastel-green-ink" />
                <div>
                  <h3 className="text-base font-medium text-ink">Skill breakdown</h3>
                  <p className="text-xs text-muted mt-0.5">Prioritized by the distance from each target.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <select value={filter} onChange={(event) => setFilter(event.target.value)} className="border border-hairline rounded-md px-2 py-1.5 text-xs text-charcoal bg-white">
                  <option value="all">All skills</option>
                  <option value="gaps">Needs improvement</option>
                  <option value="unassessed">Not assessed</option>
                </select>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="border border-hairline rounded-md px-2 py-1.5 text-xs text-charcoal bg-white">
                  <option value="gap">Sort: biggest gap</option>
                  <option value="score">Sort: highest score</option>
                  <option value="name">Sort: name</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {visibleSkills.length === 0 && <p className="text-sm text-muted">No skills below 70% match this filter.</p>}
              {visibleSkills.map((item) => {
                const gap = Math.max(item.requiredScore - item.currentScore, 0);
                const isStrong = item.currentScore >= item.requiredScore;
                return (
                <div key={item.name} className="border-b border-hairline last:border-0 pb-4 last:pb-0">
                  <div className="flex justify-between gap-4 mb-1.5">
                    <div>
                      <span className="text-sm text-ink">{item.name}</span>
                      <span className="block text-xs text-muted mt-0.5">{item.category} · target {item.requiredScore}%</span>
                    </div>
                    <span className={`text-xs whitespace-nowrap ${isStrong ? "text-pastel-green-ink" : "text-muted"}`}>
                      {levelLabel(item.currentScore)} ({item.currentScore}%)
                    </span>
                  </div>
                  <div className="w-full bg-bone h-1.5 rounded-full overflow-hidden">
                    <div className={isStrong ? "bg-pastel-green-ink h-full" : "bg-ink h-full"} style={{ width: `${item.currentScore}%` }}></div>
                  </div>
                  <p className="text-xs text-muted mt-1.5">
                    {isStrong ? "Ready for this target." : item.currentScore === 0 ? "Take an assessment to establish your baseline." : `${gap} points below target.`}
                  </p>
                </div>
                );
              })}
            </div>
          </section>
        </div>

        {/*Right Column: Skill Gaps & Recommendations*/}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <section className="bg-white border border-hairline rounded-xl p-8 h-full">
            <div className="flex items-center gap-2 mb-4 border-b border-hairline pb-3">
              <Warning size={18} className="text-pastel-red-ink" />
              <h3 className="text-base font-medium text-ink">Identified Skill Gaps</h3>
            </div>
            <div className="flex flex-col gap-4">
              {reportGaps.length === 0 && <p className="text-sm text-muted">No skills below 70% need improvement — nice work.</p>}
              {reportGaps.slice(0, 5).map((gap) => (
                <div key={gap.name} className="border border-hairline p-4 rounded-lg bg-bone">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm text-ink">{gap.name}</h4>
                    <span className="px-2 py-0.5 bg-white border border-hairline rounded text-xs text-charcoal">{levelLabel(gap.currentScore)}</span>
                  </div>
                  <div className="w-full bg-white h-1.5 rounded-full overflow-hidden mb-2 border border-hairline">
                    <div className="bg-muted h-full" style={{ width: `${gap.currentScore}%` }}></div>
                  </div>
                  <p className="text-sm text-muted">{gap.gap} points below the {gap.requiredScore}% target.</p>
                  <Link to="/learning-paths" className="inline-flex items-center gap-1 mt-2 text-sm text-ink hover:underline">
                    Improve this skill <ArrowUpRight size={14} />
                  </Link>
                </div>
              ))}
              {reportGaps.length > 5 && <p className="text-xs text-muted">Showing the 5 highest-priority gaps. Use the skill breakdown to view all {reportGaps.length} gaps.</p>}
            </div>
          </section>
          <section className="bg-pastel-green border border-hairline rounded-xl p-6">
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-pastel-green-ink mt-0.5" />
              <div>
                <h3 className="text-base font-medium text-ink">Next best action</h3>
                <p className="text-sm text-charcoal mt-1">
                  Focus on <strong>{reportGaps[0]?.name ?? "your strongest skills"}</strong> first, then retake the assessment to measure progress.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

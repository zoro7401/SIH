import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import { getSkillProfile } from "../../services/skillsService";

function relativeTime(iso) {
  if (!iso) return "Not yet assessed";
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

function trustTag(trustLevel) {
  return `${trustLevel} skill`;
}

export default function SkillProfileGraph() {
  const [data, setData] = useState(undefined);

  useEffect(() => {
    getSkillProfile().then(setData);
  }, []);

  if (!data) {
    return (
      <DashboardLayout>
        <LoadingState fullScreen={false} label="Loading skill graph…" />
      </DashboardLayout>
    );
  }

  const { strongSkills, skillGaps, overallMatchPercent } = data;
  const provenCount = strongSkills.length;
  const totalCount = strongSkills.length + skillGaps.length;

  return (
    <DashboardLayout>
      <header className="mb-8 border-b border-hairline pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-geist text-3xl text-ink tracking-tight mb-1">Skill Profile</h1>
          <p className="text-muted">Living Skill Graph</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/*Readiness Score & Recommendations*/}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white border border-hairline p-8 rounded-xl flex flex-col items-center text-center">
            <h2 className="text-xs uppercase tracking-wide text-muted mb-3">Current Readiness Score</h2>
            <div className="font-editorial text-4xl text-ink tracking-tight mb-2">{overallMatchPercent}%</div>
            <p className="text-sm text-charcoal">
              You match {provenCount} out of {totalCount} core competencies.
            </p>
          </div>
          <div className="bg-white border border-hairline p-6 rounded-xl">
            <h3 className="text-base font-medium text-ink mb-3">Recommended Next Activity</h3>
            <p className="text-muted mb-6 text-sm leading-relaxed">
              {skillGaps[0]
                ? `Close your biggest gap: ${skillGaps[0].name} (${skillGaps[0].gap} points behind target).`
                : "Try a Proof-of-Skill challenge to keep your profile fresh."}
            </p>
            <Link
              to="/proof-of-skill"
              className="block text-center w-full bg-ink text-white hover:bg-ink-hover active:scale-[0.98] transition-all py-2.5 px-4 rounded-md text-sm"
            >
              Begin Challenge
            </Link>
          </div>
        </div>

        {/*Skills Detail*/}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/*Proven Skills*/}
          <div className="bg-white border border-hairline rounded-xl">
            <div className="border-b border-hairline p-5">
              <h2 className="text-xs uppercase tracking-wide text-muted">Skills Already Proven</h2>
            </div>
            <ul className="divide-y divide-hairline">
              {strongSkills.length === 0 && <li className="p-5 text-sm text-muted">Complete the skill assessment to populate this list.</li>}
              {strongSkills.map((item) => (
                <li key={item.name} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-medium text-ink">{item.name}</span>
                      <span className="bg-bone px-2 py-0.5 rounded text-xs text-charcoal">{trustTag(item.trustLevel)}</span>
                    </div>
                    <p className="text-sm text-muted">Last updated: {relativeTime(item.lastUpdated)}</p>
                  </div>
                  <div className="w-full md:w-48 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-bone rounded-full overflow-hidden">
                      <div className="h-full bg-ink" style={{ width: `${item.currentScore}%` }}></div>
                    </div>
                    <span className="text-xs text-muted w-8 text-right">{item.currentScore}%</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/*Missing Skills*/}
          <div className="bg-white border border-hairline rounded-xl">
            <div className="border-b border-hairline p-5">
              <h2 className="text-xs uppercase tracking-wide text-muted">Missing Competencies</h2>
            </div>
            <ul className="divide-y divide-hairline">
              {skillGaps.length === 0 && <li className="p-5 text-sm text-muted">No missing competencies against your target profile.</li>}
              {skillGaps.map((item) => (
                <li key={item.name} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h4 className="text-base font-medium text-ink">{item.name}</h4>
                    <p className="text-sm text-muted">
                      {item.gap} points below the {item.requiredScore}% target.
                    </p>
                  </div>
                  <Link
                    to="/courses"
                    className="border border-hairline text-charcoal hover:bg-bone transition-colors py-1.5 px-3 rounded-md text-sm"
                  >
                    Explore Courses
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

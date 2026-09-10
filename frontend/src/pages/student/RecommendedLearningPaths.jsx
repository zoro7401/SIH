import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { getLearningPaths, getIndustryPrograms } from "../../services/learningPathsService";
import { CheckCircle, Circle, GraduationCap, Rocket, Buildings } from "@phosphor-icons/react";

export default function RecommendedLearningPaths() {
  const navigate = useNavigate();
  const [paths, setPaths] = useState(undefined);
  const [programs, setPrograms] = useState(undefined);

  useEffect(() => {
    getLearningPaths().then(setPaths);
    getIndustryPrograms().then(setPrograms);
  }, []);

  return (
    <DashboardLayout>
      <header className="mb-10">
        <h2 className="font-geist text-3xl text-ink tracking-tight mb-2">Learning &amp; Skill Development</h2>
        <p className="text-muted max-w-2xl leading-relaxed">
          Explore learning paths for every technical and soft skill in your profile. Paths linked to your current gaps
          appear first so you can improve your role readiness faster.
        </p>
      </header>

      {paths === undefined && <LoadingState label="Loading learning paths…" />}

      {paths && paths.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title="No learning paths yet"
          description="Take a skill assessment or pick a target role to get personalized learning paths based on your gaps."
        />
      )}

      {paths && paths.length > 0 && (
        <section className="mb-12">
          <h3 className="text-xs uppercase tracking-wide text-muted mb-4">All Skill Learning Paths</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {paths.map((path) => {
              return (
                <article key={path.skillName} className="bg-white border border-hairline rounded-xl flex flex-col h-full">
                  <div className="p-6 flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-medium text-ink">{path.title}</h3>
                      <span className="bg-bone px-2.5 py-1 rounded-full text-xs uppercase tracking-wide text-charcoal whitespace-nowrap">
                        {path.duration}
                      </span>
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-muted mb-1">
                        <span>Progress</span>
                        <span>{path.progressPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-bone rounded-full overflow-hidden">
                        <div className="h-full bg-ink rounded-full" style={{ width: `${path.progressPercent}%` }} />
                      </div>
                    </div>
                    <h4 className="text-xs uppercase tracking-wide text-muted mb-2">Modules</h4>
                    <ul className="flex flex-col gap-2 mb-4 border-t border-hairline pt-3">
                      {path.modules.map((module, i) => {
                        const done = i < path.completed;
                        return (
                          <li key={module} className="flex items-start gap-2">
                            {done ? (
                              <CheckCircle size={16} className="text-pastel-green-ink mt-0.5" weight="fill" />
                            ) : (
                              <Circle size={16} className="text-muted mt-0.5" />
                            )}
                            <span className={`text-sm ${done ? "text-muted line-through" : "text-charcoal"}`}>{module}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="border-t border-hairline pt-3 flex items-start gap-2">
                      <Rocket size={16} className="text-ink mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted mb-0.5">Recommended Project</p>
                        <p className="text-sm text-charcoal">{path.project.title}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 border-t border-hairline mt-auto">
                    <button
                      onClick={() => navigate(`/learning-paths/study?skill=${encodeURIComponent(path.skillName)}`)}
                      className="block text-center w-full bg-ink text-white rounded-md text-sm py-2.5 hover:bg-ink-hover active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      Study
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {programs && programs.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wide text-muted mb-4">Industry Programs</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {programs.map((program) => (
              <article key={program.id} className="bg-white border border-hairline rounded-xl p-6">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-base font-medium text-ink">{program.title}</h4>
                  <span className="bg-bone px-2.5 py-1 rounded-full text-xs uppercase tracking-wide text-charcoal whitespace-nowrap">
                    {program.durationWeeks} Weeks
                  </span>
                </div>
                <p className="text-sm text-muted mb-4 flex items-center gap-1.5">
                  <Buildings size={14} />
                  {program.company}
                </p>
                <ul className="flex flex-col gap-1.5">
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
        </section>
      )}
    </DashboardLayout>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import SkillTestCard from "../../components/common/SkillTestCard";
import { getSkillTests, getAssessmentHistory } from "../../services/skillTestService";
import { MagnifyingGlass, ClockCounterClockwise, CheckCircle, XCircle, Trophy, Sparkle, CircleNotch } from "@phosphor-icons/react";
import { aiAdvisorAPI } from "../../services/api";

const CATEGORY_FILTERS = ["All", "Technical Skill", "Soft Skill"];

export default function SkillTests() {
  const navigate = useNavigate();
  const [tests, setTests] = useState(undefined);
  const [history, setHistory] = useState(undefined);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [skillAnalysis, setSkillAnalysis] = useState(undefined);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    getSkillTests().then(setTests);
    getAssessmentHistory().then(setHistory);
    aiAdvisorAPI.analyzeLatestRun(false).then(setSkillAnalysis).catch(() => setSkillAnalysis(null));
  }, []);

  const generateAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      setSkillAnalysis(await aiAdvisorAPI.analyzeLatestRun(true));
    } finally {
      setAnalysisLoading(false);
    }
  };

  const filteredTests = useMemo(() => {
    if (!tests) return tests;
    return tests.filter((t) => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "All" || t.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [tests, search, category]);

  return (
    <DashboardLayout>
      <header className="mb-8 border-b border-hairline pb-6">
        <h1 className="font-geist text-3xl text-ink tracking-tight mb-1">My Assessments</h1>
        <p className="text-muted">Pass a skill test to verify it on your profile — employers see Assessment Verified skills as trusted.</p>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem] gap-8 items-start">
        <div>
      {/*Search / filter across all 12 domains*/}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-hairline bg-white rounded-md text-sm focus:border-ink focus:outline-none focus:ring-0 placeholder:text-muted"
            placeholder="Search assessment domains…"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {CATEGORY_FILTERS.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-2 rounded-md text-sm border transition-colors cursor-pointer ${
                category === c ? "bg-ink text-white border-ink" : "bg-white text-charcoal border-hairline hover:border-ink"
              }`}
            >
              {c === "All" ? "All Domains" : c === "Technical Skill" ? "Technical" : "Soft Skills"}
            </button>
          ))}
        </div>
      </div>

      {!tests && <LoadingState label="Loading assessments…" />}

      {tests && (
        <>
          <p className="text-xs text-muted mb-3">
            {filteredTests.length} of {tests.length} domains
          </p>
          {filteredTests.length === 0 ? (
            <EmptyState icon={MagnifyingGlass} title="No domains match your search" description="Try a different search term or filter." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
              {filteredTests.map((test) => (
                <SkillTestCard
                  key={test.id}
                  title={test.title}
                  category={test.category}
                  questionCount={test.questionCount}
                  durationMinutes={test.durationMinutes}
                  lastResult={test.lastResult}
                  onStart={() => navigate(`/skill-tests/${test.id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/*Assessment History (Issue 6) — every past attempt, persisted server-side,
         never re-asked for once completed. Shows best score + latest attempt
         distinctly when retakes exist.*/}
      <section className="mt-4">
        <div className="flex items-center gap-2 mb-4">
          <ClockCounterClockwise size={20} className="text-ink" />
          <h2 className="text-lg font-medium text-ink">Assessment History</h2>
        </div>

        {history === undefined && <LoadingState fullScreen={false} label="Loading history…" />}

        {history && history.length === 0 && (
          <EmptyState
            icon={ClockCounterClockwise}
            title="No assessments completed yet"
            description="Once you complete an assessment, your results and history will appear here permanently — you won't need to retake it to see your score again."
          />
        )}

        {history && history.length > 0 && (
          <div className="bg-white border border-hairline rounded-xl divide-y divide-hairline">
            {history.map((entry) => (
              <div key={entry.testId} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-base font-medium text-ink">{entry.title}</h3>
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full uppercase tracking-wide ${
                        entry.latest.passed ? "bg-pastel-green text-pastel-green-ink" : "bg-pastel-red text-pastel-red-ink"
                      }`}
                    >
                      {entry.latest.passed ? <CheckCircle size={12} weight="bold" /> : <XCircle size={12} weight="bold" />}
                      {entry.latest.passed ? "Assessment Verified" : "Not Verified"}
                    </span>
                    {entry.attemptCount > 1 && (
                      <span className="text-xs text-muted">
                        {entry.attemptCount} attempts
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted">
                    Latest score: <span className="text-charcoal font-medium">{entry.latest.scorePercent}%</span>
                    {entry.attemptCount > 1 && (
                      <>
                        {" "}
                        · Best:{" "}
                        <span className="inline-flex items-center gap-1 text-charcoal font-medium">
                          <Trophy size={12} className="text-pastel-blue-ink" />
                          {entry.bestScore}%
                        </span>
                      </>
                    )}
                    {" "}· Attempted{" "}
                    {new Date(entry.latest.completedAt).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/skill-tests/${entry.testId}/result`)}
                    className="px-4 py-2 border border-hairline rounded-md text-charcoal text-sm hover:bg-bone transition-colors cursor-pointer"
                  >
                    View Result
                  </button>
                  <button
                    onClick={() => navigate(`/skill-tests/${entry.testId}`)}
                    className="px-4 py-2 text-ink text-sm hover:text-muted transition-colors cursor-pointer"
                  >
                    Retake
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
        </div>

        <aside className="lg:sticky lg:top-6 bg-white border border-hairline rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkle size={18} className="text-pastel-blue-ink" />
            <h2 className="text-base font-medium text-ink">Latest AI Review</h2>
          </div>
          <p className="text-xs text-muted mb-5">Saved from your latest completed assessment.</p>

          {skillAnalysis === undefined && (
            <div className="flex items-center gap-2 text-sm text-muted py-4">
              <CircleNotch size={16} className="animate-spin" /> Loading review…
            </div>
          )}
          {skillAnalysis === null && (
            <div>
              <p className="text-sm text-muted mb-4">No saved AI review exists for your latest assessment.</p>
              <button
                type="button"
                onClick={generateAnalysis}
                disabled={analysisLoading}
                className="w-full bg-ink text-white text-sm px-3 py-2 rounded-md hover:bg-ink-hover transition-colors disabled:opacity-60"
              >
                {analysisLoading ? "Generating…" : "Generate AI Analysis"}
              </button>
            </div>
          )}
          {skillAnalysis && (
            <div className="flex flex-col gap-5">
              {skillAnalysis.basedOn?.map((result) => (
                <div key={result.skillName} className="flex items-center justify-between text-sm border-b border-hairline pb-2">
                  <span className="text-charcoal truncate pr-2">{result.skillName}</span>
                  <span className="font-medium text-ink">{result.scorePercent}%</span>
                </div>
              ))}
              <div>
                <p className="text-xs uppercase tracking-wide text-muted mb-2">Strong points</p>
                <ul className="flex flex-col gap-2">
                  {skillAnalysis.analysis.strengths.slice(0, 3).map((item, index) => (
                    <li key={index} className="text-sm text-charcoal"><span className="font-medium text-ink">{item.skill}:</span> {item.note}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted mb-2">Weak points</p>
                <ul className="flex flex-col gap-2">
                  {skillAnalysis.analysis.weaknesses.slice(0, 3).map((item, index) => (
                    <li key={index} className="text-sm text-charcoal"><span className="font-medium text-ink">{item.skill}:</span> {item.note}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted mb-2">Roadmap</p>
                <ol className="list-decimal list-inside flex flex-col gap-2">
                  {skillAnalysis.analysis.roadmap.slice(0, 4).map((step, index) => (
                    <li key={index} className="text-sm text-charcoal">{step.title}</li>
                  ))}
                </ol>
              </div>
              <p className="text-[11px] text-muted">Provider: {skillAnalysis.provider} · {skillAnalysis.stored ? "Saved" : "Generated"}</p>
            </div>
          )}
        </aside>
      </div>
    </DashboardLayout>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import StatCard from "../../components/common/StatCard";
import SkillProgress from "../../components/common/SkillProgress";
import { useAuth } from "../../hooks/useAuth";
import { getSkillProfile } from "../../services/skillsService";
import { getApplications } from "../../services/applicationsService";
import { getInternshipsWithMatch } from "../../services/matchService";
import { getCourses } from "../../services/coursesService";
import { aiAdvisorAPI } from "../../services/api";
import {
  Target,
  Briefcase,
  CalendarBlank,
  Sparkle,
  Clock,
  Code,
  ShieldCheck,
  TrendUp,
  UserCircle,
  TrendDown,
  MapTrifold,
  CircleNotch,
} from "@phosphor-icons/react";

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [skillProfile, setSkillProfile] = useState(undefined);
  const [showSkillGapReport, setShowSkillGapReport] = useState(false);
  const [applications, setApplications] = useState(undefined);
  const [topMatches, setTopMatches] = useState(undefined);
  const [courses, setCourses] = useState(undefined);
  // AI skill analysis popup (weak/strong points + roadmap from the most
  // recently completed dynamic test run) — separate from the Skill Gap
  // Report modal above, which reflects the self-rating/overall profile
  // rather than one specific test run's scores and level breakdowns.
  const [showSkillAnalysis, setShowSkillAnalysis] = useState(false);
  const [skillAnalysis, setSkillAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  useEffect(() => {
    getSkillProfile().then(setSkillProfile);
    getApplications().then(setApplications);
    getInternshipsWithMatch().then((jobs) => setTopMatches(jobs.slice(0, 2)));
    getCourses().then((c) => setCourses(c.slice(0, 1)));
  }, []);

  const activeApplications = applications?.filter((a) => a.status !== "Closed" && a.status !== "Rejected").length ?? "—";
  const upcomingInterviews = applications?.filter((a) => a.status === "Interview").length ?? "—";

  const startAssessment = (fromBeginning = false) => {
    navigate(fromBeginning ? "/skill-assessment?start=beginning" : "/skill-assessment");
  };

  // Fetches an AI analysis (strengths/weaknesses/roadmap) of the student's
  // most recently completed skill-test run — see
  // aiAdvisorController.analyzeLatestSkillRun. Opens the modal immediately
  // so the loading/error state is visible inside it rather than only on the button.
  const runSkillAnalysis = async () => {
    setShowSkillAnalysis(true);
    setAnalysisLoading(true);
    setAnalysisError("");
    try {
      const data = await aiAdvisorAPI.analyzeLatestRun(true);
      setSkillAnalysis(data);
    } catch (err) {
      setAnalysisError(err.message || "Something went wrong analyzing your results.");
      setSkillAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <DashboardLayout>
      {/*Welcome Header*/}
      <header className="mb-10">
        <h1 className="font-geist text-4xl text-ink tracking-tight mb-2">Welcome back, {user?.name || "Student"}</h1>
        <p className="text-muted leading-relaxed">Here is a summary of your academic progress and opportunities.</p>
      </header>

      {skillProfile && !skillProfile.completedAt && (
        <section className="mb-10 bg-ink text-white rounded-xl p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#cfcfcf] mb-2">Start here</p>
            <h2 className="font-geist text-2xl tracking-tight mb-2">Give your skills a starting point</h2>
            <p className="text-sm text-[#cfcfcf] max-w-xl leading-relaxed">
              Complete your skill assessment to see your strengths, identify gaps, and get more relevant opportunities.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => startAssessment()}
              className="bg-white text-ink text-sm px-4 py-2.5 rounded-md hover:bg-[#eeeeee] transition-colors"
            >
              Give skill assessment
            </button>
            <button
              type="button"
              onClick={() => startAssessment(true)}
              className="border border-[#777777] text-white text-sm px-4 py-2.5 rounded-md hover:bg-ink-hover transition-colors"
            >
              Start from beginning
            </button>
          </div>
        </section>
      )}

      {skillProfile?.completedAt && (
        <section className="mb-10 bg-white border border-hairline rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-ink">Skill Gap Report</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={runSkillAnalysis}
              disabled={analysisLoading}
              className="border border-hairline text-charcoal text-sm px-4 py-2.5 rounded-md hover:bg-bone transition-colors self-start sm:self-auto disabled:opacity-60 flex items-center gap-2"
            >
              {analysisLoading ? <CircleNotch size={16} className="animate-spin" /> : <Sparkle size={16} />}
              {analysisLoading ? "Analyzing…" : "Analysis"}
            </button>
            <button
              type="button"
              onClick={() => startAssessment(true)}
              className="bg-ink text-white text-sm px-4 py-2.5 rounded-md hover:bg-ink-hover transition-colors self-start sm:self-auto"
            >
              Retake the test
            </button>
          </div>
        </section>
      )}

      {showSkillGapReport && skillProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowSkillGapReport(false);
          }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-hairline rounded-xl p-6 md:p-8 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="skill-gap-report-title">
            <div className="flex items-start justify-between gap-4 border-b border-hairline pb-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted mb-1">Assessment results</p>
                <h2 id="skill-gap-report-title" className="font-geist text-2xl text-ink tracking-tight">Skill Gap Report</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSkillGapReport(false)}
                className="text-sm text-muted hover:text-ink transition-colors"
                aria-label="Close skill gap report"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="border border-hairline rounded-lg p-4 bg-bone">
                <p className="text-xs uppercase tracking-wide text-muted mb-1">Overall score</p>
                <p className="text-lg font-medium text-ink">{skillProfile.overallMatchPercent}%</p>
              </div>
              <div className="border border-hairline rounded-lg p-4 bg-bone">
                <p className="text-xs uppercase tracking-wide text-muted mb-1">Strong skills</p>
                <p className="text-lg font-medium text-ink">{skillProfile.strongSkills.length}</p>
              </div>
              <div className="border border-hairline rounded-lg p-4 bg-bone">
                <p className="text-xs uppercase tracking-wide text-muted mb-1">Identified gaps</p>
                <p className="text-lg font-medium text-pastel-red-ink">{skillProfile.skillGaps.length}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-base font-medium text-ink">Assessment Data</h3>
              {skillProfile.profile.filter((skill) => skill.lastUpdated).sort((a, b) => b.currentScore - a.currentScore).map((skill) => (
                <div key={skill.name}>
                  <div className="flex justify-between gap-4 mb-1">
                    <span className="text-sm text-ink">{skill.name}</span>
                    <span className="text-xs text-muted whitespace-nowrap">{skill.proficiencyLevel ?? (skill.currentScore === 0 ? "Not yet started" : `${skill.currentScore}%`)} ({skill.currentScore}%)</span>
                  </div>
                  <div className="w-full bg-bone h-1.5 rounded-full overflow-hidden">
                    <div className="bg-ink h-full" style={{ width: `${skill.currentScore}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-hairline">
              <button
                type="button"
                onClick={() => navigate("/learning-paths")}
                className="border border-hairline text-charcoal text-sm px-4 py-2 rounded-md hover:bg-bone transition-colors"
              >
                Improve your skills
              </button>
              <button
                type="button"
                onClick={() => navigate("/skill-assessment?retake=true&start=beginning")}
                className="bg-ink text-white text-sm px-4 py-2 rounded-md hover:bg-ink-hover transition-colors"
              >
                Retake assessment
              </button>
            </div>
          </div>
        </div>
      )}

      {showSkillAnalysis && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowSkillAnalysis(false);
          }}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-hairline rounded-xl p-6 md:p-8 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="skill-analysis-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-hairline pb-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted mb-1">AI Skill Analysis</p>
                <h2 id="skill-analysis-title" className="font-geist text-2xl text-ink tracking-tight">
                  Your Latest Assessment Results
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSkillAnalysis(false)}
                className="text-sm text-muted hover:text-ink transition-colors flex-shrink-0"
                aria-label="Close skill analysis"
              >
                Close
              </button>
            </div>

            {analysisLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted">
                <CircleNotch size={28} className="animate-spin" />
                <p className="text-sm">Analyzing your results…</p>
              </div>
            )}

            {!analysisLoading && analysisError && (
              <div className="text-center py-12">
                <p className="text-sm text-muted mb-6">{analysisError}</p>
                <button
                  type="button"
                  onClick={() => navigate("/skill-assessment")}
                  className="bg-ink text-white text-sm px-4 py-2.5 rounded-md hover:bg-ink-hover transition-colors"
                >
                  Take a Skill Assessment
                </button>
              </div>
            )}

            {!analysisLoading && !analysisError && skillAnalysis && (
              <div className="flex flex-col gap-8">
                {skillAnalysis.basedOn?.length > 0 && (
                  <p className="text-xs text-muted -mt-2">
                    Based on your latest run: {skillAnalysis.basedOn.map((b) => `${b.skillName} (${b.scorePercent}%)`).join(", ")}
                  </p>
                )}

                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendUp size={18} className="text-pastel-green-ink" />
                    <h3 className="text-base font-medium text-ink">Strong Points</h3>
                  </div>
                  <div className="flex flex-col gap-2">
                    {skillAnalysis.analysis.strengths.map((s, i) => (
                      <div key={i} className="border border-hairline bg-pastel-green/20 rounded-lg p-3">
                        <p className="text-sm font-medium text-ink">{s.skill}</p>
                        <p className="text-sm text-muted">{s.note}</p>
                      </div>
                    ))}
                    {skillAnalysis.analysis.strengths.length === 0 && (
                      <p className="text-sm text-muted">No clear strengths identified yet.</p>
                    )}
                  </div>
                </section>

                {skillAnalysis.analysis.questionReview?.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <Code size={18} className="text-pastel-blue-ink" />
                      <h3 className="text-base font-medium text-ink">Question-by-Question Review</h3>
                    </div>
                    <div className="flex flex-col gap-3">
                      {skillAnalysis.analysis.questionReview.map((review, i) => (
                        <div key={i} className="border border-hairline rounded-lg p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="text-sm font-medium text-ink">{i + 1}. {review.question}</p>
                            <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${
                              review.result === "correct" ? "bg-pastel-green text-pastel-green-ink" : "bg-pastel-red text-pastel-red-ink"
                            }`}>
                              {review.result === "correct" ? "Correct" : "Review"}
                            </span>
                          </div>
                          <p className="text-xs text-muted capitalize mb-1">{review.skill} · {review.level}</p>
                          <p className="text-sm text-charcoal">{review.review}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendDown size={18} className="text-pastel-red-ink" />
                    <h3 className="text-base font-medium text-ink">Weak Points</h3>
                  </div>
                  <div className="flex flex-col gap-2">
                    {skillAnalysis.analysis.weaknesses.map((w, i) => (
                      <div key={i} className="border border-hairline bg-pastel-red/20 rounded-lg p-3">
                        <p className="text-sm font-medium text-ink">{w.skill}</p>
                        <p className="text-sm text-muted">{w.note}</p>
                      </div>
                    ))}
                    {skillAnalysis.analysis.weaknesses.length === 0 && (
                      <p className="text-sm text-muted">No significant weaknesses identified.</p>
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <MapTrifold size={18} className="text-pastel-blue-ink" />
                    <h3 className="text-base font-medium text-ink">Roadmap to Improve</h3>
                  </div>
                  <div className="flex flex-col gap-3">
                    {skillAnalysis.analysis.roadmap.map((step, i) => (
                      <div key={i} className="border border-hairline rounded-lg p-4">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs font-medium text-muted">Step {i + 1}</span>
                          <p className="text-sm font-medium text-ink">{step.title}</p>
                        </div>
                        {step.focus && <p className="text-xs text-muted mb-2">Focus: {step.focus}</p>}
                        <ul className="list-disc list-inside flex flex-col gap-1">
                          {step.steps?.map((line, j) => (
                            <li key={j} className="text-sm text-charcoal">
                              {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

          </div>
        </div>
      )}

      {/*Stat Cards Grid*/}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <StatCard label="Skill Match" value={skillProfile ? `${skillProfile.overallMatchPercent}%` : "…"} icon={Target} valueColorClass="text-pastel-blue-ink" />
        <StatCard label="Active Applications" value={activeApplications} icon={Briefcase} />
        <StatCard label="Upcoming Interviews" value={upcomingInterviews} icon={CalendarBlank} iconColorClass="text-pastel-red-ink" />
      </section>

      {/*Main Content Bento Grid*/}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/*Left Column: Skills & Opportunities*/}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/*Skill Gap Analysis*/}
          <section className="bg-white border border-hairline rounded-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-ink">Skill Gap Analysis</h3>
              <Link to="/skill-profile/gap-report" className="text-xs uppercase tracking-wide text-ink hover:text-muted transition-colors">
                View details
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {skillProfile ? (
                skillProfile.skillGaps
                  .slice(0, 3)
                  .map((s, i) => <SkillProgress key={s.name} label={s.name} percent={s.currentScore} index={i} />)
              ) : (
                <p className="text-sm text-muted col-span-3">Loading skill profile…</p>
              )}
            </div>
          </section>

          {/*Recommended Opportunities*/}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-ink">Recommended Opportunities</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!topMatches && <p className="text-sm text-muted">Loading opportunities…</p>}
              {topMatches?.map((job) => (
                <article key={job.id} className="bg-white border border-hairline rounded-xl p-5 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <span className="w-9 h-9 rounded-md flex items-center justify-center bg-pastel-blue text-pastel-blue-ink">
                      <Sparkle size={16} weight="bold" />
                    </span>
                    <span className="bg-bone text-muted px-2.5 py-1 rounded-full text-xs uppercase tracking-wide">
                      {job.match.overallScore}% Match
                    </span>
                  </div>
                  <h4 className="text-base font-medium text-ink mb-1">{job.title}</h4>
                  <p className="text-sm text-muted mb-6">{job.company}</p>
                  <div className="mt-auto flex justify-end">
                    <Link
                      to={`/internships/${job.id}`}
                      className="border border-hairline text-ink text-sm px-4 py-2 rounded-md hover:bg-bone transition-colors"
                    >
                      View Opportunity
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        {/*Right Column: Recommended Courses*/}
        <div className="lg:col-span-4">
          <section className="bg-white border border-hairline rounded-xl p-6 h-full flex flex-col">
            <h3 className="text-lg font-medium text-ink mb-6">Recommended Courses</h3>
            <div className="space-y-3 flex-1">
              {!courses && <p className="text-sm text-muted">Loading courses…</p>}
              {courses?.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="block border border-hairline rounded-xl p-4 hover:shadow-lift transition-shadow group"
                >
                  <h4 className="text-sm font-medium text-ink mb-1">{course.title}</h4>
                  <p className="text-xs text-muted mb-2">{course.provider}</p>
                  <div className="flex items-center gap-1.5 text-muted">
                    <Clock size={13} />
                    <span className="text-xs">{course.duration}</span>
                  </div>
                </Link>
              ))}
            </div>
            <Link
              to="/courses"
              className="mt-6 w-full text-center bg-ink text-white text-sm px-4 py-2.5 rounded-md hover:bg-ink-hover active:scale-[0.98] transition-all"
            >
              Browse Full Catalog
            </Link>
          </section>
        </div>
      </div>

      {/*Career Tools*/}
      <section className="mt-6">
        <h3 className="text-lg font-medium text-ink mb-4">Career Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/portfolio" className="bg-white border border-hairline rounded-xl p-5 hover:shadow-lift transition-shadow flex flex-col gap-2">
            <UserCircle size={20} className="text-ink" />
            <span className="text-sm font-medium text-ink">Preview Portfolio</span>
            <span className="text-xs text-muted">See your professional profile the way employers do.</span>
          </Link>
          <Link to="/proof-of-skill" className="bg-white border border-hairline rounded-xl p-5 hover:shadow-lift transition-shadow flex flex-col gap-2">
            <Code size={20} className="text-ink" />
            <span className="text-sm font-medium text-ink">Proof-of-Skill Challenge</span>
            <span className="text-xs text-muted">Verify a skill with a real coding challenge.</span>
          </Link>
          <Link to="/career-twin" className="bg-white border border-hairline rounded-xl p-5 hover:shadow-lift transition-shadow flex flex-col gap-2">
            <TrendUp size={20} className="text-ink" />
            <span className="text-sm font-medium text-ink">Career Digital Twin</span>
            <span className="text-xs text-muted">See your projected readiness after learning.</span>
          </Link>
          <Link to="/employer-trust" className="bg-white border border-hairline rounded-xl p-5 hover:shadow-lift transition-shadow flex flex-col gap-2">
            <ShieldCheck size={20} className="text-ink" />
            <span className="text-sm font-medium text-ink">Employer Trust Layer</span>
            <span className="text-xs text-muted">Preview what employers see when they verify you.</span>
          </Link>
        </div>
      </section>
    </DashboardLayout>
  );
}

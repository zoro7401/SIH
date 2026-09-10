import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { getLearningPaths } from "../../services/learningPathsService";
import { resourcesForSkill } from "../../services/mockData/learningResources";
import { aiAdvisorAPI } from "../../services/api";
import { ArrowLeft, BookOpen, CheckCircle, MapTrifold } from "@phosphor-icons/react";

export default function LearningPathStudy() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [path, setPath] = useState(undefined);
  const [mode, setMode] = useState("modules");
  const [aiPlan, setAiPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");

  useEffect(() => {
    getLearningPaths().then((paths) => {
      const skillName = searchParams.get("skill");
      setPath(paths.find((item) => item.skillName === skillName) ?? null);
    });
  }, [searchParams]);

  if (path === undefined) {
    return (
      <DashboardLayout>
        <LoadingState label="Generating your study plan…" />
      </DashboardLayout>
    );
  }

  if (!path) {
    return (
      <DashboardLayout>
        <EmptyState
          title="Learning path not found"
          description="Choose a skill from the learning paths page to start studying."
          actionLabel="Back to learning paths"
          onAction={() => navigate("/learning-paths")}
        />
      </DashboardLayout>
    );
  }

  const resources = aiPlan?.resources?.length ? aiPlan.resources : resourcesForSkill(path.skillName);
  const displayedSteps = aiPlan?.steps ?? path.modules.map((module) => ({ title: module, topics: [], learn: "Learn the key ideas.", practice: "Complete a focused exercise.", apply: "Use it in a small project task." }));

  const generatePlan = async (selectedMode) => {
    setMode(selectedMode);
    setGenerating(true);
    setGenerationError("");
    try {
      const result = await aiAdvisorAPI.generateRoadmap(path.skillName, "current profile level", selectedMode === "modules" ? "module" : "roadmap");
      setAiPlan(result.roadmap);
    } catch (error) {
      setGenerationError(
        error.status === 404
          ? "The roadmap API is not deployed on this backend yet. The built-in study plan is shown."
          : "AI generation is unavailable, so the built-in study plan is shown."
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/learning-paths")}
          className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Back to learning paths
        </button>

        <header className="border-b border-hairline pb-6 mb-8">
          <p className="text-xs uppercase tracking-wide text-muted mb-2">Personal study plan</p>
          <h1 className="font-geist text-3xl text-ink tracking-tight mb-2">{path.skillName}</h1>
          <p className="text-muted max-w-2xl">{path.title}. Choose how you want to study and follow the generated plan at your own pace.</p>
        </header>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <button
            type="button"
            onClick={() => generatePlan("modules")}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm border transition-colors ${
              mode === "modules" ? "bg-ink text-white border-ink" : "bg-white text-charcoal border-hairline hover:border-ink"
            }`}
          >
            <BookOpen size={17} />
            Module format
          </button>
          <button
            type="button"
            onClick={() => setMode("roadmap")}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm border transition-colors ${
              mode === "roadmap" ? "bg-ink text-white border-ink" : "bg-white text-charcoal border-hairline hover:border-ink"
            }`}
          >
            <MapTrifold size={17} />
            Roadmap format
          </button>
        </div>
        {generationError && <p className="text-sm text-muted mb-6">{generationError}</p>}
        {generating && <p className="text-sm text-muted mb-6">Generating a personalized {mode} plan…</p>}

        {mode === "modules" ? (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-medium text-ink">Study modules</h2>
              <span className="text-sm text-muted">{path.modules.length} modules · {path.duration}</span>
            </div>
            {displayedSteps.map((step, index) => (
              <article key={step.title} className="bg-white border border-hairline rounded-xl p-5 flex items-start gap-4">
                <span className="w-8 h-8 rounded-full bg-bone text-ink text-sm flex items-center justify-center shrink-0">{index + 1}</span>
                <div>
                  <h3 className="text-base font-medium text-ink mb-1">{step.title}</h3>
                  {step.topics?.length > 0 && <p className="text-sm text-charcoal mb-2">Topics: {step.topics.join(", ")}</p>}
                  <p className="text-sm text-muted mb-2">{step.learn} {step.practice} {step.apply}</p>
                  <p className="text-xs uppercase tracking-wide text-muted">Topic {index + 1} of {displayedSteps.length}</p>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <h2 className="text-lg font-medium text-ink">Your roadmap</h2>
              <button
                type="button"
                onClick={() => generatePlan("roadmap")}
                disabled={generating}
                className="bg-ink text-white text-sm px-4 py-2.5 rounded-md hover:bg-ink-hover transition-colors disabled:opacity-60"
              >
                {generating ? "Generating…" : aiPlan ? "Regenerate roadmap" : "Generate roadmap"}
              </button>
            </div>
            {aiPlan && (
              <div className="bg-bone border border-hairline rounded-xl p-5 mb-5">
                <p className="text-xs uppercase tracking-wide text-muted mb-1">Generated roadmap</p>
                <h3 className="text-xl font-medium text-ink mb-2">{aiPlan.title}</h3>
                {aiPlan.summary && <p className="text-sm text-charcoal leading-relaxed">{aiPlan.summary}</p>}
              </div>
            )}
            {!aiPlan ? (
              <div className="bg-white border border-hairline rounded-xl p-8 text-center">
                <MapTrifold size={28} className="text-muted mx-auto mb-3" />
                <h3 className="text-base font-medium text-ink mb-2">Your roadmap is not generated yet</h3>
                <p className="text-sm text-muted">Generate a personalized beginner-to-advanced roadmap for {path.skillName} to see the topics and project plan here.</p>
              </div>
            ) : (
              <div className="relative ml-4 border-l border-hairline pl-8 flex flex-col gap-7">
                {displayedSteps.map((step, index) => (
                  <article key={step.title} className="relative bg-white border border-hairline rounded-xl p-5">
                    <span className="absolute -left-[2.55rem] top-0 w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center">
                      {index + 1}
                    </span>
                    <p className="text-xs uppercase tracking-wide text-muted mb-1">Learn topic {index + 1}</p>
                    <h3 className="text-base font-medium text-ink mb-2">{step.title}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="bg-bone rounded-md p-3"><span className="block text-xs uppercase tracking-wide text-muted mb-1">Learn</span><span className="text-charcoal">{step.learn}</span></div>
                      <div className="bg-bone rounded-md p-3"><span className="block text-xs uppercase tracking-wide text-muted mb-1">Practice</span><span className="text-charcoal">{step.practice}</span></div>
                      <div className="bg-bone rounded-md p-3"><span className="block text-xs uppercase tracking-wide text-muted mb-1">Apply</span><span className="text-charcoal">{step.apply}</span></div>
                    </div>
                  </article>
                ))}
                <article className="relative">
                  <CheckCircle size={24} className="absolute -left-[2.55rem] top-0 bg-white text-pastel-green-ink" weight="fill" />
                  <p className="text-xs uppercase tracking-wide text-muted mb-1">Final project</p>
                  <h3 className="text-base font-medium text-ink">{aiPlan.project?.title ?? `Apply your ${path.skillName} skills`}</h3>
                  <p className="text-sm text-muted">{aiPlan.project?.description ?? `${path.project.title}: ${path.project.description}`}</p>
                </article>
              </div>
            )}
          </section>
        )}

        <section className="mt-10 border-t border-hairline pt-8">
          <h2 className="text-lg font-medium text-ink mb-2">Study references</h2>
          <p className="text-sm text-muted mb-4">Use official documentation for depth and free learning content for guided practice.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {resources.map((resource) => (
              <a
                key={resource.url}
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                className="bg-white border border-hairline rounded-xl p-4 hover:border-ink transition-colors"
              >
                <span className="text-sm font-medium text-ink">{resource.label}</span>
                <span className="block text-xs text-muted mt-1">Open free resource ↗</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
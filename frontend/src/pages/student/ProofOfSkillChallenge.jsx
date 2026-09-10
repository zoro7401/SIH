import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Timer, Code, ArrowClockwise, PaperPlaneTilt, CheckCircle, Eye, Gauge, FileText, SealCheck } from "@phosphor-icons/react";
import { DATA_CLEANING_CHALLENGE, runTests, submitChallenge } from "../../services/challengesService";

export default function ProofOfSkillChallenge() {
  const [code, setCode] = useState(DATA_CLEANING_CHALLENGE.starterCode);
  const [timeRemaining, setTimeRemaining] = useState(DATA_CLEANING_CHALLENGE.timeLimitSeconds);
  const [testResult, setTestResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (result) return; // stop the clock once submitted
    const interval = setInterval(() => {
      setTimeRemaining((t) => (t > 0 ? t - 1 : t));
    }, 1000);
    return () => clearInterval(interval);
  }, [result]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timerLabel = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const handleReset = () => {
    setCode(DATA_CLEANING_CHALLENGE.starterCode);
    setTestResult(null);
  };

  const handleRunTests = async () => {
    setRunning(true);
    try {
      const res = await runTests(code);
      setTestResult(res);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submitChallenge(code);
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <DashboardLayout>
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center gap-4 py-16">
          <SealCheck size={40} className={result.passing ? "text-pastel-green-ink" : "text-pastel-red-ink"} weight="fill" />
          <h1 className="font-geist text-2xl text-ink tracking-tight">
            {result.passing ? "Challenge Passed" : "Not Quite — Try Again"}
          </h1>
          <p className="text-muted max-w-md leading-relaxed">
            You scored {result.score}% ({result.passed} of {result.total} tests passed) on {DATA_CLEANING_CHALLENGE.skill}.
            {result.passing
              ? " Your skill has been upgraded to Project-Verified on your Skill Passport."
              : " A score of 75% or higher is required to verify this skill."}
          </p>
          <div className="flex gap-3 mt-4">
            <Link to="/portfolio" className="bg-ink text-white text-sm px-6 py-2.5 rounded-md hover:bg-ink-hover active:scale-[0.98] transition-all">
              View Skill Passport
            </Link>
            {!result.passing && (
              <button
                onClick={() => {
                  setResult(null);
                  setTimeRemaining(DATA_CLEANING_CHALLENGE.timeLimitSeconds);
                }}
                className="border border-hairline text-charcoal text-sm px-6 py-2.5 rounded-md hover:bg-bone transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
        {/*Header Section*/}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-hairline pb-6">
          <div>
            <h1 className="font-geist text-2xl text-ink tracking-tight mb-2">{DATA_CLEANING_CHALLENGE.title}</h1>
            <p className="text-muted max-w-2xl leading-relaxed">{DATA_CLEANING_CHALLENGE.description}</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-2 bg-bone py-2 px-4 rounded-md">
            <Timer size={18} className="text-muted" />
            <span className={`font-mono font-medium text-lg ${timeRemaining < 300 ? "text-pastel-red-ink" : "text-ink"}`}>{timerLabel}</span>
          </div>
        </div>

        {/*Editor Section*/}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center bg-bone px-4 py-2 border-t border-l border-r border-hairline rounded-t-xl">
            <span className="text-xs text-muted flex items-center gap-1.5">
              <Code size={14} /> main.py
            </span>
            <div className="flex gap-2">
              <button onClick={handleReset} className="text-muted hover:text-ink transition-colors" title="Reset Code">
                <ArrowClockwise size={16} />
              </button>
            </div>
          </div>
          <div className="relative w-full h-[500px] border border-hairline bg-white rounded-b-xl overflow-hidden">
            <textarea
              className="w-full h-full px-4 py-4 font-mono text-sm text-charcoal bg-transparent border-none focus:ring-0 resize-none outline-none leading-relaxed"
              spellCheck="false"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
        </div>

        {testResult && (
          <p className={`text-sm ${testResult.passed === testResult.total ? "text-pastel-green-ink" : "text-charcoal"}`}>
            Tests: {testResult.passed} / {testResult.total} passed.
          </p>
        )}

        {/*Actions*/}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleRunTests}
            disabled={running}
            className="border border-hairline text-charcoal text-sm px-6 py-2.5 rounded-md hover:bg-bone transition-colors disabled:opacity-60"
          >
            {running ? "Running…" : "Run Tests"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-ink text-white text-sm px-6 py-2.5 rounded-md hover:bg-ink-hover active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit for Review"}
            <PaperPlaneTilt size={16} />
          </button>
        </div>

        {/*Rubric*/}
        <div className="mt-6 border border-hairline bg-white rounded-xl p-8">
          <h3 className="text-base font-medium text-ink mb-4 border-b border-hairline pb-3">Evaluation Criteria</h3>
          <ul className="flex flex-col gap-3">
            {[
              { icon: CheckCircle, title: "Code Correctness", body: "Passes all hidden unit tests and handles edge cases appropriately." },
              { icon: Eye, title: "Readability", body: "Clear variable naming, logical structure, and adherence to PEP 8 style guidelines." },
              { icon: Gauge, title: "Algorithmic Efficiency", body: "Optimal time and space complexity suitable for large-scale datasets." },
              { icon: FileText, title: "Documentation", body: "Concise inline comments and updated docstrings explaining methodology." },
            ].map((item, i, arr) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className={`flex items-start gap-3 py-3 ${i < arr.length - 1 ? "border-b border-hairline" : ""}`}>
                  <Icon size={18} className="text-muted mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-ink block">{item.title}</span>
                    <span className="text-sm text-muted">{item.body}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}

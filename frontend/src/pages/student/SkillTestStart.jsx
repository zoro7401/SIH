import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import ProgressBar from "../../components/common/ProgressBar";
import QuestionCard from "../../components/common/QuestionCard";
import { ArrowLeft, ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { getSkillTestForAttempt, submitSkillTest } from "../../services/skillTestService";

export default function SkillTestStart() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(undefined);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTest(undefined);
    setCurrent(0);
    setAnswers({});
    getSkillTestForAttempt(testId).then(setTest);
  }, [testId]);

  if (test === undefined) {
    return (
      <DashboardLayout hideSidebar>
        <LoadingState label="Loading assessment…" />
      </DashboardLayout>
    );
  }

  if (test === null) {
    return (
      <DashboardLayout hideSidebar>
        <EmptyState title="Assessment not found" description="This skill test doesn't exist or may have been removed." actionLabel="Back to Assessments" onAction={() => navigate("/skill-tests")} />
      </DashboardLayout>
    );
  }

  const total = test.questions.length;
  const question = test.questions[current];
  const progressPercent = Math.round(((current + 1) / total) * 100);
  const selectedValue = answers[question.id];
  const isLastQuestion = current === total - 1;

  const handleSelect = (value) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    setError("");
  };

  const handleBack = () => {
    if (current > 0) setCurrent((c) => c - 1);
  };

  const handleNext = () => {
    if (!selectedValue) {
      setError("Please select an option before continuing.");
      return;
    }
    setCurrent((c) => c + 1);
  };

  const handleSubmit = async () => {
    if (!selectedValue) {
      setError("Please select an option before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitSkillTest(testId, answers);
      navigate(result.passed ? "/skill-profile/gap-report" : `/skill-tests/${testId}/result`, { state: { result } });
    } catch {
      setError("Something went wrong submitting your assessment. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout hideSidebar>
      <div className="w-full bg-white border border-hairline rounded-xl flex flex-col mb-10">
        <ProgressBar percent={progressPercent} className="rounded-t-xl rounded-b-none" />
        <div className="px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-base font-medium text-ink">{test.title} Assessment</h2>
            <span className="text-sm text-muted">
              Question {current + 1} of {total}
            </span>
          </div>
          <button type="button" onClick={() => navigate("/skill-tests")} className="text-sm text-muted hover:text-ink transition-colors">
            Exit
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className="w-full max-w-2xl bg-white border border-hairline rounded-xl p-10">
          <QuestionCard prompt={question.prompt} options={question.options} selectedValue={selectedValue} onSelect={handleSelect} />

          {error && <p className="text-sm text-pastel-red-ink mt-4">{error}</p>}

          <div className="flex justify-between items-center pt-6 mt-6 border-t border-hairline">
            <button
              className="px-4 py-2 border border-hairline rounded-md text-charcoal text-sm hover:bg-bone transition-colors flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
              type="button"
              onClick={handleBack}
              disabled={current === 0}
            >
              <ArrowLeft size={16} />
              Previous
            </button>
            {isLastQuestion ? (
              <button
                className="px-4 py-2 bg-ink text-white rounded-md text-sm hover:bg-ink-hover active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-60"
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit"}
                <CheckCircle size={16} />
              </button>
            ) : (
              <button
                className="px-4 py-2 bg-ink text-white rounded-md text-sm hover:bg-ink-hover active:scale-[0.98] transition-all flex items-center gap-2"
                type="button"
                onClick={handleNext}
              >
                Next
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { getSkillTestResult } from "../../services/skillTestService";

export default function SkillTestResult() {
  const { testId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState(location.state?.result ?? undefined);

  useEffect(() => {
    if (result !== undefined) return;
    getSkillTestResult(testId).then(setResult);
  }, [testId, result]);

  if (result === undefined) {
    return (
      <DashboardLayout>
        <LoadingState label="Loading result…" />
      </DashboardLayout>
    );
  }

  if (!result) {
    return (
      <DashboardLayout>
        <EmptyState
          title="No result yet"
          description="Take this assessment to see your result here."
          actionLabel="Go to Assessments"
          onAction={() => navigate("/skill-tests")}
        />
      </DashboardLayout>
    );
  }

  const { passed, scorePercent, correct, total, passingScore, title } = result;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center">
        <div className="w-full max-w-lg bg-white border border-hairline rounded-xl p-10 text-center">
          {passed ? (
            <span className="text-3xl mb-2 block">🎉</span>
          ) : (
            <span className="text-3xl mb-2 block">📋</span>
          )}
          <h1 className="font-geist text-2xl text-ink tracking-tight mb-1">Assessment Completed</h1>
          <p className="text-muted mb-8">{title}</p>

          <div className="mb-6">
            <p className="text-xs uppercase tracking-wide text-muted mb-1">Score</p>
            <p className="font-editorial text-5xl text-ink tracking-tight">{scorePercent}%</p>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium uppercase tracking-wide mb-8 ${
              passed ? "bg-pastel-green text-pastel-green-ink" : "bg-pastel-red text-pastel-red-ink"
            }`}
          >
            {passed ? <CheckCircle size={16} weight="bold" /> : <XCircle size={16} weight="bold" />}
            {passed ? "Passed" : "Not Passed"}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8 text-left">
            <div className="border border-hairline rounded-xl p-4">
              <p className="text-xs uppercase tracking-wide text-muted mb-1">
                {passed ? "Correct Answers" : "Required"}
              </p>
              <p className="text-lg font-medium text-ink">{passed ? `${correct} / ${total}` : `${passingScore}%`}</p>
            </div>
            <div className="border border-hairline rounded-xl p-4">
              <p className="text-xs uppercase tracking-wide text-muted mb-1">Skill Status</p>
              <p className={`text-lg font-medium ${passed ? "text-pastel-green-ink" : "text-muted"}`}>
                {passed ? "Assessment Verified ✓" : "Not Verified"}
              </p>
            </div>
          </div>

          {passed ? (
            <button
              onClick={() => navigate("/skill-profile/graph")}
              className="w-full bg-ink text-white text-sm px-4 py-2.5 rounded-md hover:bg-ink-hover active:scale-[0.98] transition-all"
            >
              View My Skills
            </button>
          ) : (
            <button
              onClick={() => navigate(`/skill-tests/${testId}`)}
              className="w-full bg-ink text-white text-sm px-4 py-2.5 rounded-md hover:bg-ink-hover active:scale-[0.98] transition-all"
            >
              Retake Assessment
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

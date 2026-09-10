import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import QuestionCard from "../../components/common/QuestionCard";
import TestNavigatorSidebar from "../../components/common/TestNavigatorSidebar";
import { ArrowLeft, ArrowRight, ClockCountdown, SealWarning, Warning, ArrowsOutSimple } from "@phosphor-icons/react";
import { getDynamicTestForAttempt, submitDynamicSkillTest } from "../../services/skillTestService";
import { useExamProctoring } from "../../hooks/useExamProctoring";
import useCameraProctoring from "../../hooks/useCameraProctoring";

const QUEUE_STORAGE_KEY = "dynamicTestQueue";

function formatClock(totalSeconds) {
  const clamped = Math.max(0, totalSeconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Runs every skill selected on SkillAssessment's Step 1 picker as ONE
// combined test: every selected skill's questions are fetched upfront and
// flattened into a single sequence, with one continuous countdown (sum of
// every question's time budget, across all skills) and one question grid
// spanning the whole run. Styled as a proctored exam (fixed exam bar,
// answer-sheet navigator, confirm-before-submit) rather than a generic form,
// since this is the score that verifies a skill on the student's profile —
// it should read with the weight of a real assessment. Each skill is still
// scored independently server-side on submit (submitDynamicSkillTest is
// called once per skill).
export default function DynamicTestRun() {
  const location = useLocation();
  const navigate = useNavigate();

  // selectedSkills: prefer the navigation state SkillAssessment passes;
  // fall back to sessionStorage so a refresh mid-run doesn't lose the list.
  const [selectedSkills] = useState(() => {
    if (location.state?.selectedSkills?.length) return location.state.selectedSkills;
    try {
      return JSON.parse(sessionStorage.getItem(QUEUE_STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const [items, setItems] = useState(undefined); // flat [{ skillName, question }] across all skills, or null on failure
  const [loadError, setLoadError] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [skippedIds, setSkippedIds] = useState(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  // Deliberately leaving the test (Exit button, or a successful submit) sets
  // this immediately, synchronously before any navigation/fullscreen-exit
  // side effect runs — exitFullscreen()'s fullscreenchange event fires
  // asynchronously, so without this flag a legitimate Exit click could race
  // with the proctoring listeners and register itself as a strike.
  const [leavingDeliberately, setLeavingDeliberately] = useState(false);
  // Always points at the latest finalizeSubmit — the countdown's interval is
  // set up once and would otherwise close over a stale `answers`.
  const submitRef = useRef(() => {});

  // Anti-cheating guard: fullscreen on entry, one shared strike counter for
  // leaving fullscreen or switching away from the tab, auto-submit on the
  // 3rd strike. Armed once questions have loaded and disarmed once
  // submitting or deliberately leaving, so it doesn't fire while navigating
  // to the results page or in response to the student's own Exit click.
  // Called unconditionally (before the loading/error early returns below)
  // since hooks can't be conditional — proctoring simply has nothing to
  // guard yet while `items` is still undefined/null.
  const proctoring = useExamProctoring({
    active: Boolean(items) && items.length > 0 && !submitting && !leavingDeliberately,
    onMaxStrikes: () => {
      setAutoSubmitting(true);
      submitRef.current();
    },
  });
  const camera = useCameraProctoring({
    active: Boolean(items) && items.length > 0 && !submitting && !leavingDeliberately,
    onViolation: (reason) => proctoring.registerViolation(reason),
  });

  useEffect(() => {
    if (selectedSkills.length === 0) {
      setItems(null);
      return;
    }
    sessionStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(selectedSkills));

    Promise.all(selectedSkills.map((skill) => getDynamicTestForAttempt(skill)))
      .then((tests) => {
        const flat = tests.flatMap((test, i) =>
          test.questions.map((question) => ({ skillName: selectedSkills[i], question }))
        );
        setItems(flat);
        setTimeRemaining(flat.reduce((sum, item) => sum + (item.question.timeSeconds || 0), 0));
      })
      .catch((err) => {
        console.error("Could not load combined skill test run:", err.message);
        setLoadError(err.message || "Unable to load the assessment questions.");
        setItems(null);
      });
    // selectedSkills is captured once via useState's lazy initializer above
    // and never changes for the life of this page, so this effect is
    // intentionally run-once (empty deps would warn but selectedSkills is stable).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One countdown for the entire run (every selected skill combined), not
  // reset between skills — ticks every second and auto-submits everything
  // answered so far across every skill the moment it hits zero.
  useEffect(() => {
    if (!items) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          submitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [items]);

  if (items === undefined) {
    return (
      <DashboardLayout hideSidebar>
        <LoadingState label="Preparing your assessment…" />
      </DashboardLayout>
    );
  }

  if (items === null || items.length === 0) {
    return (
      <DashboardLayout hideSidebar>
        <EmptyState
          title={loadError ? "Could not load assessment" : "Assessment not found"}
          description={
            loadError || "No skills were selected, or the question bank isn't set up for them yet."
          }
          actionLabel={loadError ? "Try Again" : "Back to Assessments"}
          onAction={() => {
            if (loadError) {
              window.location.reload();
              return;
            }
            navigate("/skill-tests");
          }}
        />
      </DashboardLayout>
    );
  }

  const total = items.length;
  const item = items[current];
  const question = item.question;
  const selectedValue = answers[question.id];
  const isLastQuestion = current === total - 1;
  const lowOnTime = timeRemaining <= 60;

  // Non-empty/non-whitespace answers only, matching the "please answer"
  // validation below, so a question isn't marked green from stray whitespace.
  const answeredIds = new Set(
    items.filter((it) => (answers[it.question.id] || "").toString().trim().length > 0).map((it) => it.question.id)
  );
  const unansweredCount = total - answeredIds.size;

  // Where each skill's block of tiles starts in the flat list, for
  // TestNavigatorSidebar's grouped-label rendering — each skill reads as
  // one section of the exam, e.g. "Section 1: JavaScript".
  const skillBoundaries = [];
  let lastSkill = null;
  items.forEach((it, index) => {
    if (it.skillName !== lastSkill) {
      skillBoundaries.push({ skillName: it.skillName, startIndex: index });
      lastSkill = it.skillName;
    }
  });
  const sectionNumber = skillBoundaries.filter((b) => b.startIndex <= current).length;

  const handleSelect = (value) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    setSkippedIds((prev) => {
      const next = new Set(prev);
      next.delete(question.id);
      return next;
    });
    setError("");
  };

  const handleBack = () => {
    if (current > 0) setCurrent((c) => c - 1);
  };

  const handleNext = () => {
    if (!selectedValue) {
      setSkippedIds((prev) => new Set(prev).add(question.id));
    }
    setError("");
    setCurrent((c) => c + 1);
  };

  const handleSkip = () => {
    setSkippedIds((prev) => new Set(prev).add(question.id));
    setError("");
    if (isLastQuestion) {
      setConfirmingSubmit(true);
      return;
    }
    setCurrent((c) => c + 1);
  };

  // Splits the flat answers map back out per skill and submits each skill's
  // slice to its own backend endpoint independently (unchanged scoring path
  // — see assessmentController.submitDynamicTest), then shows one combined
  // summary once every skill has been submitted.
  const finalizeSubmit = async (currentAnswers) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const results = await Promise.all(
        selectedSkills.map((skill) => {
          const answersForSkill = {};
          for (const it of items) {
            if (it.skillName === skill && currentAnswers[it.question.id] !== undefined) {
              answersForSkill[it.question.id] = currentAnswers[it.question.id];
            }
          }
          return submitDynamicSkillTest(skill, answersForSkill);
        })
      );
      sessionStorage.removeItem(QUEUE_STORAGE_KEY);
      navigate("/skill-tests/dynamic/summary", { state: { results } });
    } catch {
      setError("Something went wrong submitting your assessment. Please try again.");
      setSubmitting(false);
      setAutoSubmitting(false);
      setConfirmingSubmit(false);
    }
  };

  // The Submit button on the last question opens the confirm dialog instead
  // of submitting directly — a real exam never lets a final submission
  // happen on a single accidental click.
  const handleSubmitClick = () => {
    if (!selectedValue) {
      setSkippedIds((prev) => new Set(prev).add(question.id));
    }
    setError("");
    setConfirmingSubmit(true);
  };

  // Kept in sync every render so the countdown's timeout callback (set up
  // once when items load) always calls the latest version. Timeout skips
  // the confirm dialog — there's no one left to confirm with.
  submitRef.current = () => finalizeSubmit(answers);

  return (
    <DashboardLayout hideSidebar>
      <video ref={camera.videoRef} muted playsInline className="fixed bottom-3 right-3 z-30 w-28 h-20 object-cover rounded-md border border-white/50 shadow-lg opacity-80" />
      {camera.status === "blocked" && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-pastel-red text-pastel-red-ink text-sm px-4 py-3 rounded-lg shadow-xl">
          {camera.cameraError}
        </div>
      )}
      {camera.status === "loading" && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-ink text-white text-sm px-4 py-3 rounded-lg shadow-xl">
          Starting camera monitoring…
        </div>
      )}
      {autoSubmitting && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white border border-hairline rounded-xl px-6 py-5 text-center shadow-xl">
            <p className="text-sm font-medium text-ink">Three warnings reached</p>
            <p className="text-sm text-muted mt-1">Submitting your assessment automatically…</p>
          </div>
        </div>
      )}
      {/* Exam bar: bleeds edge-to-edge past DashboardLayout's content padding
          (negative margins cancel px-4 md:px-10) and sticks to the top, the
          way a real proctored test's chrome stays fixed regardless of scroll. */}
      <div className="sticky top-0 z-30 -mx-4 md:-mx-10 -mt-10 mb-8 bg-ink text-white">
        <div className="max-w-5xl mx-auto px-4 md:px-10 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#9a9a9a] mb-0.5">
              Section {sectionNumber} of {skillBoundaries.length} · Skill Assessment
            </p>
            <h1 className="font-geist text-xl tracking-tight truncate">{item.skillName}</h1>
          </div>

          <div className="flex items-center gap-5 flex-shrink-0">
            <div className={`flex items-center gap-2 ${lowOnTime ? "text-pastel-red" : "text-white"}`}>
              <ClockCountdown size={20} weight={lowOnTime ? "fill" : "regular"} className={lowOnTime ? "animate-pulse" : ""} />
              <span className="font-mono text-lg tabular-nums tracking-wide">{formatClock(timeRemaining)}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setLeavingDeliberately(true);
                if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
                sessionStorage.removeItem(QUEUE_STORAGE_KEY);
                navigate("/skill-tests");
              }}
              className="text-sm text-[#bbbbbb] hover:text-white transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
        <div className="h-0.5 w-full bg-[#333333]">
          <div className="h-full bg-white transition-all duration-300" style={{ width: `${((current + 1) / total) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start justify-center gap-6">
        <div className="w-full max-w-2xl bg-white border border-hairline rounded-xl p-10">
          <p className="text-xs uppercase tracking-[0.14em] text-muted mb-4">
            Question {current + 1} of {total}
          </p>

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
            <div className="flex items-center gap-2">
              <button
                className="px-4 py-2 border border-hairline rounded-md text-charcoal text-sm hover:bg-bone transition-colors disabled:opacity-40 disabled:pointer-events-none"
                type="button"
                onClick={handleSkip}
                disabled={Boolean(selectedValue) || submitting}
              >
                Skip
              </button>
              {isLastQuestion ? (
                <button
                  className="px-4 py-2 bg-ink text-white rounded-md text-sm hover:bg-ink-hover active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-60"
                  type="button"
                  onClick={handleSubmitClick}
                  disabled={submitting}
                >
                  {submitting ? "Submitting…" : "Review & Submit"}
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

        <TestNavigatorSidebar
          questionCount={total}
          current={current}
          answeredIds={answeredIds}
          skippedIds={skippedIds}
          questionIds={items.map((it) => it.question.id)}
          skillBoundaries={skillBoundaries}
          onJumpTo={(index) => {
            setCurrent(index);
            setError("");
          }}
        />
      </div>

      {confirmingSubmit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting) setConfirmingSubmit(false);
          }}
        >
          <div className="w-full max-w-md bg-white border border-hairline rounded-xl p-6 shadow-xl" role="dialog" aria-modal="true">
            <div className="flex items-start gap-3 mb-4">
              <span
                className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                  unansweredCount > 0 ? "bg-pastel-yellow text-pastel-yellow-ink" : "bg-pastel-green text-pastel-green-ink"
                }`}
              >
                <SealWarning size={18} weight="bold" />
              </span>
              <div>
                <h2 className="text-base font-medium text-ink mb-1">Submit final answers?</h2>
                <p className="text-sm text-muted">
                  {answeredIds.size} of {total} questions answered
                  {unansweredCount > 0 ? ` · ${unansweredCount} left blank` : ""}. Once submitted, you cannot change your answers.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingSubmit(false)}
                disabled={submitting}
                className="border border-hairline text-charcoal text-sm px-4 py-2 rounded-md hover:bg-bone transition-colors disabled:opacity-60"
              >
                Review Answers
              </button>
              <button
                type="button"
                onClick={() => finalizeSubmit(answers)}
                disabled={submitting}
                className="bg-ink text-white text-sm px-4 py-2 rounded-md hover:bg-ink-hover transition-colors disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit Final Answers"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen was requested automatically on load but the browser
          blocked it (some browsers require the request to originate from a
          more direct user gesture than the navigation that got here) — a
          quiet inline prompt rather than a blocking modal, since the test
          itself is still fully usable without fullscreen. */}
      {proctoring.fullscreenBlocked && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-ink text-white text-sm px-4 py-3 rounded-lg shadow-xl">
          <ArrowsOutSimple size={16} />
          <span>Enter fullscreen for the full exam experience.</span>
          <button
            type="button"
            onClick={proctoring.resumeFullscreen}
            className="bg-white text-ink text-xs font-medium px-3 py-1.5 rounded-md hover:bg-[#eeeeee] transition-colors"
          >
            Enter Fullscreen
          </button>
        </div>
      )}

        {/* Strike warning: fires when the student exits fullscreen, switches
          tabs, or uses a detected screenshot shortcut/context menu — one
          shared counter for all of them. The
          3rd strike skips this dialog entirely and auto-submits instead
          (see useExamProctoring's onMaxStrikes). */}
      {proctoring.warning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
          <div className="w-full max-w-md bg-white border border-hairline rounded-xl p-6 shadow-xl text-center" role="dialog" aria-modal="true">
            <span className="inline-flex w-12 h-12 rounded-full bg-pastel-red text-pastel-red-ink items-center justify-center mb-4">
              <Warning size={24} weight="bold" />
            </span>
            <h2 className="text-lg font-medium text-ink mb-2">
              Warning {proctoring.warning.strikeNumber} of {proctoring.maxStrikes}
            </h2>
            <p className="text-sm text-muted mb-6">
              {proctoring.warning.reason === "fullscreen"
                ? "You exited fullscreen. Leaving the test screen is tracked during an assessment."
                : proctoring.warning.reason === "screenshot"
                ? "Screenshot or print capture is not allowed during the assessment."
                : ["camera-missing", "multiple-faces", "eye-gaze"].includes(proctoring.warning.reason)
                ? "Camera monitoring detected that your eyes may not be directed toward the screen. Keep one face centered and look at the test."
                : "You switched away from the test tab. Leaving the test screen is tracked during an assessment."}{" "}
              {proctoring.maxStrikes - proctoring.warning.strikeNumber === 1
                ? "One more warning will auto-submit your test."
                : `${proctoring.maxStrikes - proctoring.warning.strikeNumber} more warnings will auto-submit your test.`}
            </p>
            <button
              type="button"
              onClick={() => {
                proctoring.dismissWarning();
                proctoring.resumeFullscreen();
              }}
              className="bg-ink text-white text-sm px-5 py-2.5 rounded-md hover:bg-ink-hover transition-colors"
            >
              Return to Test
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

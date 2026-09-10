import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import { ClockCounterClockwise } from "@phosphor-icons/react";
import { getAssessmentQuestions, getStoredSkillProfileOrDemo } from "../../services/assessmentService";

const QUEUE_STORAGE_KEY = "dynamicTestQueue";

export default function SkillAssessment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [questions, setQuestions] = useState(undefined);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [error, setError] = useState("");
  // undefined = still checking, null = never completed, string = last completion date.
  // If the student already completed a skill assessment once, don't force
  // them through the whole picker again on every visit — show a summary with
  // an explicit "Retake" choice instead (Issue 6).
  const [previousCompletedAt, setPreviousCompletedAt] = useState(undefined);
  const [forceRetake, setForceRetake] = useState(false);
  const [showRetakeWarning, setShowRetakeWarning] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [cameraAccess, setCameraAccess] = useState("idle");
  const cameraStreamRef = useRef(null);
  const cameraPreviewRef = useRef(null);

  useEffect(() => {
    // getAssessmentQuestions() only supplies the skill picker's sections/list
    // here — the objective test questions themselves come from Supabase
    // per-skill once a test starts (see DynamicSkillTestStart.jsx).
    getAssessmentQuestions().then(setQuestions);
    getStoredSkillProfileOrDemo().then((profile) => setPreviousCompletedAt(profile?.completedAt ?? null));
  }, []);

  useEffect(() => {
    if (searchParams.get("start") === "beginning") {
      setSelectedSkills([]);
    }
    if (searchParams.get("retake") === "true") setForceRetake(true);
  }, [searchParams]);

  useEffect(() => {
    if (!showRules) return undefined;

    let cancelled = false;
    const requestCameraAccess = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraAccess("denied");
        return;
      }
      try {
        setCameraAccess("loading");
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (cameraPreviewRef.current) {
          cameraPreviewRef.current.srcObject = stream;
          await cameraPreviewRef.current.play();
        }
        setCameraAccess("granted");
      } catch {
        setCameraAccess("denied");
      }
    };

    requestCameraAccess();
    return () => {
      cancelled = true;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      if (cameraPreviewRef.current) cameraPreviewRef.current.srcObject = null;
    };
  }, [showRules]);

  if (!questions || previousCompletedAt === undefined) {
    return (
      <DashboardLayout>
        <LoadingState fullScreen={false} label="Loading assessment…" />
      </DashboardLayout>
    );
  }

  if (previousCompletedAt && !forceRetake && !showRetakeWarning) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center">
          <div className="w-full max-w-lg bg-white border border-hairline rounded-xl p-10 text-center">
            <ClockCounterClockwise size={32} className="text-ink mx-auto mb-4" />
            <h1 className="font-geist text-2xl text-ink tracking-tight mb-2">You've already completed this assessment</h1>
            <p className="text-muted mb-8">
              Last completed on{" "}
              {new Date(previousCompletedAt).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}. Your skill
              profile is already up to date — no need to fill it in again.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowRetakeWarning(true)}
                className="w-full bg-ink text-white text-sm px-4 py-2.5 rounded-md hover:bg-ink-hover active:scale-[0.98] transition-all cursor-pointer"
              >
                Retake Assessment
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (showRetakeWarning && !forceRetake) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center">
          <div className="w-full max-w-lg bg-white border border-hairline rounded-xl p-10 text-center">
            <ClockCounterClockwise size={32} className="text-ink mx-auto mb-4" />
            <h1 className="font-geist text-2xl text-ink tracking-tight mb-3">Retake this assessment?</h1>
            <p className="text-muted mb-8">
              Your previous test result will be deleted. After you complete this test, your new result will replace it and be updated in the Assessment section.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setForceRetake(true)}
                className="w-full bg-ink text-white text-sm px-4 py-2.5 rounded-md hover:bg-ink-hover active:scale-[0.98] transition-all cursor-pointer"
              >
                Continue and Retake Test
              </button>
              <button
                type="button"
                onClick={() => setShowRetakeWarning(false)}
                className="w-full border border-hairline text-charcoal text-sm px-4 py-2.5 rounded-md hover:bg-bone transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Only "Technical Skills" have a question bank in Supabase's
  // assessment_questions table — the "Soft Skills" section (Communication,
  // Teamwork, etc.) has no objective test to send a selection into, so it's
  // excluded from this picker rather than dead-ending in a 404 dynamic test.
  const availableSections = questions
    .filter((question) => question.section === "Technical Skills")
    .reduce((sections, question) => {
      const section = sections.find((item) => item.section === question.section);
      if (section) section.questions.push(question);
      else sections.push({ section: question.section, questions: [question] });
      return sections;
    }, []);

  const toggleSkill = (skill) => {
    setSelectedSkills((currentSkills) =>
      currentSkills.includes(skill) ? currentSkills.filter((item) => item !== skill) : [...currentSkills, skill]
    );
  };

  // Runs every selected skill as one combined 20-question-per-skill test
  // (see DynamicTestRun.jsx) instead of the old in-page self-rating step —
  // sessionStorage is a durability fallback so a page refresh mid-run
  // doesn't lose the skill list; location.state is the primary channel.
  const beginSkillTests = () => {
    if (selectedSkills.length === 0) {
      setError("Please select at least one skill before continuing.");
      return;
    }
    setError("");
    setAgreedToRules(false);
    setShowRules(true);
  };

  const startSkillTests = () => {
    if (!agreedToRules) return;
    sessionStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(selectedSkills));
    navigate("/skill-tests/dynamic/run", { state: { selectedSkills } });
  };

  if (showRules) {
    return (
      <DashboardLayout>
        <div className="w-full max-w-2xl mx-auto bg-white border border-hairline rounded-xl p-6 md:p-10">
          <div className="mb-8">
            <h1 className="font-geist text-2xl text-ink tracking-tight mb-2">Are you ready to take the test?</h1>
            <p className="text-muted">Please read and accept the rules before starting your skill assessment.</p>
          </div>

          <div className="border border-hairline rounded-lg p-5 bg-bone">
            <h2 className="text-base font-medium text-ink mb-4">Rules and conditions</h2>
            <ul className="list-disc pl-5 space-y-3 text-sm text-charcoal">
              <li>Each selected skill has a 20-question objective assessment.</li>
              <li>The assessment is timed. The timer continues across all selected skills.</li>
              <li>Stay in fullscreen and keep this browser tab active while taking the test.</li>
              <li>Leaving fullscreen or switching tabs counts as a warning.</li>
              <li>After 3 warnings, the assessment will be submitted automatically.</li>
              <li>Only answered questions can be evaluated, so review your answers before submitting.</li>
            </ul>
          </div>

          <div className="flex items-center gap-4 mt-6 p-4 border border-hairline rounded-lg">
            <video ref={cameraPreviewRef} muted playsInline className="w-24 h-16 object-cover rounded-md bg-ink" />
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">Camera access required</p>
              <p className="text-xs text-muted mt-1">
                  {cameraAccess === "loading"
                    ? "Requesting camera permission…"
                    : cameraAccess === "granted"
                    ? "Camera connected. Face and approximate eye-direction monitoring will run during the test."
                    : cameraAccess === "denied"
                    ? "Camera access was denied. Allow it in your browser settings, then reload this page."
                    : "Allow camera access to continue."}
              </p>
            </div>
            {cameraAccess === "granted" && <span className="text-xs font-medium text-pastel-green-ink">Ready</span>}
          </div>

          <p className="text-sm text-muted mt-6">
            Selected skills: <span className="text-ink font-medium">{selectedSkills.join(", ")}</span>
          </p>

          <label className="flex items-start gap-3 mt-6 text-sm text-ink cursor-pointer">
            <input
              className="mt-0.5 w-4 h-4 text-ink border-hairline focus:ring-ink"
              type="checkbox"
              checked={agreedToRules}
              onChange={(event) => setAgreedToRules(event.target.checked)}
            />
            <span>I have read and agree to follow these rules and conditions.</span>
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-8 pt-4 border-t border-hairline">
            <button
              type="button"
              onClick={() => setShowRules(false)}
              className="px-4 py-2 border border-hairline text-charcoal rounded-md text-sm hover:bg-bone transition-colors"
            >
              Back to Skills
            </button>
            <button
              type="button"
              onClick={startSkillTests}
              disabled={!agreedToRules || cameraAccess !== "granted"}
              className="px-4 py-2 bg-ink text-white rounded-md text-sm hover:bg-ink-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Agree and Start Test
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full max-w-2xl mx-auto bg-white border border-hairline rounded-xl p-6 md:p-10">
        <div className="mb-8">
          <h1 className="font-geist text-2xl text-ink tracking-tight mb-2">Which skills do you know?</h1>
          <p className="text-muted">
            Select the technical skills you have started learning or using. You'll take a 20-question assessment for each one to verify
            your level.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {availableSections.map((section) => (
            <section key={section.section}>
              <h2 className="text-base font-medium text-ink mb-3">{section.section}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.questions.map((question) => {
                  const isSelected = selectedSkills.includes(question.skill);
                  return (
                    <label
                      key={question.skill}
                      className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                        isSelected ? "border-ink bg-bone" : "border-hairline hover:border-ink"
                      }`}
                    >
                      <input
                        className="w-4 h-4 text-ink border-hairline focus:ring-ink"
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSkill(question.skill)}
                      />
                      <span className="text-sm text-ink">{question.skill}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {error && <p className="text-sm text-pastel-red-ink mt-6">{error}</p>}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-8 pt-4 border-t border-hairline">
          <p className="text-sm text-muted">
            {selectedSkills.length === 0 ? "Select at least one skill to begin." : `${selectedSkills.length} skill${selectedSkills.length === 1 ? "" : "s"} selected.`}
          </p>
          <button
            type="button"
            onClick={beginSkillTests}
            disabled={selectedSkills.length === 0}
            className="px-4 py-2 bg-ink text-white rounded-md text-sm hover:bg-ink-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Skill Tests
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

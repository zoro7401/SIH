import { useEffect, useRef, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import { getTargetRoleReadiness } from "../../services/careerRoleService";
import { getSkillProfile } from "../../services/skillsService";
import { aiAdvisorAPI } from "../../services/api";
import { PaperPlaneRight, Sparkle, ShieldWarning } from "@phosphor-icons/react";

const SUGGESTED_PROMPTS = [
  "How ready am I for my target role?",
  "What should I focus on next?",
  "Which skill gap matters most right now?",
];

// Maps raw backend/network errors to a calm, actionable message — never
// surface internals like "No token provided" (an expired/missing session)
// directly to the student.
function friendlyAdvisorError(err) {
  if (err?.status === 401) {
    return "Your session has expired. Please log in again to keep using the AI Career Advisor.";
  }
  if (err?.status === 429) {
    return "You've sent a lot of messages in a short time. Please wait a moment and try again.";
  }
  if (err?.status === 503 || err?.status === 502) {
    return "AI Advisor is temporarily unavailable. Please check your connection or try again.";
  }
  if (!err?.status) {
    return "AI Advisor is temporarily unavailable. Please check your connection or try again.";
  }
  return "AI Advisor is temporarily unavailable. Please check your connection or try again.";
}

function Bubble({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? "bg-ink text-white" : "bg-white border border-hairline text-charcoal"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

export default function AICareerAdvisor() {
  const [readiness, setReadiness] = useState(undefined);
  const [skillProfile, setSkillProfile] = useState(undefined);
  const [messages, setMessages] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    getTargetRoleReadiness().then(setReadiness);
    getSkillProfile().then(setSkillProfile);
    // Render the persisted conversation on reopen instead of always starting
    // empty — a fetch failure just leaves the chat empty (same as before
    // this existed), not an error state, since a fresh chat is still usable.
    aiAdvisorAPI
      .getHistory()
      .then(({ messages: history }) => setMessages(history.map((m) => ({ role: m.role, content: m.content }))))
      .catch((err) => console.warn("Could not load AI advisor history:", err.message))
      .finally(() => setHistoryLoaded(true));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const loading = readiness === undefined || skillProfile === undefined || !historyLoaded;

  const buildContext = () => {
    if (!readiness) return {};
    return {
      targetRole: readiness.role.title,
      readinessPercent: readiness.readinessPercent,
      matchedSkills: readiness.matchedSkills,
      missingSkills: readiness.missingSkills,
      allSkills: skillProfile?.profile?.map((s) => ({
        name: s.name,
        currentScore: s.currentScore,
        trustLevel: s.trustLevel,
      })),
    };
  };

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setSending(true);

    try {
      const { reply } = await aiAdvisorAPI.ask(trimmed, buildContext());
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(friendlyAdvisorError(err));
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <DashboardLayout contentClassName="!max-w-3xl">
      <header className="mb-6 border-b border-hairline pb-6">
        <h1 className="font-geist text-3xl text-ink tracking-tight mb-1 flex items-center gap-2">
          <Sparkle size={26} className="text-ink" weight="fill" />
          AI Career Advisor
        </h1>
        <p className="text-muted">
          Ask about your readiness, skill gaps, or what to do next — grounded in your real, verified profile.
        </p>
      </header>

      {loading && <LoadingState label="Loading your profile…" />}

      {!loading && (
        <>
          {!readiness && (
            <div className="bg-bone border border-hairline rounded-xl p-4 mb-4 text-sm text-charcoal">
              You haven't selected a target role yet — set one on the{" "}
              <a href="/skill-gap" className="text-ink hover:underline">
                Skill Gap
              </a>{" "}
              page for the most grounded advice.
            </div>
          )}

          <div className="bg-white border border-hairline rounded-xl p-6 mb-4 min-h-[320px] flex flex-col gap-4">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-8">
                <p className="text-sm text-muted max-w-sm">
                  Try one of these, or ask your own question about your career readiness.
                </p>
                <div className="flex flex-col gap-2 w-full max-w-sm">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="border border-hairline text-charcoal text-sm px-4 py-2.5 rounded-md hover:bg-bone transition-colors text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} />
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-white border border-hairline rounded-xl px-4 py-3 text-sm text-muted">Thinking…</div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>

          {error && (
            <p className="text-sm text-pastel-red-ink mb-3 flex items-center gap-2">
              <ShieldWarning size={16} />
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              className="flex-1 border border-hairline rounded-md px-4 py-2.5 bg-white focus:border-ink focus:ring-0 text-sm outline-none transition-colors"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your career readiness…"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="shrink-0 bg-ink text-white px-4 py-2.5 rounded-md text-sm hover:bg-ink-hover active:scale-[0.98] transition-all disabled:opacity-60 flex items-center gap-2"
            >
              <PaperPlaneRight size={16} />
              Send
            </button>
          </form>

          <p className="text-xs text-muted mt-4 text-center">
            The advisor recommends — final skill verification always comes from real assessments, projects, or institution/industry review.
          </p>
        </>
      )}
    </DashboardLayout>
  );
}

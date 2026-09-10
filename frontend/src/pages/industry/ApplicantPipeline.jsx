import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { useAuth } from "../../hooks/useAuth";
import { getPipeline, moveStage, rejectCandidate, PIPELINE_STAGES } from "../../services/pipelineService";
import { startConversation } from "../../services/messagesService";
import { UsersThree, ArrowRight, XCircle, EnvelopeSimple } from "@phosphor-icons/react";

// Rejected candidates are dropped off the board entirely rather than shown
// as their own pill — the Reject action (below) still works exactly as
// before, it just stops surfacing that candidate here once rejected.
const STAGES = PIPELINE_STAGES;

export default function ApplicantPipeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState(undefined);
  const [movingId, setMovingId] = useState(null);
  const [contactingId, setContactingId] = useState(null);
  const [openStage, setOpenStage] = useState(null);

  useEffect(() => {
    getPipeline().then(setEntries);
  }, []);

  const toggleStage = (stage) => {
    setOpenStage((prev) => (prev === stage ? null : stage));
  };

  const handleAdvance = async (entry) => {
    const currentIndex = PIPELINE_STAGES.indexOf(entry.stage);
    const nextStage = PIPELINE_STAGES[currentIndex + 1];
    if (!nextStage) return;

    setMovingId(entry.id);
    try {
      await moveStage(entry.id, nextStage);
      const refreshed = await getPipeline();
      setEntries(refreshed);
    } finally {
      setMovingId(null);
    }
  };

  const handleReject = async (entry) => {
    setMovingId(entry.id);
    try {
      await rejectCandidate(entry.id);
      const refreshed = await getPipeline();
      setEntries(refreshed);
    } finally {
      setMovingId(null);
    }
  };

  // Opens (or creates) a real conversation with this applicant and takes the
  // recruiter straight to it — no more fake "Contacted ✓" label flip that
  // sent no actual message.
  const handleContact = async (entry) => {
    setContactingId(entry.id);
    try {
      await startConversation({
        studentId: entry.candidateId,
        industryId: user.id,
        opportunityId: entry.opportunity?.id,
      });
      navigate("/industry/messages");
    } finally {
      setContactingId(null);
    }
  };

  return (
    <>
      <header className="mb-10 border-b border-hairline pb-6">
        <h2 className="font-geist text-3xl text-ink tracking-tight">Applicant Pipeline</h2>
        <p className="text-muted mt-2">Move candidates through your recruitment stages.</p>
      </header>

      {entries === undefined && <LoadingState label="Loading pipeline…" />}

      {entries && entries.length === 0 && (
        <EmptyState icon={UsersThree} title="No applicants yet" description="Applications for your opportunities will show up here." />
      )}

      {entries && entries.length > 0 && (
        <>
          {/* Pill row — fixed in place, never reflows regardless of what's
              expanded below it. */}
          <div className="flex flex-wrap gap-3">
            {STAGES.map((stage) => {
              const stageEntries = entries.filter((e) => e.stage === stage);
              const isCollapsed = openStage !== stage;

              return (
                <button
                  key={stage}
                  onClick={() => toggleStage(stage)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 transition-colors ${
                    isCollapsed ? "border-hairline bg-white hover:bg-bone" : "border-ink bg-ink text-white hover:bg-ink-hover"
                  }`}
                >
                  <span className="text-sm font-medium">{stage}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isCollapsed ? "text-muted bg-bone" : "text-white/80 bg-white/15"
                    }`}
                  >
                    {stageEntries.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Data area — every expanded stage's candidates open here, below
              the whole pill row, in stage order. A collapsed stage takes up
              no space at all (grid-rows-[0fr]), so this adds nothing to the
              page until something is actually open. Smooth height animation
              via the grid-template-rows 0fr/1fr trick — no JS height
              measurement, works with dynamic content. */}
          <div className="flex flex-col">
            {STAGES.map((stage) => {
              const stageEntries = entries.filter((e) => e.stage === stage);
              const isCollapsed = openStage !== stage;

              return (
                <div
                  key={stage}
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="pt-4 pb-2">
                      {stageEntries.length === 0 ? (
                        <div className="text-sm text-muted border border-dashed border-hairline rounded-xl py-8 text-center">
                          Empty
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {stageEntries.map((entry) => {
                            const isLastStage = PIPELINE_STAGES.indexOf(entry.stage) === PIPELINE_STAGES.length - 1;
                            return (
                              <div key={entry.id} className="border border-hairline rounded-xl p-5 flex flex-col gap-3 bg-white">
                                <Link to={`/industry/candidates/${entry.candidateId}`} className="block">
                                  <p className="text-base font-medium text-ink hover:underline">{entry.candidate?.name}</p>
                                  <p className="text-sm text-muted mt-0.5">{entry.opportunity?.title}</p>
                                </Link>

                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  {!isLastStage && (
                                    <button
                                      onClick={() => handleAdvance(entry)}
                                      disabled={movingId === entry.id}
                                      className="flex items-center justify-center gap-1.5 border border-hairline text-charcoal text-xs px-3 py-1.5 rounded-md hover:bg-bone transition-colors disabled:opacity-50"
                                    >
                                      {movingId === entry.id ? "Moving…" : `Move to ${PIPELINE_STAGES[PIPELINE_STAGES.indexOf(entry.stage) + 1]}`}
                                      {movingId !== entry.id && <ArrowRight size={12} />}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleContact(entry)}
                                    disabled={contactingId === entry.id}
                                    className="flex items-center justify-center gap-1.5 border border-hairline text-charcoal text-xs px-3 py-1.5 rounded-md hover:bg-bone transition-colors disabled:opacity-50"
                                  >
                                    <EnvelopeSimple size={12} />
                                    {contactingId === entry.id ? "Opening…" : "Contact"}
                                  </button>
                                  <button
                                    onClick={() => handleReject(entry)}
                                    disabled={movingId === entry.id}
                                    className="flex items-center justify-center gap-1.5 border border-hairline text-pastel-red-ink text-xs px-3 py-1.5 rounded-md hover:bg-pastel-red transition-colors disabled:opacity-50"
                                  >
                                    <XCircle size={12} />
                                    Reject
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

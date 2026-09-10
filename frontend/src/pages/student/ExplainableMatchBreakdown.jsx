import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import WhyThisMatch from "../../components/common/WhyThisMatch";
import { getMatchForOpportunity } from "../../services/matchService";
import { applyToOpportunity, getApplications, hasAppliedTo } from "../../services/applicationsService";
import { getSavedOpportunityIds, saveOpportunity, unsaveOpportunity, isOpportunitySaved } from "../../services/savedOpportunitiesService";
import { ArrowLeft, MagnifyingGlass, BookmarkSimple } from "@phosphor-icons/react";

export default function ExplainableMatchBreakdown() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(undefined); // undefined = loading, null = not found
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setData(undefined);
    Promise.all([getMatchForOpportunity(jobId), getApplications(), getSavedOpportunityIds()]).then(([result, applications, savedIds]) => {
      if (!active) return;
      setData(result);
      if (result) {
        setApplied(hasAppliedTo(result.opportunity.id, applications));
        setSaved(isOpportunitySaved(result.opportunity.id, savedIds));
      }
    });
    return () => {
      active = false;
    };
  }, [jobId]);

  const handleApply = async () => {
    if (!data) return;
    setApplying(true);
    setApplyError("");
    try {
      await applyToOpportunity(data.opportunity);
      setApplied(true);
    } catch (err) {
      setApplyError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const handleToggleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      if (saved) {
        await unsaveOpportunity(data.opportunity.id);
        setSaved(false);
      } else {
        await saveOpportunity(data.opportunity.id);
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      {data === undefined && <LoadingState label="Loading match breakdown…" />}

      {data === null && (
        <EmptyState
          icon={MagnifyingGlass}
          title="Opportunity not found"
          description="This internship or job may have closed, or the link you followed is incorrect."
          actionLabel="Back to Internships/Jobs"
          onAction={() => navigate("/internships")}
        />
      )}

      {data && (
        <div className="max-w-[760px] mx-auto">
          <button
            className="inline-flex items-center gap-2 text-muted text-sm hover:text-ink mb-6 transition-colors"
            onClick={() => navigate("/internships")}
          >
            <ArrowLeft size={16} />
            Back to Internships
          </button>

          <div className="bg-white border border-hairline rounded-xl p-8 flex flex-col gap-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="font-geist text-2xl text-ink tracking-tight mb-1">{data.opportunity.title}</h1>
                <p className="text-muted">{data.opportunity.company}</p>
                <div className="flex gap-2 mt-3">
                  <span className="bg-bone text-charcoal px-2.5 py-1 rounded-full text-xs">{data.opportunity.location}</span>
                  <span className="bg-bone text-charcoal px-2.5 py-1 rounded-full text-xs">{data.opportunity.type}</span>
                </div>
              </div>
            </div>

            <WhyThisMatch match={data.match} compact />
          </div>

          <div className="mt-6 flex flex-col md:flex-row justify-end items-stretch md:items-center gap-3">
            {applyError && <p className="text-sm text-pastel-red-ink md:mr-auto">{applyError}</p>}
            <button
              className="inline-flex items-center gap-1.5 border border-hairline text-charcoal text-sm px-6 py-2.5 rounded-md hover:bg-bone transition-colors disabled:opacity-60"
              onClick={handleToggleSave}
              disabled={saving}
            >
              <BookmarkSimple size={16} weight={saved ? "fill" : "regular"} />
              {saved ? "Saved ✓" : saving ? "Saving…" : "Save for Later"}
            </button>
            <button
              className="bg-ink text-white text-sm px-6 py-2.5 rounded-md hover:bg-ink-hover active:scale-[0.98] transition-all disabled:opacity-60"
              onClick={handleApply}
              disabled={applied || applying}
            >
              {applied ? "Applied ✓" : applying ? "Applying…" : "Apply Now"}
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

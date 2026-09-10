import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { getMyOpportunities, updateOpportunityStatus } from "../../services/opportunitiesService";
import { Briefcase, PlusCircle } from "@phosphor-icons/react";

const STATUS_TONE = {
  Active: "bg-pastel-green text-pastel-green-ink",
  Draft: "bg-bone text-muted",
  Closed: "bg-pastel-red text-pastel-red-ink",
  Expired: "bg-bone text-muted",
};

export default function ManageOpportunities() {
  const [opportunities, setOpportunities] = useState(undefined);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyOpportunities().then(setOpportunities);
  }, []);

  const handleClose = async (opp) => {
    // Confirmation gate — closing stops the posting from appearing to
    // students immediately, so guard against an accidental click.
    const confirmed = window.confirm(`Close "${opp.title}"? It will stop appearing to students immediately. Existing applications are unaffected.`);
    if (!confirmed) return;

    setUpdatingId(opp.id);
    setError("");
    try {
      await updateOpportunityStatus(opp.id, "Closed");
      const refreshed = await getMyOpportunities();
      setOpportunities(refreshed);
    } catch (err) {
      setError(err.message || `Could not close "${opp.title}". Please try again.`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <h2 className="font-geist text-3xl text-ink tracking-tight">Opportunities</h2>
          <p className="text-muted mt-2">Manage the roles you've posted.</p>
        </div>
        <Link
          to="/industry/opportunities/create"
          className="bg-ink text-white px-4 py-2 rounded-md text-sm hover:bg-ink-hover active:scale-[0.98] transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <PlusCircle size={16} />
          Post Opportunity
        </Link>
      </header>

      {error && (
        <p className="text-sm text-pastel-red-ink bg-pastel-red/20 border border-pastel-red rounded-md px-3 py-2 mb-6">{error}</p>
      )}

      {opportunities === undefined && <LoadingState label="Loading opportunities…" />}

      {opportunities && opportunities.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title="No opportunities posted yet"
          description="Click Post Opportunity to create your first listing."
          actionLabel="Post Opportunity"
          onAction={() => (window.location.href = "/industry/opportunities/create")}
        />
      )}

      {opportunities && opportunities.length > 0 && (
        <div className="bg-white border border-hairline rounded-xl">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bone border-b border-hairline text-xs uppercase tracking-wide text-muted">
                  <th className="p-4 font-medium">Title</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Location</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm text-charcoal divide-y divide-hairline">
                {opportunities.map((o) => {
                  const status = o.status ?? "Active";
                  return (
                    <tr key={o.id} className="hover:bg-bone transition-colors">
                      <td className="p-4 font-medium text-ink">{o.title}</td>
                      <td className="p-4 text-muted">{o.type}</td>
                      <td className="p-4 text-muted">{o.location}</td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs uppercase tracking-wide ${STATUS_TONE[status] || STATUS_TONE.Draft}`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-3 items-center">
                          <Link to="/industry/applications" className="text-ink hover:underline text-sm">
                            View Applicants
                          </Link>
                          {status === "Active" && (
                            <button
                              onClick={() => handleClose(o)}
                              disabled={updatingId === o.id}
                              className="text-pastel-red-ink hover:underline text-sm disabled:opacity-50"
                            >
                              {updatingId === o.id ? "Closing…" : "Close"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

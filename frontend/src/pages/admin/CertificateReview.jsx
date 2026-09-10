import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { adminNavItems } from "../../config/adminNavConfig";
import { portfolioAPI } from "../../services/api";
import { SealCheck, FilePdf, CheckCircle, XCircle } from "@phosphor-icons/react";

// Minimal manual review queue: every certification with an uploaded file
// awaiting review. No QR/automated issuer verification this pass — just
// look at the file and approve or reject.
export default function CertificateReview() {
  const [pending, setPending] = useState(undefined);
  const [decidingId, setDecidingId] = useState(null);
  const [error, setError] = useState("");

  const refresh = () => portfolioAPI.getPendingCertifications().then(({ certifications }) => setPending(certifications));

  useEffect(() => {
    refresh();
  }, []);

  const handleDecision = async (id, status) => {
    setDecidingId(id);
    setError("");
    try {
      await portfolioAPI.reviewCertification(id, status);
      await refresh();
    } catch (err) {
      setError(err.message || "Could not update this certification.");
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <DashboardLayout navItems={adminNavItems} footerNavItems={[]} title="Institution Portal" subtitle="Admin Analytics">
      <header className="mb-10 border-b border-hairline pb-6">
        <h1 className="font-geist text-3xl text-ink tracking-tight mb-1">Certificate Review</h1>
        <p className="text-muted">
          Certifications students have attached a file to, awaiting manual approval. Automated issuer verification and QR
          scanning are planned for a future release — this queue is a manual review only.
        </p>
      </header>

      {error && <p className="text-sm text-pastel-red-ink bg-pastel-red/20 border border-pastel-red rounded-md px-3 py-2 mb-6">{error}</p>}

      {pending === undefined && <LoadingState label="Loading pending certifications…" />}

      {pending && pending.length === 0 && (
        <EmptyState icon={SealCheck} title="Nothing to review" description="Certifications students upload a file for will show up here." />
      )}

      {pending && pending.length > 0 && (
        <div className="flex flex-col gap-4">
          {pending.map((c) => (
            <div key={c.id} className="bg-white border border-hairline rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">{c.title}</p>
                <p className="text-xs text-muted mt-0.5">
                  {c.studentName} ({c.studentEmail}) • {c.issuer}
                  {c.date && ` • ${new Date(c.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                </p>
                {c.fileUrl && (
                  <a href={c.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-ink hover:underline mt-2">
                    <FilePdf size={14} /> {c.fileName || "View uploaded file"}
                  </a>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDecision(c.id, "rejected")}
                  disabled={decidingId === c.id}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 border border-hairline text-pastel-red-ink text-sm px-4 py-2 rounded-md hover:bg-pastel-red transition-colors disabled:opacity-50"
                >
                  <XCircle size={16} />
                  Reject
                </button>
                <button
                  onClick={() => handleDecision(c.id, "verified")}
                  disabled={decidingId === c.id}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-ink text-white text-sm px-4 py-2 rounded-md hover:bg-ink-hover transition-colors disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  {decidingId === c.id ? "Saving…" : "Approve"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

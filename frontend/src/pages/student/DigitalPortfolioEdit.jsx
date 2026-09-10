import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import { FloppyDisk, UserCircle, UploadSimple, Trash } from "@phosphor-icons/react";
import { useAuth } from "../../hooks/useAuth";
import { getPortfolio, savePortfolioBasics, uploadAvatar, removeAvatar } from "../../services/portfolioService";

const inputClass =
  "w-full border border-hairline rounded-md px-3 py-2.5 bg-white focus:border-ink focus:ring-0 text-sm outline-none transition-colors";

export default function DigitalPortfolioEdit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  useEffect(() => {
    getPortfolio().then((p) => {
      setForm({
        headline: p.headline,
        institution: p.institution,
        // Older entries were saved as "YYYY-MM" by the previous month picker —
        // keep only the year for the new year-only field.
        expectedGraduation: (p.expectedGraduation || "").slice(0, 4),
        bio: p.bio,
      });
      setAvatarUrl(p.avatarUrl || "");
    });
  }, []);

  if (!form) {
    return (
      <DashboardLayout>
        <LoadingState fullScreen={false} label="Loading portfolio…" />
      </DashboardLayout>
    );
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePortfolioBasics(form);
      setSaved(true);
      navigate("/portfolio");
    } finally {
      setSaving(false);
    }
  };

  // Uploads immediately on selection (same pattern as certificate files)
  // rather than deferring to Save Changes, so the photo is never lost if the
  // student navigates away before saving the rest of the form.
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarBusy(true);
    setAvatarError("");
    try {
      const url = await uploadAvatar(file);
      setAvatarUrl(url);
    } catch (err) {
      setAvatarError(err.message || "Could not upload this photo.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarBusy(true);
    setAvatarError("");
    try {
      await removeAvatar();
      setAvatarUrl("");
    } catch (err) {
      setAvatarError(err.message || "Could not remove this photo.");
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <DashboardLayout>
      {/*Page Header*/}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="font-geist text-3xl text-ink tracking-tight">Edit Portfolio</h2>
          <p className="text-muted mt-2">Manage your academic and professional profile visible to industry partners.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => navigate("/portfolio")}
            className="flex-1 md:flex-none py-2 px-6 border border-hairline rounded-md text-charcoal text-sm hover:bg-bone transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 md:flex-none py-2 px-6 rounded-md bg-ink text-white text-sm hover:bg-ink-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <FloppyDisk size={16} />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
      {/*Profile Picture*/}
      <section className="bg-white border border-hairline rounded-xl p-8 mb-6">
        <h3 className="text-base font-medium text-ink mb-4 border-b border-hairline pb-3">Profile Picture</h3>
        <div className="flex items-center gap-5">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover border border-hairline flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-bone border border-hairline flex items-center justify-center flex-shrink-0">
              <UserCircle size={36} className="text-muted" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted">No profile picture is shown by default — upload one if you'd like.</p>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1.5 text-sm border border-hairline rounded-md px-3 py-1.5 hover:bg-bone transition-colors cursor-pointer disabled:opacity-60">
                <UploadSimple size={14} />
                {avatarBusy ? "Uploading…" : avatarUrl ? "Replace photo" : "Upload photo"}
                <input type="file" accept="image/*" className="hidden" disabled={avatarBusy} onChange={handleAvatarChange} />
              </label>
              {avatarUrl && (
                <button
                  onClick={handleAvatarRemove}
                  disabled={avatarBusy}
                  className="inline-flex items-center gap-1.5 text-sm text-pastel-red-ink hover:underline disabled:opacity-60"
                >
                  <Trash size={14} />
                  Remove
                </button>
              )}
            </div>
            {avatarError && <p className="text-xs text-pastel-red-ink">{avatarError}</p>}
          </div>
        </div>
      </section>

      {/*Basic Info Form*/}
      <section className="bg-white border border-hairline rounded-xl p-8">
        <h3 className="text-base font-medium text-ink mb-4 border-b border-hairline pb-3">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Full Name</label>
            <input className={`${inputClass} bg-bone`} type="text" value={user?.name || ""} disabled title="Update your name in Settings" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Headline / Major</label>
            <input className={inputClass} type="text" value={form.headline} onChange={handleChange("headline")} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Institution</label>
            <input className={inputClass} type="text" value={form.institution} onChange={handleChange("institution")} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Graduated in</label>
            <input
              className={inputClass}
              type="number"
              inputMode="numeric"
              placeholder="2027"
              min="1950"
              max="2100"
              step="1"
              value={form.expectedGraduation}
              onChange={handleChange("expectedGraduation")}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Bio / Summary</label>
            <textarea className={`${inputClass} min-h-[100px] resize-y`} value={form.bio} onChange={handleChange("bio")} />
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

import { useEffect, useRef, useState } from "react";
import LoadingState from "../../components/common/LoadingState";
import { getCompanyProfile, saveCompanyProfile } from "../../services/companyProfileService";
import { DEFAULT_COMPANY_PROFILE } from "../../services/mockData/companyProfile";
import { FloppyDisk, Buildings, UploadSimple, X } from "@phosphor-icons/react";

const inputClass =
  "w-full border border-hairline rounded-md px-3 py-2.5 bg-white focus:border-ink focus:ring-0 text-sm outline-none transition-colors";

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB — keeps the stored data URL reasonable

export default function CompanyProfile() {
  const [form, setForm] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoError, setLogoError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    getCompanyProfile().then((profile) => setForm(profile ?? DEFAULT_COMPANY_PROFILE));
  }, []);

  if (!form) {
    return <LoadingState fullScreen={false} label="Loading company profile…" />;
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSaved(false);
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setLogoError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Image is too large — please choose one under 2MB.");
      return;
    }

    setLogoError("");
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, logoUrl: reader.result }));
      setSaved(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setForm((prev) => ({ ...prev, logoUrl: null }));
    setLogoError("");
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCompanyProfile(form, { requireBackend: true });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="font-geist text-3xl text-ink tracking-tight">Company Profile</h2>
          <p className="text-muted mt-2">This is what students and academicians see about your organization.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="py-2 px-6 rounded-md bg-ink text-white text-sm hover:bg-ink-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <FloppyDisk size={16} />
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>

      <section className="bg-white border border-hairline rounded-xl p-8 mb-6">
        <h3 className="text-base font-medium text-ink mb-4 border-b border-hairline pb-3">Company Logo</h3>
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full border border-hairline bg-bone flex items-center justify-center overflow-hidden flex-shrink-0">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="Company logo" className="w-full h-full object-cover" />
            ) : (
              <Buildings size={28} className="text-muted" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-4 rounded-md border border-hairline text-ink text-sm hover:bg-bone transition-colors flex items-center gap-2"
              >
                <UploadSimple size={16} />
                {form.logoUrl ? "Replace logo" : "Upload logo"}
              </button>
              {form.logoUrl && (
                <button
                  onClick={handleRemoveLogo}
                  className="py-2 px-3 rounded-md text-muted text-sm hover:text-ink hover:bg-bone transition-colors flex items-center gap-1.5"
                >
                  <X size={14} />
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoSelect}
              className="hidden"
            />
            <p className="text-xs text-muted mt-2">PNG or JPG, up to 2MB. Shown to students and academicians.</p>
            {logoError && <p className="text-xs text-pastel-red-ink mt-1">{logoError}</p>}
          </div>
        </div>
      </section>

      <section className="bg-white border border-hairline rounded-xl p-8">
        <h3 className="text-base font-medium text-ink mb-4 border-b border-hairline pb-3">Organization Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Company Name</label>
            <input className={inputClass} type="text" value={form.name} onChange={handleChange("name")} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Industry</label>
            <input className={inputClass} type="text" value={form.industry} onChange={handleChange("industry")} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Website</label>
            <input className={inputClass} type="text" value={form.website} onChange={handleChange("website")} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Company Size</label>
            <input className={inputClass} type="text" value={form.size} onChange={handleChange("size")} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">About</label>
            <textarea className={`${inputClass} min-h-[100px] resize-y`} value={form.about} onChange={handleChange("about")} />
          </div>
        </div>
      </section>
    </>
  );
}

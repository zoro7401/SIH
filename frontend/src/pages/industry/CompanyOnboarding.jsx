import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { saveCompanyProfile, uploadCompanyLogo } from "../../services/companyProfileService";
import { ArrowClockwise, WarningCircle, Buildings } from "@phosphor-icons/react";

const inputClass =
  "w-full border border-hairline rounded-md px-3 py-2.5 bg-white focus:border-ink focus:ring-0 text-sm placeholder:text-muted outline-none transition-colors";

// Shown once, right after an industry account is created (email/password or
// Google) — collects the same fields as the Company Profile settings page so
// students/academicians never see a blank organization card. IndustryDashboard
// and every other /industry/* route redirect here until a profile is saved
// (see ProtectedRoute's companyProfile check), so this is the only way in.
export default function CompanyOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: "",
    industry: "",
    website: "",
    size: "",
    about: "",
    logoUrl: null,
  });
  const [error, setError] = useState("");
  const [logoError, setLogoError] = useState("");
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
  };

  const handleLogoSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Image is too large — please choose one under 2MB.");
      return;
    }

    setLogoError("");
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, logoUrl: reader.result }));
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Company name is required");
      return;
    }
    if (!logoFile) {
      setError("Company logo is required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const logoUrl = await uploadCompanyLogo(logoFile);
      await saveCompanyProfile({ ...form, logoUrl }, { requireBackend: true });
      navigate("/industry/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Could not save your company profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas text-charcoal px-4 py-12">
      <main className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-white border border-hairline flex items-center justify-center mx-auto mb-4">
            <Buildings size={22} className="text-ink" />
          </div>
          <h1 className="font-geist text-3xl text-ink tracking-tight mb-2">Tell us about your company</h1>
          <p className="text-muted">
            Welcome{user?.name ? `, ${user.name}` : ""} — this is what students and academicians will see about your
            organization. You can edit it anytime from Company Profile.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-hairline rounded-xl p-8 space-y-5">
          {error && (
            <div className="px-3 py-2.5 bg-pastel-red rounded-md flex items-start gap-2">
              <WarningCircle size={18} weight="bold" className="text-pastel-red-ink flex-shrink-0 mt-0.5" />
              <p className="text-sm text-pastel-red-ink">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Company Logo *</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border border-hairline bg-bone flex items-center justify-center overflow-hidden flex-shrink-0">
                  {form.logoUrl ? <img src={form.logoUrl} alt="Company logo preview" className="w-full h-full object-cover" /> : <Buildings size={24} className="text-muted" />}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                    className="py-2 px-4 rounded-md border border-hairline text-ink text-sm hover:bg-bone transition-colors disabled:opacity-50"
                  >
                    {form.logoUrl ? "Replace logo" : "Upload logo"}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
                  <p className="text-xs text-muted mt-1">PNG or JPG, up to 2MB.</p>
                  {logoError && <p className="text-xs text-pastel-red-ink mt-1">{logoError}</p>}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Company Name *</label>
              <input
                className={inputClass}
                type="text"
                placeholder="Acme Corp"
                value={form.name}
                onChange={handleChange("name")}
                disabled={saving}
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Industry</label>
              <input
                className={inputClass}
                type="text"
                placeholder="Software & Cloud Infrastructure"
                value={form.industry}
                onChange={handleChange("industry")}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Website</label>
              <input
                className={inputClass}
                type="text"
                placeholder="https://example.com"
                value={form.website}
                onChange={handleChange("website")}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">Company Size</label>
              <input
                className={inputClass}
                type="text"
                placeholder="50-200 employees"
                value={form.size}
                onChange={handleChange("size")}
                disabled={saving}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wide text-muted mb-1.5">About</label>
              <textarea
                className={`${inputClass} min-h-[100px] resize-y`}
                placeholder="A short description of what your company does…"
                value={form.about}
                onChange={handleChange("about")}
                disabled={saving}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-ink text-white text-sm font-medium rounded-md py-2.5 px-4 hover:bg-ink-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <ArrowClockwise size={16} className="animate-spin" />
                Saving…
              </>
            ) : (
              "Continue to Dashboard"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}

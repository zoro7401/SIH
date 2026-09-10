import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import { useAuth } from "../../hooks/useAuth";
import { getPreferences, savePreferences } from "../../services/preferencesService";
import { getPortfolio } from "../../services/portfolioService";
import { authAPI } from "../../services/api";
import { OPPORTUNITY_CITIES } from "../../constants/opportunityFilters";
import { SignOut, PencilSimple, CheckCircle } from "@phosphor-icons/react";

const DEGREES = ["B.Tech", "B.E.", "B.Sc", "BCA", "M.Tech", "M.E.", "M.Sc", "MCA", "Other"];

const inputClass =
  "border border-hairline rounded-md px-3 py-2.5 text-sm focus:border-ink focus:ring-0 focus:outline-none bg-white text-charcoal transition-colors";
const selectClass = `${inputClass} cursor-pointer`;

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input checked={checked} onChange={onChange} className="sr-only peer" type="checkbox" />
        <div className="w-11 h-6 bg-bone border border-hairline peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-hairline after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ink" />
      </label>
    </div>
  );
}

function SectionCard({ title, action, children }) {
  return (
    <div className="bg-white border border-hairline rounded-xl p-8 mb-6">
      <div className="flex items-center justify-between mb-6 border-b border-hairline pb-3">
        <h3 className="text-base font-medium text-ink">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function ProfileSettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(undefined);
  const [portfolio, setPortfolio] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState(null); // { type: "success" | "error", text }

  useEffect(() => {
    getPreferences().then(setPrefs);
    getPortfolio().then(setPortfolio);
  }, []);

  const handleToggle = (key) => async (e) => {
    const next = { ...prefs, [key]: e.target.checked };
    setPrefs(next);
    setSaving(true);
    setSaved(false);
    try {
      await savePreferences(next);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldSave = (key) => async (e) => {
    const next = { ...prefs, [key]: e.target.value };
    setPrefs(next);
  };

  const handleFieldBlur = async () => {
    if (!prefs) return;
    setSaving(true);
    setSaved(false);
    try {
      await savePreferences(prefs);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectSave = (key) => async (e) => {
    const next = { ...prefs, [key]: e.target.value };
    setPrefs(next);
    setSaving(true);
    setSaved(false);
    try {
      await savePreferences(next);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMessage(null);
    if (pwForm.newPassword.length < 8) {
      setPwMessage({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMessage({ type: "error", text: "New password and confirmation don't match." });
      return;
    }
    setPwSaving(true);
    try {
      await authAPI.changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwMessage({ type: "success", text: "Password updated successfully." });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwMessage({ type: "error", text: err.message });
    } finally {
      setPwSaving(false);
    }
  };

  // Reuses the same logout() the sidebar uses — clears Supabase session,
  // the auth cookie via authAPI.logout(), and local user cache. Never a
  // standalone redirect-only button.
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const [firstName = "", lastName = ""] = (user?.name || "").split(/\s+/, 2);

  return (
    <DashboardLayout>
      <header className="mb-10">
        <h2 className="font-geist text-3xl text-ink tracking-tight">Settings</h2>
        <p className="text-muted mt-2">Manage your profile, account, privacy, and security preferences.</p>
      </header>

      {/* Profile Settings */}
      <SectionCard
        title="Profile Settings"
        action={
          <Link to="/portfolio/edit" className="inline-flex items-center gap-1.5 text-xs text-ink hover:text-muted transition-colors">
            <PencilSimple size={14} />
            Edit in Portfolio
          </Link>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wide text-muted">First Name</label>
            <input className={`${inputClass} bg-bone`} type="text" value={firstName} disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wide text-muted">Last Name</label>
            <input className={`${inputClass} bg-bone`} type="text" value={lastName} disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wide text-muted">Email Address</label>
            <input className={`${inputClass} bg-bone`} type="email" value={user?.email || ""} disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wide text-muted">Phone</label>
            {prefs === undefined ? (
              <input className={`${inputClass} bg-bone`} disabled value="Loading…" />
            ) : (
              <input
                className={inputClass}
                type="tel"
                placeholder="Add a phone number"
                value={prefs.phone}
                onChange={handleFieldSave("phone")}
                onBlur={handleFieldBlur}
              />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wide text-muted">College / Institution</label>
            <input className={`${inputClass} bg-bone`} type="text" value={portfolio?.institution || ""} disabled placeholder="Not set" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wide text-muted">Expected Graduation</label>
            <input className={`${inputClass} bg-bone`} type="text" value={portfolio?.expectedGraduation || ""} disabled placeholder="Not set" />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs uppercase tracking-wide text-muted">Course / Branch</label>
            {prefs === undefined ? (
              <input className={`${inputClass} bg-bone`} disabled value="Loading…" />
            ) : (
              <input
                className={inputClass}
                type="text"
                placeholder="e.g. B.Tech, Computer Science"
                value={prefs.course}
                onChange={handleFieldSave("course")}
                onBlur={handleFieldBlur}
              />
            )}
          </div>
        </div>
        <p className="text-xs text-muted mt-4">
          College comes from your Portfolio — edit it there. Name, email, and role are managed by your institution.
        </p>
      </SectionCard>

      {/* Education & Match Preferences — real student data the matching
          engine's Education and Location dimensions compare opportunities
          against (see matchingEngine.js evaluateEducation/evaluateLocation),
          instead of always scoring ~100%. */}
      <SectionCard title="Education & Match Preferences">
        {prefs === undefined ? (
          <LoadingState fullScreen={false} label="Loading…" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wide text-muted">Degree</label>
              <select className={selectClass} value={prefs.degree || ""} onChange={handleSelectSave("degree")}>
                <option value="">Not set</option>
                {DEGREES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wide text-muted">Branch / Major</label>
              <input
                className={inputClass}
                type="text"
                placeholder="e.g. Computer Science"
                value={prefs.branch || ""}
                onChange={handleFieldSave("branch")}
                onBlur={handleFieldBlur}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wide text-muted">Graduation Year</label>
              <input
                className={inputClass}
                type="number"
                placeholder="e.g. 2026"
                min="2000"
                max="2100"
                value={prefs.graduationYear ?? ""}
                onChange={(e) => setPrefs((p) => ({ ...p, graduationYear: e.target.value ? Number(e.target.value) : null }))}
                onBlur={handleFieldBlur}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wide text-muted">Preferred Work Location</label>
              <select className={selectClass} value={prefs.preferredLocation || ""} onChange={handleSelectSave("preferredLocation")}>
                <option value="">No preference</option>
                <option value="Remote">Remote</option>
                {OPPORTUNITY_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {saving && <p className="text-xs text-muted mt-4">Saving…</p>}
        {saved && !saving && (
          <p className="text-xs text-pastel-green-ink mt-4 flex items-center gap-1">
            <CheckCircle size={14} weight="fill" />
            Saved.
          </p>
        )}
      </SectionCard>

      {/* Account Settings */}
      <SectionCard title="Account Settings">
        {prefs === undefined && <LoadingState fullScreen={false} label="Loading preferences…" />}
        {prefs && (
          <div className="flex flex-col divide-y divide-hairline">
            <ToggleRow
              title="Email Notifications"
              description="Receive updates about new opportunities."
              checked={prefs.emailNotifications}
              onChange={handleToggle("emailNotifications")}
            />
            <ToggleRow
              title="SMS Alerts"
              description="Get text messages for important account alerts."
              checked={prefs.smsAlerts}
              onChange={handleToggle("smsAlerts")}
            />
            <ToggleRow
              title="Application Updates"
              description="Notify me when my application status changes."
              checked={prefs.applicationUpdates}
              onChange={handleToggle("applicationUpdates")}
            />
            <div className="flex items-center justify-between py-3 gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Language</p>
                <p className="text-sm text-muted">Portal display language.</p>
              </div>
              <select className={selectClass} value="English" disabled>
                <option>English</option>
              </select>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Privacy */}
      <SectionCard title="Privacy">
        {prefs === undefined && <LoadingState fullScreen={false} label="Loading preferences…" />}
        {prefs && (
          <div className="flex flex-col divide-y divide-hairline">
            <div className="flex items-center justify-between py-3 gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Profile Visibility</p>
                <p className="text-sm text-muted">Who can see your basic profile information.</p>
              </div>
              <select className={selectClass} value={prefs.profileVisibility} onChange={handleSelectSave("profileVisibility")}>
                <option>Public</option>
                <option>Institution Only</option>
                <option>Private</option>
              </select>
            </div>
            <div className="flex items-center justify-between py-3 gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Portfolio Visibility</p>
                <p className="text-sm text-muted">Who can view your Digital Portfolio / Skill Passport.</p>
              </div>
              <select className={selectClass} value={prefs.portfolioVisibility} onChange={handleSelectSave("portfolioVisibility")}>
                <option>Public</option>
                <option>Institution Only</option>
                <option>Private</option>
              </select>
            </div>
            <div className="flex items-center justify-between py-3 gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Opportunity Visibility</p>
                <p className="text-sm text-muted">Whether recruiters can discover your profile via Candidates search.</p>
              </div>
              <select className={selectClass} value={prefs.opportunityVisibility} onChange={handleSelectSave("opportunityVisibility")}>
                <option>Visible to Recruiters</option>
                <option>Hidden</option>
              </select>
            </div>
            <ToggleRow
              title="Data Sharing"
              description="Allow verified assessment and skill data to be shared with matched employers."
              checked={prefs.dataSharingConsent}
              onChange={handleToggle("dataSharingConsent")}
            />
          </div>
        )}
        {saving && <p className="text-xs text-muted mt-4">Saving…</p>}
        {saved && !saving && (
          <p className="text-xs text-pastel-green-ink mt-4 flex items-center gap-1">
            <CheckCircle size={14} weight="fill" />
            Preferences saved.
          </p>
        )}
      </SectionCard>

      {/* Security */}
      <SectionCard title="Security">
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4 max-w-md">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wide text-muted">Current Password</label>
            <input
              className={inputClass}
              type="password"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
              autoComplete="current-password"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wide text-muted">New Password</label>
            <input
              className={inputClass}
              type="password"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wide text-muted">Confirm New Password</label>
            <input
              className={inputClass}
              type="password"
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          {pwMessage && (
            <p className={`text-xs ${pwMessage.type === "success" ? "text-pastel-green-ink" : "text-pastel-red-ink"}`}>{pwMessage.text}</p>
          )}
          <button
            type="submit"
            disabled={pwSaving || !pwForm.currentPassword || !pwForm.newPassword}
            className="self-start bg-ink text-white px-5 py-2.5 rounded-md text-sm hover:bg-ink-hover active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {pwSaving ? "Updating…" : "Update Password"}
          </button>
          <p className="text-xs text-muted">
            Signed in with Google? Password changes aren't available here — manage your password from your Google Account instead.
          </p>
        </form>
        <div className="mt-6 pt-6 border-t border-hairline text-sm text-muted">
          <p>
            Last login: <span className="text-charcoal">{user?.last_login ? new Date(user.last_login).toLocaleString() : "This session"}</span>
          </p>
        </div>
      </SectionCard>

      {/* Logout */}
      <div className="bg-white border border-hairline rounded-xl p-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-base font-medium text-ink mb-1">Log Out</h3>
          <p className="text-sm text-muted">Sign out of SkillBridge on this device.</p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 border border-hairline text-charcoal px-5 py-2.5 rounded-md text-sm hover:bg-bone hover:border-ink transition-colors cursor-pointer"
        >
          <SignOut size={16} />
          Log Out
        </button>
      </div>
    </DashboardLayout>
  );
}

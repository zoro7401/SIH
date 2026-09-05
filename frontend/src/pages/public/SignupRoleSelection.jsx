import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getPostLoginRedirect } from "../../utils/roleRedirect";
import { GraduationCap, Buildings, Flask, WarningCircle, ArrowClockwise } from "@phosphor-icons/react";
import AmbientBrandGlow from "../../components/ui/ambient-brand-glow";

const ROLES = [
  { id: "student", icon: GraduationCap, label: "Student" },
  { id: "industry", icon: Buildings, label: "Industry Partner" },
  { id: "academician", icon: Flask, label: "Academician" },
];

export default function SignupRoleSelection() {
  const navigate = useNavigate();
  const { register, loading, error: authError } = useAuth();

  const [selectedRole, setSelectedRole] = useState("");
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    password: "",
  });
  const [localError, setLocalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setLocalError("");
  };

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setLocalError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setIsSubmitting(true);

    try {
      // Validate inputs
      if (!selectedRole) {
        setLocalError("Please select a role");
        setIsSubmitting(false);
        return;
      }

      if (!formData.fullname.trim()) {
        setLocalError("Full name is required");
        setIsSubmitting(false);
        return;
      }

      if (!formData.email.trim()) {
        setLocalError("Email is required");
        setIsSubmitting(false);
        return;
      }

      if (!formData.password) {
        setLocalError("Password is required");
        setIsSubmitting(false);
        return;
      }

      // Password requirements check
      if (formData.password.length < 8) {
        setLocalError("Password must be at least 8 characters");
        setIsSubmitting(false);
        return;
      }

      if (!/[A-Z]/.test(formData.password)) {
        setLocalError("Password must contain uppercase letter");
        setIsSubmitting(false);
        return;
      }

      if (!/[a-z]/.test(formData.password)) {
        setLocalError("Password must contain lowercase letter");
        setIsSubmitting(false);
        return;
      }

      if (!/[0-9]/.test(formData.password)) {
        setLocalError("Password must contain a number");
        setIsSubmitting(false);
        return;
      }

      // Call register function
      await register(formData.email, formData.password, formData.fullname, selectedRole);

      // New industry accounts must complete company onboarding before entering
      // the dashboard. Other roles keep their normal post-signup destination.
      const destination = selectedRole === "industry" ? "/industry/onboarding" : getPostLoginRedirect(selectedRole);
      navigate(destination, { replace: true });
    } catch (err) {
      setLocalError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorMessage = localError || authError;

  return (
    <AmbientBrandGlow className="min-h-screen text-charcoal flex flex-col antialiased">
      <main className="flex-grow flex items-center justify-center py-16 px-4">
        <div className="max-w-[560px] w-full">
          <div className="text-center mb-10">
            <h1 className="font-sans font-bold text-3xl text-ink tracking-tight mb-2">Create your account</h1>
            <p className="text-muted">Join SkillBridge to collaborate and innovate.</p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 px-3 py-2.5 bg-pastel-red rounded-md">
              <div className="flex items-start gap-2">
                <WarningCircle size={18} weight="bold" className="text-pastel-red-ink flex-shrink-0 mt-0.5" />
                <p className="text-sm text-pastel-red-ink">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/*Role Selection*/}
            <div>
              <label className="block text-xs uppercase tracking-wide text-muted font-bold mb-3">Select your role</label>
              <div className="grid grid-cols-3 gap-3">
                {ROLES.map((role) => {
                  const Icon = role.icon;
                  return (
                    <div
                      key={role.id}
                      onClick={() => handleRoleSelect(role.id)}
                      className={`border rounded-xl p-4 cursor-pointer transition-colors text-center flex flex-col items-center justify-center gap-2 bg-white ${
                        selectedRole === role.id ? "border-ink" : "border-hairline hover:border-charcoal"
                      }`}
                    >
                      <Icon size={26} className="text-ink" />
                      <span className="text-sm text-charcoal">{role.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/*Account Details*/}
            <div className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted font-bold mb-1.5" htmlFor="fullname">
                  Full Name
                </label>
                <input
                  className="w-full border border-hairline rounded-md px-3 py-2.5 bg-white focus:border-ink focus:ring-0 text-sm placeholder:text-muted outline-none transition-colors"
                  id="fullname"
                  name="fullname"
                  placeholder="Jane Doe"
                  type="text"
                  value={formData.fullname}
                  onChange={handleInputChange}
                  disabled={isSubmitting || loading}
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted font-bold mb-1.5" htmlFor="email">
                  Work Email
                </label>
                <input
                  className="w-full border border-hairline rounded-md px-3 py-2.5 bg-white focus:border-ink focus:ring-0 text-sm placeholder:text-muted outline-none transition-colors"
                  id="email"
                  name="email"
                  placeholder="jane@university.edu"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isSubmitting || loading}
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted font-bold mb-1.5" htmlFor="password">
                  Password
                </label>
                <input
                  className="w-full border border-hairline rounded-md px-3 py-2.5 bg-white focus:border-ink focus:ring-0 text-sm placeholder:text-muted outline-none transition-colors"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isSubmitting || loading}
                  required
                />
                <p className="text-xs text-muted mt-1.5">Min 8 characters, 1 uppercase, 1 lowercase, 1 number</p>
              </div>
            </div>

            {/*Submit*/}
            <button
              className="mx-auto flex items-center justify-center gap-2 bg-ink text-white text-sm font-medium rounded-md py-2.5 px-10 hover:bg-[#333333] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={isSubmitting || loading}
            >
              {isSubmitting || loading ? (
                <>
                  <ArrowClockwise size={16} className="animate-spin" />
                  Creating account
                </>
              ) : (
                "Sign Up"
              )}
            </button>

            <div className="text-center text-sm text-muted">
              Already have an account?{" "}
              <a className="text-ink hover:text-muted transition-colors" href="/login">
                Login
              </a>
            </div>
          </form>
        </div>
      </main>

      {/*Footer*/}
      <footer className="w-full py-8 px-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-canvas border-t border-hairline text-xs text-muted">
        <div>© 2026 SkillBridge Collaboration Portal. All rights reserved.</div>
        <div className="flex gap-6">
          <a className="hover:text-ink transition-colors" href="#">
            Privacy Policy
          </a>
          <a className="hover:text-ink transition-colors" href="#">
            Terms of Service
          </a>
          <a className="hover:text-ink transition-colors" href="#">
            Contact Us
          </a>
          <a className="hover:text-ink transition-colors" href="#">
            Help Center
          </a>
        </div>
      </footer>
    </AmbientBrandGlow>
  );
}

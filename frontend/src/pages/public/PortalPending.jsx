import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Wrench } from "@phosphor-icons/react";

const ROLE_LABELS = {
  industry: "Industry",
  academician: "Academician",
  admin: "Institution",
};

export default function PortalPending() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const roleLabel = ROLE_LABELS[user?.role] || "your";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div
      className="min-h-screen p-2.5 md:p-4"
      style={{ background: "linear-gradient(135deg, #060B24 0%, #0B1C6B 35%, #1E3FE0 62%, #050814 100%)" }}
    >
      <div className="bg-white rounded-[28px] md:rounded-[32px] min-h-[calc(100vh-20px)] md:min-h-[calc(100vh-32px)] flex items-center justify-center text-charcoal antialiased px-4">
        <div className="max-w-md w-full text-center bg-white border border-hairline rounded-xl p-10">
          <Wrench size={32} className="text-ink mb-4 inline-block" />
          <h1 className="font-sans font-bold text-2xl text-ink mb-3 tracking-tight">Your {roleLabel} portal is coming soon</h1>
          <p className="text-sm text-muted mb-8 leading-relaxed">
            We're still building the {roleLabel.toLowerCase()} experience for SkillBridge. You're signed in as{" "}
            <span className="text-charcoal">{user?.email}</span>, and we'll let you know as soon as your dashboard is ready.
          </p>
          <button
            onClick={handleLogout}
            className="w-full flex justify-center py-2.5 px-4 rounded-md text-sm text-white bg-ink hover:bg-ink-hover active:scale-[0.98] transition-all"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

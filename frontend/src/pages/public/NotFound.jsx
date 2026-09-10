import { Link } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";
import AmbientBrandGlow from "../../components/ui/ambient-brand-glow";

export default function NotFound() {
  return (
    <AmbientBrandGlow className="min-h-screen flex items-center justify-center text-charcoal antialiased px-4">
      <div className="max-w-sm w-full text-center">
        <p className="font-geist font-black text-6xl text-ink tracking-tight mb-4">404</p>
        <h1 className="font-geist text-xl text-ink tracking-tight mb-2">Page not found</h1>
        <p className="text-sm text-muted mb-8">The page you're looking for doesn't exist or may have moved.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-ink text-white text-sm font-medium rounded-md py-2.5 px-6 hover:bg-ink-hover active:scale-[0.98] transition-all"
        >
          <ArrowLeft size={16} />
          Back to SkillBridge
        </Link>
      </div>
    </AmbientBrandGlow>
  );
}

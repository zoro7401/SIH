import { Link } from "react-router-dom";
import { UserCircle, EnvelopeSimple, Bell } from "@phosphor-icons/react";
import Sidebar from "./Sidebar";
import MessagesBar from "../common/MessagesBar";
import AmbientBrandGlow from "../ui/ambient-brand-glow";
import { studentNavItems, studentFooterNavItems } from "../../config/studentNavConfig";

// Portfolio/Messages/Notifications moved out of the student sidebar and up
// here as a small top-right icon row instead — this only renders when
// navItems is the (default) student set, so Industry/Faculty/Admin pages
// (which always pass their own navItems) never see it.
// Same 115deg teal/purple/orange gradient as the SKILLBRIDGE wordmark on
// Landing/Login/Signup, so this pill reads as branded rather than a plain
// utility control.
const WORDMARK_GRADIENT = "linear-gradient(115deg, #4fadb0 0%, #7a6fe0 45%, #e4895c 85%)";

function TopRightLinks() {
  return (
    <div className="flex justify-end mb-6">
      <div className="inline-flex items-center gap-1.5 rounded-full p-1.5 shadow-lift" style={{ backgroundImage: WORDMARK_GRADIENT }}>
        <Link
          to="/portfolio"
          className="icon-btn flex items-center justify-center w-9 h-9 bg-white hover:bg-white"
          style={{ borderRadius: "9999px" }}
          aria-label="Portfolio"
          title="Portfolio"
        >
          <UserCircle size={18} weight="bold" color="#111111" />
        </Link>
        <Link
          to="/messages"
          className="icon-btn flex items-center justify-center w-9 h-9 bg-white hover:bg-white"
          style={{ borderRadius: "9999px" }}
          aria-label="Messages"
          title="Messages"
        >
          <EnvelopeSimple size={18} weight="bold" color="#111111" />
        </Link>
        <Link
          to="/notifications"
          className="icon-btn flex items-center justify-center w-9 h-9 bg-white hover:bg-white"
          style={{ borderRadius: "9999px" }}
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={18} weight="bold" color="#111111" />
        </Link>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
  navItems = studentNavItems,
  footerNavItems = studentFooterNavItems,
  title,
  subtitle,
  contentClassName = "",
  hideSidebar = false,
}) {
  // hideSidebar drops the nav, top-right icon row, and message bar entirely
  // rather than just visually hiding them — used for focused, single-task
  // screens like an in-progress skill test where navigating away mid-attempt
  // isn't wanted.
  const isStudentPortal = navItems === studentNavItems;

  return (
    <AmbientBrandGlow className="text-charcoal min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-ink focus:text-white focus:text-sm focus:font-medium focus:rounded-md focus:py-2.5 focus:px-4"
      >
        Skip to content
      </a>
      {!hideSidebar && <Sidebar navItems={navItems} footerNavItems={footerNavItems} title={title} subtitle={subtitle} />}
      <main id="main-content" className={hideSidebar ? "px-4 md:px-10 py-10" : "md:ml-56 px-4 md:px-10 py-10"}>
        <div className={`max-w-5xl mx-auto ${contentClassName}`}>
          {!hideSidebar && isStudentPortal && <TopRightLinks />}
          {children}
        </div>
      </main>
      {!hideSidebar && <MessagesBar />}
    </AmbientBrandGlow>
  );
}

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CertificationStatusBadge from "../../components/common/CertificationStatusBadge";
import { getPublicPortfolio } from "../../services/api";
import { WarningCircle, ArrowRight } from "@phosphor-icons/react";
import logo from "../../assets/logo.png";

// The real public share page behind /passport/:userId — replaces the old
// fake https://skillbridge.edu/passport/{...} link that pointed nowhere.
// Unauthenticated by design: this is what an employer clicks from a resume
// or application without needing a SkillBridge account.
export default function PublicPortfolio() {
  const { userId } = useParams();
  const [data, setData] = useState(undefined); // undefined = loading, null = not found/private, error string = other failure
  const [error, setError] = useState("");

  useEffect(() => {
    getPublicPortfolio(userId)
      .then(setData)
      .catch((err) => {
        setData(null);
        setError(err.status === 403 ? "This student has not made their portfolio public." : "Portfolio not found.");
      });
  }, [userId]);

  const NAV_SECTIONS = [
    { id: "projects", label: "Projects" },
    { id: "certifications", label: "Certifications" },
    { id: "internships", label: "Internships" },
    { id: "achievements", label: "Achievements" },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      {/* Nav */}
      <header className="border-b border-hairline bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="SkillBridge" className="h-7" />
            <span className="text-sm text-muted hidden sm:inline">Skill Passport</span>
          </div>

          {data && (
            <nav className="hidden md:flex items-center gap-7">
              {NAV_SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="text-sm text-charcoal hover:text-ink transition-colors"
                >
                  {section.label}
                </a>
              ))}
            </nav>
          )}

          <span className="border border-hairline rounded-full px-4 py-1.5 text-xs uppercase tracking-wide text-muted whitespace-nowrap">
            Verified passport
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6">
        {data === undefined && <p className="text-sm text-muted text-center py-20">Loading…</p>}

        {data === null && (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-24">
            <WarningCircle size={32} className="text-muted" />
            <p className="text-base font-medium text-ink">{error}</p>
          </div>
        )}

        {data && (
          <>
            {/* Hero */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center py-14 md:py-20">
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <span className="w-6 border-t border-pastel-blue-ink" />
                  <span className="text-xs uppercase tracking-wide text-pastel-blue-ink font-mono">
                    {data.basics?.headline || "student · skillbridge"}
                  </span>
                </div>
                <h1 className="font-geist font-bold text-4xl md:text-5xl text-ink tracking-tight leading-[1.05] mb-5">
                  {data.name} builds skills that ship.
                </h1>
                {data.basics?.bio && (
                  <p className="text-charcoal/80 text-base leading-relaxed max-w-md mb-4">{data.basics.bio}</p>
                )}
                {data.basics?.institution && <p className="text-sm text-muted mb-8">{data.basics.institution}</p>}

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="#projects"
                    className="flex items-center gap-2 bg-ink text-white text-sm font-medium rounded-md py-2.5 px-6 hover:bg-ink-hover active:scale-[0.98] transition-all"
                  >
                    View projects
                    <ArrowRight size={15} weight="bold" />
                  </a>
                  <a
                    href="#certifications"
                    className="border border-hairline text-sm font-medium text-ink rounded-md py-2.5 px-6 hover:bg-bone transition-colors"
                  >
                    Certifications
                  </a>
                </div>
              </div>

              {/* Faux-window profile card */}
              <div className="border border-hairline rounded-xl bg-white shadow-lift overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-hairline bg-bone">
                  <span className="text-xs font-mono text-muted">profile.json</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-hairline" />
                    <span className="w-2 h-2 rounded-full bg-hairline" />
                    <span className="w-2 h-2 rounded-full bg-hairline" />
                  </div>
                </div>
                <div className="p-8 flex flex-col items-center text-center">
                  {data.basics?.avatarUrl ? (
                    <img
                      className="w-28 h-28 rounded-full object-cover border border-hairline"
                      alt={data.name}
                      src={data.basics.avatarUrl}
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-pastel-blue flex items-center justify-center text-pastel-blue-ink text-2xl font-geist font-bold">
                      {data.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <p className="font-geist text-lg text-ink mt-4">{data.name}</p>
                  {data.basics?.headline && <p className="text-sm text-muted mt-0.5">{data.basics.headline}</p>}
                </div>
                <div className="flex items-center justify-between px-6 py-3 border-t border-hairline text-xs text-muted">
                  <span>{data.basics?.institution || "SkillBridge"}</span>
                  <span className="flex items-center gap-1.5 text-pastel-green-ink">
                    <span className="w-1.5 h-1.5 rounded-full bg-pastel-green-ink" />
                    verified
                  </span>
                </div>
              </div>
            </section>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-16">
              <div className="lg:col-span-1 flex flex-col gap-6">
                <section id="certifications" className="bg-white border border-hairline rounded-xl p-6 scroll-mt-24">
                  <h3 className="text-base font-medium text-ink mb-4 border-b border-hairline pb-3">Certifications</h3>
                  {data.certifications.length === 0 && <p className="text-sm text-muted">No certifications listed.</p>}
                  <ul className="flex flex-col gap-4">
                    {data.certifications.map((c) => (
                      <li key={c.id} className="border-b border-hairline pb-4 last:border-b-0 last:pb-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm text-ink">{c.title}</p>
                          <CertificationStatusBadge status={c.verificationStatus} />
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {c.issuer}
                          {c.date && ` • ${new Date(c.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                        </p>
                        {c.fileUrl && (
                          <a href={c.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-ink hover:underline mt-1 inline-block">
                            View certificate
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>

                <section id="achievements" className="bg-white border border-hairline rounded-xl p-6 scroll-mt-24">
                  <h3 className="text-base font-medium text-ink mb-4 border-b border-hairline pb-3">Achievements</h3>
                  {data.achievements.length === 0 && <p className="text-sm text-muted">No achievements listed.</p>}
                  <ul className="flex flex-col gap-3 list-disc list-inside text-sm text-charcoal">
                    {data.achievements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              </div>

              <div className="lg:col-span-2 flex flex-col gap-6">
                <section id="projects" className="scroll-mt-24">
                  <h3 className="text-base font-medium text-ink mb-4">Projects</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.projects.length === 0 && <p className="text-sm text-muted">No projects listed.</p>}
                    {data.projects.map((p) => (
                      <div key={p.id} className="bg-white border border-hairline rounded-xl p-5">
                        <h4 className="text-sm font-medium text-ink mb-1">{p.title}</h4>
                        <p className="text-sm text-muted mb-3 leading-relaxed">{p.description}</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {(p.skills ?? []).map((skill) => (
                            <span key={skill} className="bg-bone text-charcoal px-2 py-0.5 rounded text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section id="internships" className="bg-white border border-hairline rounded-xl p-6 scroll-mt-24">
                  <h3 className="text-base font-medium text-ink mb-4 border-b border-hairline pb-3">Internships</h3>
                  {data.internships.length === 0 && <p className="text-sm text-muted">No internships listed.</p>}
                  <ul className="flex flex-col gap-4">
                    {data.internships.map((i) => (
                      <li key={i.id} className="border-b border-hairline pb-4 last:border-b-0 last:pb-0">
                        <p className="text-sm text-ink">{i.role}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {i.company} • {i.period}
                        </p>
                        {i.note && <p className="text-xs text-charcoal mt-1.5">{i.note}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import SkillTrustBadge from "../../components/common/SkillTrustBadge";
import CertificationStatusBadge from "../../components/common/CertificationStatusBadge";
import SkillEvidencePanel from "../../components/common/SkillEvidencePanel";
import { useAuth } from "../../hooks/useAuth";
import { getSkillProfile } from "../../services/skillsService";
import { getPortfolio, getAssessmentResults } from "../../services/portfolioService";
import { X, SealCheck, DownloadSimple, UserCircle, ArrowRight, PencilSimple } from "@phosphor-icons/react";

export default function DigitalPortfolio() {
  const { user } = useAuth();
  const [skillProfile, setSkillProfile] = useState(undefined);
  const [portfolio, setPortfolio] = useState(undefined);
  const [assessments, setAssessments] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  useEffect(() => {
    getSkillProfile().then(setSkillProfile);
    getPortfolio().then(setPortfolio);
    getAssessmentResults().then(setAssessments);
  }, []);

  if (!skillProfile || !portfolio) {
    return (
      <DashboardLayout>
        <LoadingState fullScreen={false} label="Loading portfolio…" />
      </DashboardLayout>
    );
  }

  const displayedSkills = skillProfile.strongSkills.length > 0 ? skillProfile.strongSkills : skillProfile.profile.slice(0, 6);
  // Real, working share link — /passport/:userId (see PublicPortfolio.jsx),
  // generated from this deployment's actual origin instead of the old fake
  // https://skillbridge.edu domain. Respects the student's own Portfolio
  // Visibility setting server-side (Settings > Privacy) — a Private/
  // Institution-Only portfolio will decline to load for a visitor even
  // though the link itself always resolves.
  const shareUrl = `${window.location.origin}/passport/${user?.id ?? ""}`;

  return (
    <DashboardLayout>
      {/*Hero — headline/bio + actions on the left, faux-window profile
         card on the right, mirroring the public Skill Passport hero so a
         student's own dashboard and their shared link feel like one system.*/}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 border-t border-pastel-blue-ink" />
            <span className="text-xs uppercase tracking-wide text-pastel-blue-ink font-mono">
              {portfolio.headline || "your skill passport"}
            </span>
          </div>
          <h2 className="font-geist font-bold text-3xl md:text-4xl text-ink tracking-tight leading-[1.05] mb-4">
            {user?.name || "Student"} builds skills that ship.
          </h2>
          {portfolio.bio && <p className="text-charcoal/80 leading-relaxed max-w-md mb-6">{portfolio.bio}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShareModalOpen(true)}
              className="flex items-center gap-2 bg-ink text-white text-sm font-medium rounded-md py-2.5 px-6 hover:bg-ink-hover active:scale-[0.98] transition-all"
            >
              Share Portfolio
              <ArrowRight size={15} weight="bold" />
            </button>
            <Link
              to="/portfolio/edit"
              className="flex items-center gap-2 border border-hairline text-sm font-medium text-ink rounded-md py-2.5 px-6 hover:bg-bone transition-colors"
            >
              <PencilSimple size={15} />
              Edit Portfolio
            </Link>
            <Link to="/portfolio/manage" className="text-sm text-muted hover:text-ink transition-colors">
              Manage entries
            </Link>
          </div>
        </div>

        {/* Faux-window profile card */}
        <div className="w-[65%] mx-auto lg:mx-0 border border-hairline rounded-xl bg-white shadow-lift overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-hairline bg-bone">
            <span className="text-[13px] font-mono text-muted">profile</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-hairline" />
              <span className="w-1.5 h-1.5 rounded-full bg-hairline" />
              <span className="w-1.5 h-1.5 rounded-full bg-hairline" />
            </div>
          </div>
          <div className="p-5 flex flex-col items-center text-center">
            {portfolio.avatarUrl ? (
              <img
                className="w-[73px] h-[73px] rounded-full object-cover border border-hairline"
                alt={user?.name || "Student"}
                src={portfolio.avatarUrl}
              />
            ) : (
              <div className="w-[73px] h-[73px] rounded-full bg-bone border border-hairline flex items-center justify-center">
                <UserCircle size={31} className="text-muted" />
              </div>
            )}
            <p className="font-geist text-lg text-ink mt-2.5">{user?.name || "Student"}</p>
          </div>
          <div className="flex items-center justify-between px-4 py-2 border-t border-hairline text-[13px] text-muted">
            <span>{portfolio.institution || "SkillBridge"}</span>
            <span className="flex items-center gap-1.5 text-pastel-green-ink">
              <span className="w-1.5 h-1.5 rounded-full bg-pastel-green-ink" />
              verified
            </span>
          </div>
        </div>
      </section>

      {/*All sections stacked in a single column, each with its header
         set in a rounded-rectangle chip rather than an underline.*/}
      <div className="flex flex-col gap-6">
        {/*Verified Skills*/}
        <section className="bg-white border border-hairline rounded-xl p-6">
          <h3 className="inline-block text-sm font-semibold text-ink bg-bone border border-hairline rounded-lg px-4 py-1.5 mb-4">
            Skills &amp; Trust Levels
          </h3>
          <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
            {displayedSkills.map((skill, i) => (
              <button
                key={skill.name}
                onClick={() => setSelectedSkill(skill)}
                className={`flex justify-between items-center py-2 text-left hover:opacity-70 transition-opacity ${
                  i < displayedSkills.length - 1 ? "border-b border-hairline" : ""
                }`}
              >
                <span className="text-sm font-medium text-charcoal">{skill.name}</span>
                <SkillTrustBadge trustLevel={skill.trustLevel} />
              </button>
            ))}
          </div>
        </section>

        {/*Projects*/}
        <section className="bg-white border border-hairline rounded-xl p-6">
          <h3 className="inline-block text-sm font-semibold text-ink bg-bone border border-hairline rounded-lg px-4 py-1.5 mb-4">
            Projects
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[520px] overflow-y-auto pr-1">
            {portfolio.projects.map((project) => (
              <div key={project.id} className="border border-hairline rounded-xl p-5 hover:shadow-lift transition-shadow">
                <div className="flex justify-between items-start mb-1 gap-2">
                  <h4 className="text-sm font-medium text-ink">{project.title}</h4>
                  <SkillTrustBadge trustLevel={project.trustLevel} />
                </div>
                <p className="text-sm text-muted mb-3 leading-relaxed">{project.description}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {project.skills.map((skill) => (
                    <span key={skill} className="bg-bone text-charcoal px-2 py-0.5 rounded text-xs">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/*Certifications*/}
        <section className="bg-white border border-hairline rounded-xl p-6">
          <h3 className="inline-block text-sm font-semibold text-ink bg-bone border border-hairline rounded-lg px-4 py-1.5 mb-4">
            Certifications
          </h3>
          <ul className="flex flex-col gap-4 max-h-72 overflow-y-auto pr-1">
            {portfolio.certifications.length === 0 && <p className="text-sm text-muted">No certifications added yet.</p>}
            {portfolio.certifications.map((cert) => (
              <li key={cert.id} className="border-b border-hairline pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="text-sm text-ink">{cert.title}</p>
                  <CertificationStatusBadge status={cert.verificationStatus} />
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {cert.issuer}
                  {cert.date && ` • ${new Date(cert.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/*Assessment Results — the scores behind the verified badges*/}
        <section className="bg-white border border-hairline rounded-xl p-6">
          <h3 className="inline-block text-sm font-semibold text-ink bg-bone border border-hairline rounded-lg px-4 py-1.5 mb-4">
            Assessment Results
          </h3>
          {assessments.length === 0 ? (
            <p className="text-sm text-muted">
              No assessments passed yet.{" "}
              <Link to="/skill-tests" className="text-ink hover:underline">
                Take an assessment
              </Link>{" "}
              to add verified evidence here.
            </p>
          ) : (
            <ul className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
              {assessments.map((a) => (
                <li key={a.testId} className="flex items-center justify-between gap-3 border-b border-hairline pb-3 last:border-b-0 last:pb-0">
                  <span className="flex items-center gap-2 text-sm text-charcoal">
                    <SealCheck size={16} weight="fill" className="text-pastel-green-ink shrink-0" />
                    {a.title}
                  </span>
                  <span className="text-sm text-ink font-medium">{a.scorePercent}%</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/*Internships*/}
        <section className="bg-white border border-hairline rounded-xl p-6">
          <h3 className="inline-block text-sm font-semibold text-ink bg-bone border border-hairline rounded-lg px-4 py-1.5 mb-4">
            Internships
          </h3>
          <ul className="flex flex-col gap-4 max-h-64 overflow-y-auto pr-1">
            {portfolio.internships.length === 0 && <p className="text-sm text-muted">No internships added yet.</p>}
            {portfolio.internships.map((item) => (
              <li key={item.id} className="border-b border-hairline pb-4 last:border-b-0 last:pb-0">
                <p className="text-sm text-ink">{item.role}</p>
                <p className="text-xs text-muted mt-0.5">
                  {item.company} • {item.period}
                </p>
                {item.note && <p className="text-xs text-charcoal mt-1.5">{item.note}</p>}
              </li>
            ))}
          </ul>
        </section>

        {/*Achievements*/}
        <section className="bg-white border border-hairline rounded-xl p-6">
          <h3 className="inline-block text-sm font-semibold text-ink bg-bone border border-hairline rounded-lg px-4 py-1.5 mb-4">
            Achievements
          </h3>
          <ul className="flex flex-col gap-3 list-disc list-inside text-sm text-charcoal max-h-64 overflow-y-auto pr-1">
            {portfolio.achievements.length === 0 && <p className="text-sm text-muted list-none">No achievements added yet.</p>}
            {portfolio.achievements.map((item) => (
              <li key={item.id}>{item.description}</li>
            ))}
          </ul>
        </section>

        {/*Resume — generated from the portfolio itself rather than uploaded,
           so it can never drift out of sync with the verified evidence above.*/}
        <section className="bg-white border border-hairline rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="inline-block text-sm font-semibold text-ink bg-bone border border-hairline rounded-lg px-4 py-1.5 mb-2">
              Resume
            </h3>
            <p className="text-sm text-muted">
              Generated from your verified skills, projects, certifications and experience above.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 border border-hairline text-charcoal px-4 py-2 rounded-md text-sm hover:bg-bone transition-colors whitespace-nowrap"
          >
            <DownloadSimple size={16} />
            Download Resume
          </button>
        </section>
      </div>

      {selectedSkill && <SkillEvidencePanel skill={selectedSkill} portfolio={portfolio} onClose={() => setSelectedSkill(null)} />}

      {/*Share Modal*/}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-[#1A1A1A]/20 z-50 flex items-center justify-center p-4" onClick={() => setShareModalOpen(false)}>
          <div className="bg-white border border-hairline rounded-xl p-8 max-w-sm w-full relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShareModalOpen(false)} className="absolute top-4 right-4 text-muted hover:text-ink">
              <X size={18} />
            </button>
            <h3 className="text-lg font-medium text-ink mb-4 text-center">Share Skill Passport</h3>
            <div className="flex gap-2">
              <input
                className="flex-grow border border-hairline bg-white rounded-md px-3 py-2 text-sm text-charcoal focus:outline-none focus:border-ink"
                readOnly
                type="text"
                value={shareUrl}
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={() => navigator.clipboard?.writeText(shareUrl)}
                className="border border-hairline text-charcoal px-4 py-2 rounded-md text-sm hover:bg-bone transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

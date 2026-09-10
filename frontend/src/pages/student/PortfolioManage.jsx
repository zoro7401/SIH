import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import CertificationStatusBadge from "../../components/common/CertificationStatusBadge";
import {
  getPortfolio,
  addProject,
  editProject,
  removeProject,
  addCertification,
  editCertification,
  removeCertification,
  uploadCertificateFile,
  addInternship,
  editInternship,
  removeInternship,
  addAchievement,
  removeAchievement,
} from "../../services/portfolioService";
import { Plus, PencilSimple, Trash, X, UploadSimple, FilePdf } from "@phosphor-icons/react";

const inputClass =
  "w-full border border-hairline rounded-md px-3 py-2.5 bg-white focus:border-ink focus:ring-0 text-sm outline-none transition-colors";

function SectionCard({ title, description, children }) {
  return (
    <section className="bg-white border border-hairline rounded-xl p-6 md:p-8 mb-6">
      <div className="mb-5">
        <h3 className="text-base font-medium text-ink">{title}</h3>
        {description && <p className="text-sm text-muted mt-1">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function EntryRow({ onEdit, onDelete, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-hairline py-4 last:border-b-0 last:pb-0">
      <div className="flex-1 min-w-0">{children}</div>
      <div className="flex gap-1 flex-shrink-0">
        {onEdit && (
          <button onClick={onEdit} className="p-2 text-muted hover:text-ink transition-colors" title="Edit" aria-label="Edit">
            <PencilSimple size={16} />
          </button>
        )}
        <button onClick={onDelete} className="p-2 text-muted hover:text-pastel-red-ink transition-colors" title="Delete" aria-label="Delete">
          <Trash size={16} />
        </button>
      </div>
    </div>
  );
}

// --- Projects ------------------------------------------------------------

function ProjectForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? { title: "", description: "", skills: [] });
  const [skillsInput, setSkillsInput] = useState((initial?.skills ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError("Title is required.");
    setSaving(true);
    setError("");
    try {
      const skills = skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await onSave({ title: form.title, description: form.description, skills });
    } catch (err) {
      setError(err.message || "Could not save this project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-bone rounded-lg p-4 flex flex-col gap-3 mb-4">
      <input className={inputClass} placeholder="Project title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
      <textarea
        className={`${inputClass} min-h-[70px] resize-y`}
        placeholder="Description"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
      />
      <input
        className={inputClass}
        placeholder="Skills used, comma-separated (e.g. Python, React)"
        value={skillsInput}
        onChange={(e) => setSkillsInput(e.target.value)}
      />
      {error && <p className="text-xs text-pastel-red-ink">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-hairline rounded-md hover:bg-white transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-ink text-white rounded-md hover:bg-ink-hover transition-colors disabled:opacity-60">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function ProjectsSection({ projects, refresh }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  return (
    <SectionCard title="Projects" description="Real projects you've built — shown on your public portfolio.">
      {adding && (
        <ProjectForm
          onSave={async (fields) => {
            await addProject(fields);
            setAdding(false);
            refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      {projects.length === 0 && !adding && <p className="text-sm text-muted mb-4">No projects added yet.</p>}
      {projects.map((p) =>
        editingId === p.id ? (
          <ProjectForm
            key={p.id}
            initial={p}
            onSave={async (fields) => {
              await editProject(p.id, fields);
              setEditingId(null);
              refresh();
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <EntryRow key={p.id} onEdit={() => setEditingId(p.id)} onDelete={async () => { await removeProject(p.id); refresh(); }}>
            <p className="text-sm font-medium text-ink">{p.title}</p>
            <p className="text-sm text-muted mt-0.5">{p.description}</p>
            {p.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {p.skills.map((s) => (
                  <span key={s} className="bg-bone text-charcoal px-2 py-0.5 rounded text-xs">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </EntryRow>
        )
      )}
      {!adding && (
        <button onClick={() => setAdding(true)} className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink hover:underline">
          <Plus size={16} /> Add Project
        </button>
      )}
    </SectionCard>
  );
}

// --- Certifications --------------------------------------------------------

function CertificationForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? { title: "", issuer: "", date: "", relatedSkill: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError("Title is required.");
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || "Could not save this certification.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-bone rounded-lg p-4 flex flex-col gap-3 mb-4">
      <input className={inputClass} placeholder="Certification title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
      <div className="grid grid-cols-2 gap-3">
        <input className={inputClass} placeholder="Issuer (e.g. AWS)" value={form.issuer} onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))} />
        <input className={inputClass} type="month" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
      </div>
      <input
        className={inputClass}
        placeholder="Related skill (optional)"
        value={form.relatedSkill}
        onChange={(e) => setForm((f) => ({ ...f, relatedSkill: e.target.value }))}
      />
      {error && <p className="text-xs text-pastel-red-ink">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-hairline rounded-md hover:bg-white transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-ink text-white rounded-md hover:bg-ink-hover transition-colors disabled:opacity-60">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function CertificationsSection({ certifications, refresh }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadError, setUploadError] = useState("");

  const handleFileChange = async (id, e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingId(id);
    setUploadError("");
    try {
      await uploadCertificateFile(id, file);
      refresh();
    } catch (err) {
      setUploadError(err.message || "Could not upload this file.");
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <SectionCard
      title="Certifications"
      description="Attach a certificate file (PDF or image) to send it for admin review — an approved certification shows a Verified badge to employers."
    >
      {adding && (
        <CertificationForm
          onSave={async (fields) => {
            await addCertification(fields);
            setAdding(false);
            refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      {uploadError && <p className="text-xs text-pastel-red-ink mb-3">{uploadError}</p>}
      {certifications.length === 0 && !adding && <p className="text-sm text-muted mb-4">No certifications added yet.</p>}
      {certifications.map((c) =>
        editingId === c.id ? (
          <CertificationForm
            key={c.id}
            initial={c}
            onSave={async (fields) => {
              await editCertification(c.id, fields);
              setEditingId(null);
              refresh();
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <EntryRow key={c.id} onEdit={() => setEditingId(c.id)} onDelete={async () => { await removeCertification(c.id); refresh(); }}>
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className="text-sm font-medium text-ink">{c.title}</p>
              <CertificationStatusBadge status={c.verificationStatus} />
            </div>
            <p className="text-xs text-muted">
              {c.issuer}
              {c.date && ` • ${new Date(c.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
            </p>
            <div className="mt-2 flex items-center gap-3">
              {c.fileUrl ? (
                <a
                  href={c.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-ink hover:underline"
                >
                  <FilePdf size={14} /> {c.fileName || "View file"}
                </a>
              ) : (
                <label className="inline-flex items-center gap-1.5 text-xs text-ink hover:underline cursor-pointer">
                  <UploadSimple size={14} />
                  {uploadingId === c.id ? "Uploading…" : "Attach certificate file"}
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    disabled={uploadingId === c.id}
                    onChange={(e) => handleFileChange(c.id, e)}
                  />
                </label>
              )}
            </div>
          </EntryRow>
        )
      )}
      {!adding && (
        <button onClick={() => setAdding(true)} className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink hover:underline">
          <Plus size={16} /> Add Certification
        </button>
      )}
    </SectionCard>
  );
}

// --- Internships -----------------------------------------------------------

function InternshipForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? { role: "", company: "", period: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.role.trim()) return setError("Role is required.");
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || "Could not save this internship.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-bone rounded-lg p-4 flex flex-col gap-3 mb-4">
      <input className={inputClass} placeholder="Role (e.g. Software Engineering Intern)" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
      <div className="grid grid-cols-2 gap-3">
        <input className={inputClass} placeholder="Company" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
        <input className={inputClass} placeholder="Period (e.g. Summer 2026)" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} />
      </div>
      <textarea
        className={`${inputClass} min-h-[60px] resize-y`}
        placeholder="What did you work on? (optional)"
        value={form.note}
        onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
      />
      {error && <p className="text-xs text-pastel-red-ink">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-hairline rounded-md hover:bg-white transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-ink text-white rounded-md hover:bg-ink-hover transition-colors disabled:opacity-60">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function InternshipsSection({ internships, refresh }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  return (
    <SectionCard title="Internships" description="Prior internships or work experience.">
      {adding && (
        <InternshipForm
          onSave={async (fields) => {
            await addInternship(fields);
            setAdding(false);
            refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      {internships.length === 0 && !adding && <p className="text-sm text-muted mb-4">No internships added yet.</p>}
      {internships.map((i) =>
        editingId === i.id ? (
          <InternshipForm
            key={i.id}
            initial={i}
            onSave={async (fields) => {
              await editInternship(i.id, fields);
              setEditingId(null);
              refresh();
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <EntryRow key={i.id} onEdit={() => setEditingId(i.id)} onDelete={async () => { await removeInternship(i.id); refresh(); }}>
            <p className="text-sm font-medium text-ink">{i.role}</p>
            <p className="text-xs text-muted mt-0.5">
              {i.company} • {i.period}
            </p>
            {i.note && <p className="text-sm text-charcoal mt-1.5">{i.note}</p>}
          </EntryRow>
        )
      )}
      {!adding && (
        <button onClick={() => setAdding(true)} className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink hover:underline">
          <Plus size={16} /> Add Internship
        </button>
      )}
    </SectionCard>
  );
}

// --- Achievements ------------------------------------------------------------

function AchievementsSection({ achievements, refresh }) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSaving(true);
    setError("");
    try {
      await addAchievement(draft.trim());
      setDraft("");
      refresh();
    } catch (err) {
      setError(err.message || "Could not add this achievement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Achievements" description="Awards, honors, or notable recognitions.">
      {achievements.length === 0 && <p className="text-sm text-muted mb-4">No achievements added yet.</p>}
      {achievements.map((a) => (
        <div key={a.id} className="flex items-center justify-between gap-3 border-b border-hairline py-3 last:border-b-0">
          <p className="text-sm text-charcoal">{a.description}</p>
          <button
            onClick={async () => {
              await removeAchievement(a.id);
              refresh();
            }}
            className="p-1.5 text-muted hover:text-pastel-red-ink transition-colors flex-shrink-0"
            aria-label="Delete"
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <form onSubmit={handleAdd} className="flex gap-2 mt-4">
        <input
          className={inputClass}
          placeholder="e.g. 1st Place — University Hackathon 2026"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="submit"
          disabled={saving || !draft.trim()}
          className="shrink-0 px-4 py-2 border border-hairline rounded-md text-charcoal hover:bg-bone transition-colors flex items-center gap-1.5 text-sm disabled:opacity-60"
        >
          <Plus size={16} />
          Add
        </button>
      </form>
      {error && <p className="text-xs text-pastel-red-ink mt-2">{error}</p>}
    </SectionCard>
  );
}

export default function PortfolioManage() {
  const [portfolio, setPortfolio] = useState(undefined);

  const refresh = () => getPortfolio().then(setPortfolio);

  useEffect(() => {
    refresh();
  }, []);

  if (!portfolio) {
    return (
      <DashboardLayout>
        <LoadingState fullScreen={false} label="Loading portfolio…" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="font-geist text-3xl text-ink tracking-tight">Manage Portfolio</h2>
          <p className="text-muted mt-2">Add, edit, or remove your projects, certifications, internships, and achievements.</p>
        </div>
        <Link to="/portfolio" className="py-2 px-6 border border-hairline rounded-md text-charcoal text-sm hover:bg-bone transition-colors">
          Back to Portfolio
        </Link>
      </div>

      <ProjectsSection projects={portfolio.projects ?? []} refresh={refresh} />
      <CertificationsSection certifications={portfolio.certifications ?? []} refresh={refresh} />
      <InternshipsSection internships={portfolio.internships ?? []} refresh={refresh} />
      <AchievementsSection achievements={portfolio.achievements ?? []} refresh={refresh} />
    </DashboardLayout>
  );
}

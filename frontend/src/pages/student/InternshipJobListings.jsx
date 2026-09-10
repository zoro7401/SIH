import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import ExpandableFilterList from "../../components/common/ExpandableFilterList";
import { getInternshipsWithMatch } from "../../services/matchService";
import { getSavedOpportunityIds, saveOpportunity, unsaveOpportunity } from "../../services/savedOpportunitiesService";
import { parseLocation, WORK_MODES } from "../../utils/locationUtils";
import { OPPORTUNITY_SKILLS, OPPORTUNITY_CITIES } from "../../constants/opportunityFilters";
import { Briefcase, Check, Circle, MapPin, BookmarkSimple } from "@phosphor-icons/react";

const SKILL_FILTERS = OPPORTUNITY_SKILLS;
// "Remote" is always shown first, ahead of the curated Indian city list.
const LOCATION_FILTERS = ["Remote", ...OPPORTUNITY_CITIES];
const TYPE_FILTERS = ["Full-time", "Internship"];

function toggle(set, value) {
  const next = new Set(set);
  next.has(value) ? next.delete(value) : next.add(value);
  return next;
}

export default function InternshipJobListings() {
  const [jobs, setJobs] = useState(undefined);
  const [savedIds, setSavedIds] = useState(new Set());
  const [savingId, setSavingId] = useState(null);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [skillFilters, setSkillFilters] = useState(new Set());
  const [cityFilters, setCityFilters] = useState(new Set());
  const [modeFilters, setModeFilters] = useState(new Set());
  const [typeFilters, setTypeFilters] = useState(new Set(TYPE_FILTERS));

  useEffect(() => {
    getInternshipsWithMatch().then(setJobs);
    getSavedOpportunityIds().then((ids) => setSavedIds(new Set(ids)));
  }, []);

  const handleToggleSave = async (e, jobId) => {
    e.preventDefault();
    e.stopPropagation();
    setSavingId(jobId);
    try {
      if (savedIds.has(jobId)) {
        await unsaveOpportunity(jobId);
        setSavedIds((prev) => toggle(prev, jobId));
      } else {
        await saveOpportunity(jobId);
        setSavedIds((prev) => toggle(prev, jobId));
      }
    } finally {
      setSavingId(null);
    }
  };

  const filteredJobs = useMemo(() => {
    if (!jobs) return jobs;
    return jobs.filter((job) => {
      const { city, mode } = parseLocation(job.location);
      const matchesSkill = skillFilters.size === 0 || job.skills.some((s) => skillFilters.has(s));
      const matchesCity = cityFilters.size === 0 || cityFilters.has(city) || (cityFilters.has("Remote") && city === "Remote");
      const matchesMode = modeFilters.size === 0 || modeFilters.has(mode);
      const matchesType = typeFilters.size === 0 || typeFilters.has(job.type);
      const matchesSaved = !showSavedOnly || savedIds.has(job.id);
      return matchesSkill && matchesCity && matchesMode && matchesType && matchesSaved;
    });
  }, [jobs, skillFilters, cityFilters, modeFilters, typeFilters, showSavedOnly, savedIds]);

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row gap-6">
        {/*Filter Sidebar (Left)*/}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white border border-hairline rounded-xl p-5 md:sticky md:top-10">
            <h2 className="text-sm font-medium text-ink mb-4">Filters</h2>
            <div className="mb-6 border-b border-hairline pb-4">
              <h3 className="text-xs uppercase tracking-wide text-muted mb-2">Skills</h3>
              <ExpandableFilterList
                options={SKILL_FILTERS}
                renderOption={(skill) => (
                  <label key={skill} className="flex items-center gap-2 cursor-pointer">
                    <input
                      className="rounded border-hairline text-ink focus:ring-ink h-4 w-4"
                      type="checkbox"
                      checked={skillFilters.has(skill)}
                      onChange={() => setSkillFilters((prev) => toggle(prev, skill))}
                    />
                    <span className="text-sm text-charcoal">{skill}</span>
                  </label>
                )}
              />
            </div>
            <div className="mb-6 border-b border-hairline pb-4">
              <h3 className="text-xs uppercase tracking-wide text-muted mb-2">Work Mode</h3>
              <div className="space-y-2">
                {WORK_MODES.map((mode) => (
                  <label key={mode} className="flex items-center gap-2 cursor-pointer">
                    <input
                      className="rounded border-hairline text-ink focus:ring-ink h-4 w-4"
                      type="checkbox"
                      checked={modeFilters.has(mode)}
                      onChange={() => setModeFilters((prev) => toggle(prev, mode))}
                    />
                    <span className="text-sm text-charcoal">{mode}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-6 border-b border-hairline pb-4">
              <h3 className="text-xs uppercase tracking-wide text-muted mb-2">Location</h3>
              <ExpandableFilterList
                options={LOCATION_FILTERS}
                renderOption={(city) => (
                  <label key={city} className="flex items-center gap-2 cursor-pointer">
                    <input
                      className="rounded border-hairline text-ink focus:ring-ink h-4 w-4"
                      type="checkbox"
                      checked={cityFilters.has(city)}
                      onChange={() => setCityFilters((prev) => toggle(prev, city))}
                    />
                    <span className="text-sm text-charcoal">{city}</span>
                  </label>
                )}
              />
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wide text-muted mb-2">Type</h3>
              <div className="space-y-2">
                {TYPE_FILTERS.map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      className="rounded border-hairline text-ink focus:ring-ink h-4 w-4"
                      type="checkbox"
                      checked={typeFilters.has(type)}
                      onChange={() => setTypeFilters((prev) => toggle(prev, type))}
                    />
                    <span className="text-sm text-charcoal">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/*Opportunities List (Right)*/}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-1 bg-bone rounded-lg p-1">
              <button
                onClick={() => setShowSavedOnly(false)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${!showSavedOnly ? "bg-white text-ink shadow-sm" : "text-muted"}`}
              >
                All Opportunities
              </button>
              <button
                onClick={() => setShowSavedOnly(true)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${showSavedOnly ? "bg-white text-ink shadow-sm" : "text-muted"}`}
              >
                Saved ({savedIds.size})
              </button>
            </div>
            {filteredJobs && <span className="text-sm text-muted">Showing {filteredJobs.length} results</span>}
          </div>

          {jobs === undefined && <LoadingState label="Loading opportunities…" />}

          {filteredJobs && filteredJobs.length === 0 && showSavedOnly && (
            <EmptyState icon={BookmarkSimple} title="No saved opportunities yet" description="Bookmark opportunities you're interested in to find them here later." />
          )}

          {filteredJobs && filteredJobs.length === 0 && !showSavedOnly && jobs.length === 0 && (
            <EmptyState
              icon={Briefcase}
              title="No opportunities posted yet"
              description="Check back soon — new opportunities from industry partners will appear here as they're posted."
            />
          )}

          {filteredJobs && filteredJobs.length === 0 && !showSavedOnly && jobs.length > 0 && (
            <EmptyState icon={Briefcase} title="No opportunities match your filters" description="Try clearing a filter to see more results." />
          )}

          {filteredJobs && filteredJobs.length > 0 && (
            <div className="space-y-3">
              {filteredJobs.map((job) => {
                const { city, mode } = parseLocation(job.location);
                return (
                <Link
                  key={job.id}
                  to={`/internships/${job.id}`}
                  className="bg-white border border-hairline rounded-xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center hover:shadow-lift transition-shadow cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base font-medium text-ink">{job.title}</h3>
                      <span className="bg-bone px-2 py-0.5 rounded text-xs text-charcoal">{job.type}</span>
                      {mode && (
                        <span className="inline-flex items-center gap-1 bg-pastel-blue text-pastel-blue-ink px-2 py-0.5 rounded text-xs">
                          {mode}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted mb-3 flex items-center gap-1 flex-wrap">
                      <span>{job.company}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={13} />
                        {city}
                      </span>
                      {job.duration && (
                        <>
                          <span>•</span>
                          <span>{job.duration}</span>
                        </>
                      )}
                      {job.stipend && (
                        <>
                          <span>•</span>
                          <span>{job.stipend}</span>
                        </>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {job.match.matchedSkills.map((skill) => (
                        <span
                          key={skill.name}
                          className="inline-flex items-center gap-1 bg-pastel-green text-pastel-green-ink px-2 py-0.5 rounded text-xs"
                        >
                          <Check size={11} weight="bold" />
                          {skill.name}
                        </span>
                      ))}
                      {job.match.missingSkills.map((skill) => (
                        <span
                          key={skill.name}
                          className="inline-flex items-center gap-1 bg-bone text-muted px-2 py-0.5 rounded text-xs"
                        >
                          <Circle size={11} />
                          {skill.name}
                        </span>
                      ))}
                    </div>
                    {job.match.missingSkills.length > 0 && (
                      <p className="text-xs text-muted">
                        Missing {job.match.missingSkills.length} of {job.skills.length} required skills
                      </p>
                    )}
                  </div>
                  <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4 border-t md:border-t-0 border-hairline pt-4 md:pt-0 mt-4 md:mt-0">
                    <div className="text-right">
                      <span className="block font-editorial text-2xl text-ink tracking-tight">{job.match.overallScore}%</span>
                      <span className="text-xs text-muted">Match</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleToggleSave(e, job.id)}
                        disabled={savingId === job.id}
                        title={savedIds.has(job.id) ? "Remove from saved" : "Save for later"}
                        className="p-2 border border-hairline rounded-md text-charcoal hover:bg-bone transition-colors disabled:opacity-60"
                      >
                        <BookmarkSimple size={16} weight={savedIds.has(job.id) ? "fill" : "regular"} />
                      </button>
                      <span className="bg-ink text-white px-4 py-2 rounded-md text-sm hover:bg-ink-hover transition-colors">View Details</span>
                    </div>
                  </div>
                </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

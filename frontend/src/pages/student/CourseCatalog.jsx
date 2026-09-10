import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { getCourses } from "../../services/coursesService";
import { enrollInCourse, isEnrolled } from "../../services/enrollmentsService";
import { MagnifyingGlass, Bank, Clock, ChartBar, GraduationCap } from "@phosphor-icons/react";

const CATEGORY_OPTIONS = ["Data Science", "Material Engineering", "Quantum Computing", "Bioinformatics"];
const CATEGORY_KEYWORDS = {
  "Data Science": ["Data Science"],
  "Material Engineering": ["Material Eng", "Materials Science"],
  "Quantum Computing": ["Quantum Computing"],
  Bioinformatics: ["Bioinformatics"],
};

const DURATION_OPTIONS = ["Short (< 4 weeks)", "Medium (4-8 weeks)", "Extensive (8+ weeks)"];
function durationBucket(durationStr) {
  const weeks = parseInt(durationStr, 10);
  if (Number.isNaN(weeks)) return null;
  if (weeks < 4) return "Short (< 4 weeks)";
  if (weeks <= 8) return "Medium (4-8 weeks)";
  return "Extensive (8+ weeks)";
}

const PROVIDER_OPTIONS = ["Zurich Institute of Technology", "Global Research Consortium", "TechCorp Academy"];

const DEFAULT_FILTERS = {
  category: new Set(),
  duration: new Set(),
  provider: new Set(),
};

function FilterGroup({ title, options, checked, onToggle }) {
  return (
    <div className="mb-6 last:mb-0">
      <h4 className="text-xs uppercase tracking-wide text-muted mb-2">{title}</h4>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 cursor-pointer">
            <input
              checked={checked.has(option)}
              onChange={() => onToggle(option)}
              className="rounded border-hairline text-ink focus:ring-0"
              type="checkbox"
            />
            <span className="text-sm text-charcoal">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function CourseCatalog() {
  const [courses, setCourses] = useState(undefined);
  const [search, setSearch] = useState("");
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [enrollingId, setEnrollingId] = useState(null);
  const [pendingFilters, setPendingFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);

  useEffect(() => {
    getCourses().then(async (list) => {
      setCourses(list);
      const flags = await Promise.all(list.map((c) => isEnrolled(c.id)));
      setEnrolledIds(new Set(list.filter((_, i) => flags[i]).map((c) => c.id)));
    });
  }, []);

  const handleEnroll = async (courseId) => {
    setEnrollingId(courseId);
    try {
      await enrollInCourse(courseId);
      setEnrolledIds((prev) => new Set(prev).add(courseId));
    } finally {
      setEnrollingId(null);
    }
  };

  const toggle = (group, value) => {
    setPendingFilters((prev) => {
      const next = new Set(prev[group]);
      next.has(value) ? next.delete(value) : next.add(value);
      return { ...prev, [group]: next };
    });
  };

  const hasPendingChanges =
    [...pendingFilters.category].sort().join() !== [...appliedFilters.category].sort().join() ||
    [...pendingFilters.duration].sort().join() !== [...appliedFilters.duration].sort().join() ||
    [...pendingFilters.provider].sort().join() !== [...appliedFilters.provider].sort().join();

  const filteredCourses = useMemo(() => {
    if (!courses) return undefined;
    const q = search.trim().toLowerCase();
    return courses.filter((course) => {
      const searchOk =
        !q ||
        course.title.toLowerCase().includes(q) ||
        course.provider.toLowerCase().includes(q) ||
        course.tags.some((t) => t.toLowerCase().includes(q));
      const categoryOk =
        appliedFilters.category.size === 0 ||
        [...appliedFilters.category].some((cat) => CATEGORY_KEYWORDS[cat].some((keyword) => course.tags.includes(keyword)));
      const durationOk = appliedFilters.duration.size === 0 || appliedFilters.duration.has(durationBucket(course.duration));
      const providerOk = appliedFilters.provider.size === 0 || appliedFilters.provider.has(course.provider);
      return searchOk && categoryOk && durationOk && providerOk;
    });
  }, [courses, search, appliedFilters]);

  return (
    <DashboardLayout>
      {/*Header*/}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-hairline pb-6">
        <div>
          <h2 className="font-geist text-3xl text-ink tracking-tight mb-2">Course Catalog</h2>
          <p className="text-muted max-w-2xl leading-relaxed">
            Discover curated learning paths and advanced modules provided by leading institutional partners.
          </p>
        </div>
        <div className="relative">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="pl-9 pr-4 py-2 border border-hairline rounded-md bg-white text-sm text-charcoal focus:border-ink focus:ring-0 outline-none w-64 transition-colors"
            placeholder="Search courses..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {/*Filters + Course List*/}
      <div className="flex flex-col md:flex-row gap-6">
        {/*Left Filter Sidebar*/}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white border border-hairline rounded-xl p-5">
            <h3 className="text-sm font-medium text-ink mb-4 border-b border-hairline pb-3">Filters</h3>

            <FilterGroup
              title="Skill Category"
              options={CATEGORY_OPTIONS}
              checked={pendingFilters.category}
              onToggle={(v) => toggle("category", v)}
            />
            <FilterGroup
              title="Duration"
              options={DURATION_OPTIONS}
              checked={pendingFilters.duration}
              onToggle={(v) => toggle("duration", v)}
            />
            <FilterGroup
              title="Provider"
              options={PROVIDER_OPTIONS}
              checked={pendingFilters.provider}
              onToggle={(v) => toggle("provider", v)}
            />

            <button
              onClick={() => setAppliedFilters(pendingFilters)}
              disabled={!hasPendingChanges}
              className="w-full mt-6 bg-ink text-white text-sm py-2.5 rounded-md hover:bg-ink-hover active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              Apply
            </button>
          </div>
        </aside>

        {/*Course List Area*/}
        <section className="flex-1 flex flex-col gap-4">
          {filteredCourses && (
            <div className="flex justify-between items-center bg-white border border-hairline rounded-xl px-4 py-3">
              <span className="text-sm text-muted">Showing {filteredCourses.length} results</span>
            </div>
          )}

          {courses === undefined && <LoadingState label="Loading courses…" />}

          {filteredCourses && filteredCourses.length === 0 && (
            <EmptyState icon={GraduationCap} title="No courses match your search" description="Try a different keyword or adjust your filters." />
          )}

          {filteredCourses && filteredCourses.length > 0 && (
            <div className="bg-white border border-hairline rounded-xl flex flex-col">
              {filteredCourses.map((course) => {
                const enrolled = enrolledIds.has(course.id);
                return (
                  <div
                    key={course.id}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 border-b border-hairline last:border-b-0 hover:bg-bone transition-colors"
                  >
                    <div className="flex-1 mb-3 md:mb-0">
                      <h3 className="text-base font-medium text-ink mb-1.5">{course.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted mb-2">
                        <span className="flex items-center gap-1.5">
                          <Bank size={14} /> {course.provider}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} /> {course.duration}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <ChartBar size={14} /> {course.level}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {course.tags.map((tag) => (
                          <span key={tag} className="bg-bone px-2 py-0.5 rounded text-xs text-charcoal">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-3">
                      <Link to={`/courses/${course.id}`} className="text-ink text-sm hover:underline">
                        View Details
                      </Link>
                      <button
                        onClick={() => handleEnroll(course.id)}
                        disabled={enrolled || enrollingId === course.id}
                        className="bg-ink text-white px-4 py-2 rounded-md text-sm hover:bg-ink-hover active:scale-[0.98] transition-all disabled:opacity-60"
                      >
                        {enrolled ? "Enrolled ✓" : enrollingId === course.id ? "Enrolling…" : "Enroll"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

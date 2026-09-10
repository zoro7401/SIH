import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { getCourseById } from "../../services/coursesService";
import { enrollInCourse, isEnrolled } from "../../services/enrollmentsService";
import { ArrowLeft, CaretRight, Clock, GraduationCap, Buildings, MagnifyingGlass, CheckCircle, DownloadSimple } from "@phosphor-icons/react";

export default function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(undefined); // undefined = loading, null = not found
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    let active = true;
    setCourse(undefined);
    getCourseById(courseId).then((data) => {
      if (active) setCourse(data);
    });
    isEnrolled(courseId).then((value) => {
      if (active) setEnrolled(value);
    });
    return () => {
      active = false;
    };
  }, [courseId]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await enrollInCourse(courseId);
      setEnrolled(true);
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <DashboardLayout>
      {course === undefined && <LoadingState label="Loading course…" />}

      {course === null && (
        <EmptyState
          icon={MagnifyingGlass}
          title="Course not found"
          description="This course may have been removed, or the link you followed is incorrect."
          actionLabel="Back to Catalog"
          onAction={() => navigate("/courses")}
        />
      )}

      {course && (
        <>
          {/*Breadcrumb / Back*/}
          <div className="mb-6 flex items-center gap-2 text-sm text-muted">
            <ArrowLeft size={16} className="cursor-pointer hover:text-ink transition-colors" onClick={() => navigate("/courses")} />
            <span className="cursor-pointer hover:text-ink transition-colors" onClick={() => navigate("/courses")}>
              Course Catalog
            </span>
            <CaretRight size={12} />
            <span className="text-ink font-medium">{course.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/*Main Content Area*/}
            <div className="lg:col-span-8 flex flex-col gap-8">
              {/*Header / Title block*/}
              <header className="border-b border-hairline pb-8">
                <div className="flex items-center gap-3 mb-4">
                  {course.category && (
                    <span className="bg-bone px-2.5 py-1 rounded-full text-xs uppercase tracking-wide text-charcoal">{course.category}</span>
                  )}
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <Clock size={14} /> {course.duration}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <GraduationCap size={14} /> {course.level}
                  </span>
                </div>
                <h1 className="font-geist text-3xl text-ink tracking-tight mb-3">{course.title}</h1>
                <p className="text-muted flex items-center gap-2">
                  <Buildings size={18} className="text-ink" />
                  Provided by {course.department ? `${course.department}, ` : ""}
                  {course.provider}
                </p>
              </header>

              {/*Description*/}
              {course.overview && (
                <section>
                  <h2 className="text-lg font-medium text-ink mb-3">Course Overview</h2>
                  <div className="text-charcoal leading-relaxed flex flex-col gap-4">
                    {course.overview.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              )}

              {/*Skills*/}
              {course.skillsAcquired && (
                <section>
                  <h2 className="text-lg font-medium text-ink mb-3">Skills &amp; Competencies Acquired</h2>
                  <div className="flex flex-wrap gap-2">
                    {course.skillsAcquired.map((skill) => (
                      <span key={skill} className="px-3 py-1.5 rounded-md bg-bone text-sm text-charcoal">
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/*Syllabus*/}
              {course.syllabus && (
                <section className="border border-hairline rounded-xl bg-white p-8">
                  <h2 className="text-lg font-medium text-ink mb-6 border-b border-hairline pb-3">Syllabus Overview</h2>
                  <ol className="flex flex-col">
                    {course.syllabus.map((item, i) => (
                      <li key={i} className="flex gap-4 py-4 border-b border-hairline last:border-0 last:pb-0 first:pt-0">
                        <div className="font-mono text-sm text-muted min-w-[24px]">{String(i + 1).padStart(2, "0")}</div>
                        <div>
                          <h3 className="text-sm font-medium text-ink mb-1">{item.title}</h3>
                          <p className="text-sm text-muted leading-relaxed">{item.description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>

            {/*Sticky Sidebar / Action Area*/}
            <div className="lg:col-span-4">
              <div className="sticky top-10 flex flex-col gap-3 border border-hairline bg-white p-6 rounded-xl">
                <div className="mb-2">
                  <div className="text-sm font-medium text-ink mb-1">{course.enrollmentStatus || "Enrollment Open"}</div>
                  {course.cohortStart && <div className="text-xs text-muted">Cohort begins {course.cohortStart}</div>}
                </div>
                <button
                  onClick={handleEnroll}
                  disabled={enrolled || enrolling}
                  className="w-full bg-ink text-white text-sm py-2.5 px-4 rounded-md flex justify-center items-center gap-2 hover:bg-ink-hover active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  <CheckCircle size={16} />
                  {enrolled ? "Enrolled ✓" : enrolling ? "Enrolling…" : "Enroll in Course"}
                </button>
                <button className="w-full text-ink text-sm py-2.5 px-4 rounded-md border border-hairline flex justify-center items-center gap-2 hover:bg-bone transition-colors">
                  <DownloadSimple size={16} />
                  Download Syllabus PDF
                </button>
                {(course.format || course.commitment || course.prerequisites) && (
                  <div className="mt-4 pt-4 border-t border-hairline flex flex-col gap-2">
                    {course.format && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted">Format</span>
                        <span className="text-charcoal">{course.format}</span>
                      </div>
                    )}
                    {course.commitment && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted">Commitment</span>
                        <span className="text-charcoal">{course.commitment}</span>
                      </div>
                    )}
                    {course.prerequisites && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted">Prerequisites</span>
                        <span className="text-charcoal">{course.prerequisites}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

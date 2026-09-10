import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import SkillCard from "../../components/common/SkillCard";
import { getSkillProfile } from "../../services/skillsService";

const CATEGORY_ORDER = ["Technical", "Soft Skills"];

export default function MySkills() {
  const [data, setData] = useState(undefined);

  useEffect(() => {
    getSkillProfile().then(setData);
  }, []);

  if (!data) {
    return (
      <DashboardLayout>
        <LoadingState label="Loading your skills…" />
      </DashboardLayout>
    );
  }

  const { profile } = data;
  const byCategory = CATEGORY_ORDER.map((category) => ({
    category,
    skills: profile.filter((s) => s.category === category).sort((a, b) => b.currentScore - a.currentScore),
  })).filter((group) => group.skills.length > 0);

  return (
    <DashboardLayout>
      <header className="mb-8 border-b border-hairline pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-geist text-3xl text-ink tracking-tight mb-1">My Skills</h1>
          <p className="text-muted">Every skill you've self-rated or verified through an assessment.</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/skill-tests"
            className="border border-hairline text-ink text-sm px-4 py-2 rounded-md hover:bg-bone transition-colors"
          >
            Take an Assessment
          </Link>
          <Link
            to="/skill-gap"
            className="bg-ink text-white text-sm px-4 py-2 rounded-md hover:bg-ink-hover active:scale-[0.98] transition-all"
          >
            View Skill Gap
          </Link>
        </div>
      </header>

      {byCategory.map((group) => (
        <section key={group.category} className="mb-10">
          <h2 className="text-xs uppercase tracking-wide text-muted mb-4">{group.category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.skills.map((skill) => (
              <SkillCard
                key={skill.name}
                name={skill.name}
                category={skill.category}
                currentScore={skill.currentScore}
                trustLevel={skill.trustLevel}
              />
            ))}
          </div>
        </section>
      ))}
    </DashboardLayout>
  );
}

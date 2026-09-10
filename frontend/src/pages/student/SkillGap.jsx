import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import LoadingState from "../../components/common/LoadingState";
import { CheckCircle, Circle } from "@phosphor-icons/react";
import { getCareerRoles, getTargetRoleId, getTargetRoleIdAsync, setTargetRoleId, getRoleReadiness } from "../../services/careerRoleService";

export default function SkillGap() {
  const [roles, setRoles] = useState(undefined);
  // Sync value first (local cache/default) so the select renders immediately;
  // getTargetRoleIdAsync() below then reconciles it with the real backend
  // value once that loads, so a different device shows the right selection.
  const [selectedRoleId, setSelectedRoleId] = useState(getTargetRoleId());

  const [readiness, setReadiness] = useState(undefined);

  useEffect(() => {
    getCareerRoles().then(setRoles);
    getTargetRoleIdAsync().then(setSelectedRoleId);
  }, []);

  useEffect(() => {
    setReadiness(undefined);
    getRoleReadiness(selectedRoleId).then(setReadiness);
  }, [selectedRoleId]);

  const handleRoleChange = (roleId) => {
    setSelectedRoleId(roleId);
    setTargetRoleId(roleId);
  };

  return (
    <DashboardLayout>
      <header className="mb-8 border-b border-hairline pb-6">
        <h1 className="font-geist text-3xl text-ink tracking-tight mb-1">Skill Gap</h1>
        <p className="text-muted">See exactly which skills stand between you and your target role.</p>
      </header>

      <div className="mb-8">
        <label htmlFor="target-role" className="block text-xs uppercase tracking-wide text-muted mb-2">
          Target Role
        </label>
        {!roles ? (
          <LoadingState label="Loading roles…" />
        ) : (
          <select
            id="target-role"
            value={selectedRoleId}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="w-full md:w-80 border border-hairline rounded-md px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-1 focus:ring-ink"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {!readiness && <LoadingState label="Calculating skill gap…" />}

      {readiness && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <div className="bg-white border border-hairline rounded-xl p-8 flex flex-col items-center text-center">
              <h2 className="text-xs uppercase tracking-wide text-muted mb-3">Readiness for {readiness.role.title}</h2>
              <div className="font-editorial text-4xl text-ink tracking-tight mb-2">{readiness.readinessPercent}%</div>
              <p className="text-sm text-charcoal">
                {readiness.matchedSkills.length} of {readiness.matchedSkills.length + readiness.missingSkills.length}{" "}
                required skills verified.
              </p>
              <Link
                to="/career-path"
                className="mt-6 w-full bg-ink text-white text-sm px-4 py-2.5 rounded-md hover:bg-ink-hover active:scale-[0.98] transition-all"
              >
                View Career Path
              </Link>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
            <section className="bg-white border border-hairline rounded-xl p-6">
              <h3 className="text-base font-medium text-ink mb-4">Skills You Have</h3>
              {readiness.matchedSkills.length === 0 ? (
                <p className="text-sm text-muted">No required skills verified yet for this role.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {readiness.matchedSkills.map((skill) => (
                    <li key={skill.name} className="flex items-center gap-3 text-sm">
                      <CheckCircle size={18} weight="fill" className="text-pastel-green-ink shrink-0" />
                      <span className="text-ink">{skill.name}</span>
                      <span className="ml-auto text-muted">{skill.currentScore}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-white border border-hairline rounded-xl p-6">
              <h3 className="text-base font-medium text-ink mb-4">Missing Skills</h3>
              {readiness.missingSkills.length === 0 ? (
                <p className="text-sm text-muted">No gaps — you meet every required skill for this role.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {readiness.missingSkills.map((skill) => (
                    <li key={skill.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-3">
                        <Circle size={18} className="text-muted shrink-0" />
                        <span className="text-ink">{skill.name}</span>
                      </span>
                      <Link to="/skill-tests" className="text-ink hover:underline">
                        Assess this skill →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

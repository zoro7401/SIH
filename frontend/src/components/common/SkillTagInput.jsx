import { useMemo, useState } from "react";
import { X } from "@phosphor-icons/react";

// Multi-select tag input for the onboarding questionnaire's confident/
// struggle skill questions. Suggestions come from the canonical assessable
// skill list (same vocabulary skill_profile uses) but free text is always
// allowed, so a skill missing from that list can still be added.
//
// dropdownOptions (optional) renders a separate <select> above the type-
// ahead input — used for the confident-skills question to offer the basic
// skills for the student's chosen field, without replacing free typing.
export default function SkillTagInput({
  value,
  onChange,
  suggestions = [],
  dropdownOptions = [],
  dropdownLabel = "Common skills for this field",
  max = 3,
  placeholder = "Type a skill and press Enter",
}) {
  const [query, setQuery] = useState("");

  const filteredSuggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return suggestions.filter((s) => s.toLowerCase().includes(q) && !value.includes(s)).slice(0, 6);
  }, [query, suggestions, value]);

  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (!trimmed || value.length >= max || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setQuery("");
  };

  const removeTag = (tag) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(query);
    } else if (e.key === "Backspace" && !query && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag) => (
          <span key={tag} className="flex items-center gap-1.5 bg-pastel-blue text-pastel-blue-ink text-xs font-medium px-2.5 py-1 rounded-full">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:opacity-70 transition-opacity" aria-label={`Remove ${tag}`}>
              <X size={12} weight="bold" />
            </button>
          </span>
        ))}
      </div>

      {value.length < max && dropdownOptions.length > 0 && (
        <select
          className="w-full border border-hairline rounded-md px-3 py-2.5 bg-bone focus:border-ink focus:ring-0 text-sm text-charcoal outline-none transition-colors mb-2"
          value=""
          onChange={(e) => addTag(e.target.value)}
        >
          <option value="" disabled>
            {dropdownLabel}
          </option>
          {dropdownOptions
            .filter((s) => !value.includes(s))
            .map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
        </select>
      )}

      {value.length < max && (
        <div className="relative">
          <input
            className="w-full border border-hairline rounded-md px-3 py-2.5 bg-bone focus:border-ink focus:ring-0 text-sm placeholder:text-muted outline-none transition-colors"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
          {filteredSuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-bone border border-hairline rounded-md shadow-lift overflow-hidden">
              {filteredSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addTag(s)}
                  className="block w-full text-left px-3 py-2 text-sm text-charcoal hover:bg-canvas transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <p className="text-xs text-muted mt-1.5">{value.length}/{max} selected — press Enter to add a custom skill.</p>
    </div>
  );
}

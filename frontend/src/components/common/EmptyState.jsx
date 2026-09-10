import { Tray } from "@phosphor-icons/react";

export default function EmptyState({ icon: Icon = Tray, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 border border-hairline rounded-xl bg-white p-10 py-24">
      <Icon size={32} className="text-muted" />
      <h3 className="text-lg font-medium text-ink mt-2">{title}</h3>
      {description && <p className="text-sm text-muted max-w-sm">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 bg-ink text-white text-sm px-4 py-2 rounded-md hover:bg-ink-hover active:scale-[0.98] transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

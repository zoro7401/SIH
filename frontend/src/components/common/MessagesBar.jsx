import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { List } from "@phosphor-icons/react";
import { useAuth } from "../../hooks/useAuth";
import { getConversations } from "../../services/messagesService";
import { initialsOf, avatarGradientFor } from "../../utils/avatarColor";

const MESSAGES_ROUTE_BY_ROLE = {
  student: "/messages",
  industry: "/industry/messages",
};

export default function MessagesBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState(undefined);
  const containerRef = useRef(null);

  const messagesRoute = user ? MESSAGES_ROUTE_BY_ROLE[user.role] : undefined;

  useEffect(() => {
    if (!user) return;
    getConversations()
      .then(setConversations)
      .catch(() => setConversations([]));
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!user) return null;

  const recent = conversations?.slice(0, 6);
  const stackAvatars = recent?.slice(0, 3) ?? [];
  const unreadCount = conversations?.filter((c) => c.unread).length ?? 0;

  const goToMessages = () => {
    setOpen(false);
    if (messagesRoute) navigate(messagesRoute);
  };

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Popup panel */}
      <div
        className={`mb-3 w-80 max-w-[calc(100vw-3rem)] bg-white border border-hairline rounded-xl shadow-lift overflow-hidden origin-bottom-right transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-95 translate-y-3 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
          <h4 className="text-sm font-medium text-ink">Recent Chats</h4>
          {messagesRoute && (
            <button onClick={goToMessages} className="text-xs text-muted hover:text-ink transition-colors">
              View all
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {recent === undefined && <p className="text-sm text-muted px-4 py-6 text-center">Loading…</p>}
          {recent?.length === 0 && <p className="text-sm text-muted px-4 py-6 text-center">No messages yet.</p>}
          {recent?.map((c) => (
            <button
              key={c.id}
              onClick={goToMessages}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bone transition-colors text-left border-b border-hairline last:border-b-0"
            >
              <span
                className="w-9 h-9 rounded-full text-white flex items-center justify-center text-xs font-semibold flex-shrink-0"
                style={{ backgroundImage: avatarGradientFor(c.name) }}
              >
                {initialsOf(c.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink truncate">{c.name}</span>
                  {c.unread && <span className="w-2 h-2 rounded-full bg-pastel-red-ink flex-shrink-0" />}
                </span>
                {c.subtitle && <span className="block text-xs text-muted truncate">{c.subtitle}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Collapsed bar — a stack of the most recent contacts' avatars and a
          menu affordance, separated by a hairline divider. Shows who
          you're actually talking to instead of your own avatar. */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Messages"
        title="Messages"
        className="relative flex items-center gap-3 bg-ink pl-3 pr-3 py-2 rounded-full shadow-lift hover:bg-ink-hover active:scale-[0.97] transition-all"
      >
        {stackAvatars.length > 0 && (
          <span className="flex items-center gap-1.5">
            {stackAvatars.map((c) => (
              <span
                key={c.id}
                className="w-8 h-8 rounded-full text-white flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                style={{ backgroundImage: avatarGradientFor(c.name) }}
              >
                {initialsOf(c.name)}
              </span>
            ))}
          </span>
        )}
        <span className="w-px h-6 bg-white/20 flex-shrink-0" />
        <List size={18} className="text-white/70 flex-shrink-0" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-[18px] min-w-[18px] px-1 rounded-full bg-pastel-red-ink text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}

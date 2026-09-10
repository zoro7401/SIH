import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../layout/Sidebar";
import AmbientBrandGlow from "../ui/ambient-brand-glow";
import LoadingState from "../common/LoadingState";
import { getConversations, sendMessage, markConversationRead } from "../../services/messagesService";
import { initialsOf, avatarGradientFor } from "../../utils/avatarColor";
import {
  MagnifyingGlass,
  Paperclip,
  PaperPlaneTilt,
  DotsThreeVertical,
  Checks,
  ArrowLeft,
  ChatCircleDots,
} from "@phosphor-icons/react";

function ConversationAvatar({ conversation, size = 48 }) {
  const dimension = `${size / 16}rem`;
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{ width: dimension, height: dimension, fontSize: size * 0.36, backgroundImage: avatarGradientFor(conversation.name) }}
    >
      {initialsOf(conversation.name)}
    </div>
  );
}

// Real conversations only — no seeded fake contacts, and every conversation
// is a genuine student<->industry thread (see messagesController.js). Shared
// between the student MessagesInbox and the industry Messages page: the
// data shape (id, name, subtitle, unread, messages[]) is participant-
// agnostic, so this one component renders correctly for either side —
// "name"/"subtitle" are always the OTHER participant, whoever's logged in.
// emptyStateLabel lets each caller phrase "no conversations yet" for its
// own audience ("Apply to opportunities..." vs "Message an applicant...").
export default function ConversationInbox({ navItems, footerNavItems, emptyStateLabel }) {
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState(undefined);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    getConversations().then(async (list) => {
      // A direct link (e.g. "Message" on an application row) can request a
      // specific conversation via ?conversation=<id> — fall back to the
      // first conversation if it's absent or doesn't match anything.
      const requestedId = searchParams.get("conversation");
      const requested = requestedId && list.find((c) => c.id === requestedId);
      if (requested) {
        setActiveId(requested.id);
        setMobileShowThread(true);
        await markConversationRead(requested.id);
        setConversations(await getConversations());
      } else {
        setConversations(list);
        setActiveId(list[0]?.id ?? null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = conversations?.find((c) => c.id === activeId);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [active?.messages?.length, activeId]);

  const handleSelectConversation = async (id) => {
    setActiveId(id);
    setMobileShowThread(true);
    await markConversationRead(id);
    const refreshed = await getConversations();
    setConversations(refreshed);
  };

  const handleSend = async () => {
    if (!draft.trim() || !activeId) return;
    setSending(true);
    try {
      await sendMessage({ conversationId: activeId, text: draft.trim() });
      setDraft("");
      const refreshed = await getConversations();
      setConversations(refreshed);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations?.filter((c) => (c.name || "").toLowerCase().includes(search.toLowerCase()));
  const unreadCount = conversations?.filter((c) => c.unread).length ?? 0;

  return (
    <AmbientBrandGlow className="text-charcoal min-h-screen">
      <Sidebar navItems={navItems} footerNavItems={footerNavItems} />
      <main className="md:ml-56 flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 flex w-full bg-white h-full border-t md:border-t-0 border-hairline">
          {/*Left Column: Conversation List*/}
          <div
            className={`w-full md:w-[280px] lg:w-[320px] flex-shrink-0 md:border-r border-hairline flex-col bg-white ${
              mobileShowThread ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="p-6 border-b border-hairline">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-sans font-bold text-2xl text-ink tracking-tight">Messages</h2>
                {unreadCount > 0 && (
                  <span className="bg-bone text-ink text-xs font-semibold px-2.5 py-1 rounded-full">{unreadCount} new</span>
                )}
              </div>
              <div className="relative">
                <MagnifyingGlass size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className="w-full pl-10 pr-4 py-2.5 border border-hairline bg-white rounded-md text-sm focus:border-ink focus:outline-none focus:ring-0 placeholder:text-muted"
                  placeholder="Search conversations..."
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations === undefined && <LoadingState label="Loading conversations…" />}
              {conversations?.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center gap-2 py-16 px-6">
                  <ChatCircleDots size={28} className="text-muted" />
                  <p className="text-sm text-muted max-w-[240px]">{emptyStateLabel}</p>
                </div>
              )}
              {conversations?.length > 0 && filteredConversations?.length === 0 && (
                <p className="text-sm text-muted text-center py-10 px-6">No conversations match "{search}".</p>
              )}
              {filteredConversations?.map((conv) => {
                const lastMessage = conv.messages[conv.messages.length - 1];
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full text-left px-6 py-4 border-b border-hairline cursor-pointer flex gap-3.5 items-center transition-colors duration-150 ${
                      conv.id === activeId ? "bg-bone" : "hover:bg-bone"
                    }`}
                  >
                    <ConversationAvatar conversation={conv} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2 mb-0.5">
                        <h3 className={`text-[15px] truncate ${conv.unread ? "text-ink font-bold" : "text-ink font-semibold"}`}>
                          {conv.name}
                        </h3>
                        {lastMessage && (
                          <span className="text-xs text-muted whitespace-nowrap">
                            {new Date(lastMessage.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                      {conv.subtitle && <p className="text-xs text-muted truncate mb-0.5">{conv.subtitle}</p>}
                      {lastMessage && (
                        <p className={`text-sm truncate ${conv.unread ? "text-charcoal font-medium" : "text-muted"}`}>
                          {lastMessage.from === "me" && <span className="text-muted">You: </span>}
                          {lastMessage.text}
                        </p>
                      )}
                    </div>
                    {conv.unread && (
                      <div className="w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-white flex-shrink-0" aria-label="Unread" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/*Right Column: Open Thread*/}
          <div className={`flex-1 flex-col bg-white ${mobileShowThread ? "flex" : "hidden md:flex"}`}>
            {!active && (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-6">
                <div className="w-16 h-16 rounded-full bg-bone flex items-center justify-center text-muted">
                  <ChatCircleDots size={28} />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">Select a conversation</p>
                  <p className="text-sm text-muted mt-0.5">Choose someone from the list to view your message history.</p>
                </div>
              </div>
            )}
            {active && (
              <>
                <div className="px-4 md:px-8 py-4 border-b border-hairline flex justify-between items-center gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      className="icon-btn p-2 -ml-2 md:hidden flex-shrink-0"
                      onClick={() => setMobileShowThread(false)}
                      aria-label="Back to conversations"
                      title="Back to conversations"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <ConversationAvatar conversation={active} />
                    <div className="min-w-0">
                      <h2 className="text-base font-medium text-ink truncate">{active.name}</h2>
                      {active.subtitle && <p className="text-xs text-muted truncate">{active.subtitle}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {/* Not implemented this pass — visibly disabled with a
                        tooltip rather than a silently dead button. */}
                    <button
                      className="icon-btn p-2 opacity-40 cursor-not-allowed"
                      disabled
                      aria-label="Search in conversation — coming soon"
                      title="Coming soon"
                    >
                      <MagnifyingGlass size={18} />
                    </button>
                    <button
                      className="icon-btn p-2 opacity-40 cursor-not-allowed"
                      disabled
                      aria-label="More options — coming soon"
                      title="Coming soon"
                    >
                      <DotsThreeVertical size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-4 bg-canvas">
                  {active.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col gap-1 max-w-[85%] md:max-w-[70%] lg:max-w-[60%] ${
                        msg.from === "me" ? "self-end items-end" : "self-start"
                      }`}
                    >
                      <div
                        className={`px-4 py-3 rounded-xl text-sm leading-relaxed text-charcoal ${
                          msg.from === "me" ? "bg-bone rounded-tr-sm" : "bg-white border border-hairline rounded-tl-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      </div>
                      <div className="flex items-center gap-1 mx-2">
                        <span className="text-xs text-muted">
                          {new Date(msg.sentAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                        {msg.from === "me" && <Checks size={14} className="text-ink" />}
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>

                <div className="p-4 md:p-6 border-t border-hairline">
                  <div className="flex items-end gap-2 md:gap-3">
                    {/* Not implemented this pass — disabled with a tooltip. */}
                    <button
                      className="icon-btn p-2 flex-shrink-0 mb-0.5 opacity-40 cursor-not-allowed"
                      disabled
                      aria-label="Attach a file — coming soon"
                      title="Coming soon"
                    >
                      <Paperclip size={18} />
                    </button>
                    <div className="flex-1 relative">
                      <textarea
                        className="w-full resize-none border border-hairline bg-white rounded-md p-3 text-sm focus:border-ink focus:ring-0 focus:outline-none min-h-[44px] max-h-[120px]"
                        placeholder="Type a message..."
                        rows="1"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                      />
                    </div>
                    <button
                      onClick={handleSend}
                      disabled={sending || !draft.trim()}
                      className="bg-ink text-white px-4 md:px-5 py-2.5 rounded-md text-sm flex items-center gap-1.5 hover:bg-ink-hover active:scale-[0.98] transition-all mb-0.5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                      aria-label="Send message"
                    >
                      <span className="hidden sm:inline">{sending ? "Sending…" : "Send"}</span>
                      <PaperPlaneTilt size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </AmbientBrandGlow>
  );
}

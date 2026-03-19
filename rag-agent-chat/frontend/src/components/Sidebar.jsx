import { FileText, MessageSquarePlus, Sparkles } from "lucide-react";

export default function Sidebar({
  sessions,
  activeSessionId,
  onCreateChat,
  onSelectSession,
  documents,
  children,
}) {
  return (
    <aside className="glass-panel flex h-full min-h-[780px] flex-col rounded-[32px] p-4 lg:min-h-0">
      <button
        type="button"
        onClick={onCreateChat}
        className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-ink-900 px-4 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-ink-800 dark:bg-mint-400 dark:text-ink-900 dark:hover:bg-mint-300"
      >
        <MessageSquarePlus className="h-4 w-4" />
        New chat
      </button>

      <div className="mb-4 rounded-2xl border border-ink-100/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-ink-500 dark:text-ink-300">
          <Sparkles className="h-4 w-4" />
          Sessions
        </div>
        <div className="mt-3 space-y-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelectSession(session.id)}
              className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                activeSessionId === session.id
                  ? "bg-ink-900 text-white dark:bg-mint-400 dark:text-ink-900"
                  : "bg-ink-50 text-ink-700 hover:bg-ink-100 dark:bg-white/5 dark:text-ink-100 dark:hover:bg-white/10"
              }`}
            >
              <p className="truncate text-sm font-semibold">{session.title}</p>
              <p className="mt-1 text-xs opacity-70">
                {session.messages.length} message{session.messages.length === 1 ? "" : "s"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {children}

      <div className="mt-4 rounded-2xl border border-dashed border-ink-200/70 p-4 dark:border-white/10">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-ink-500 dark:text-ink-300">
          <FileText className="h-4 w-4" />
          Indexed docs
        </div>
        <p className="mt-2 text-sm text-ink-600 dark:text-ink-200">
          {documents.length} document{documents.length === 1 ? "" : "s"} ready for retrieval.
        </p>
      </div>
    </aside>
  );
}

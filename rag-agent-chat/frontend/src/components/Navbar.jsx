import { Bot, MoonStar, RefreshCw, SunMedium } from "lucide-react";

export default function Navbar({
  theme,
  onToggleTheme,
  onRefreshDocuments,
  streamingEnabled,
  onToggleStreaming,
}) {
  return (
    <header className="glass-panel sticky top-0 z-20 flex items-center justify-between rounded-[28px] px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-900 text-mint-300 shadow-lg shadow-mint-500/15 dark:bg-mint-400 dark:text-ink-900">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-ink-500 dark:text-ink-300">
            Agentic RAG Workspace
          </p>
          <h1 className="text-lg font-bold text-ink-900 dark:text-white">Knowledge Chat</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleStreaming}
          className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
            streamingEnabled
              ? "bg-mint-400 text-ink-900"
              : "bg-ink-100 text-ink-600 dark:bg-white/10 dark:text-ink-100"
          }`}
        >
          {streamingEnabled ? "Streaming on" : "Streaming off"}
        </button>
        <button
          type="button"
          onClick={onRefreshDocuments}
          className="rounded-full border border-ink-200/70 p-2 text-ink-700 transition hover:border-mint-400 hover:text-mint-500 dark:border-white/10 dark:text-ink-100"
          aria-label="Refresh documents"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-full border border-ink-200/70 p-2 text-ink-700 transition hover:border-mint-400 hover:text-mint-500 dark:border-white/10 dark:text-ink-100"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}

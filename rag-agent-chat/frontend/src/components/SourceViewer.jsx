import { ChevronDown, ChevronUp, FileSearch } from "lucide-react";
import { useState } from "react";

export default function SourceViewer({ sources = [] }) {
  const [open, setOpen] = useState(false);

  if (!sources.length) {
    return null;
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-ink-100 bg-white/70 dark:border-white/10 dark:bg-white/5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-ink-800 dark:text-ink-100">
          <FileSearch className="h-4 w-4 text-mint-500" />
          Show Sources
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-ink-500 dark:text-ink-300" />
        ) : (
          <ChevronDown className="h-4 w-4 text-ink-500 dark:text-ink-300" />
        )}
      </button>

      {open ? (
        <div className="space-y-3 border-t border-ink-100 px-4 py-4 dark:border-white/10">
          {sources.map((source) => (
            <div
              key={source.id}
              className="rounded-2xl bg-ink-50/90 p-4 dark:bg-ink-900/60"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink-900 dark:text-white">
                  {source.documentName}
                </p>
                {source.score !== null ? (
                  <span className="rounded-full bg-mint-400/15 px-3 py-1 text-xs font-semibold text-mint-500">
                    Score {source.score.toFixed(3)}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-700 dark:text-ink-100">
                {source.chunkText || "No chunk text provided."}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

import { Bot, Copy, RefreshCcw, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import SourceViewer from "./SourceViewer";

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1">
      <span className="pulse-dot h-2 w-2 rounded-full bg-mint-400" />
      <span className="pulse-dot h-2 w-2 rounded-full bg-mint-400" />
      <span className="pulse-dot h-2 w-2 rounded-full bg-mint-400" />
    </div>
  );
}

export default function MessageBubble({ message, onRegenerate }) {
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    toast.success("Response copied.");
  };

  return (
    <div className={`message-fade-in flex w-full gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ink-900 text-mint-300 dark:bg-mint-400 dark:text-ink-900">
          <Bot className="h-5 w-5" />
        </div>
      ) : null}

      <div className={`max-w-[85%] ${isUser ? "order-first" : ""}`}>
        <div
          className={`rounded-[24px] px-5 py-4 shadow-sm ${
            isUser
              ? "bg-ink-900 text-white dark:bg-mint-400 dark:text-ink-900"
              : "glass-panel text-ink-900 dark:text-ink-50"
          }`}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] opacity-75">
              {isUser ? <UserRound className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              {isUser ? "You" : "Assistant"}
            </div>

            {!isUser && message.content ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-full p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Copy response"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="rounded-full p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Regenerate response"
                >
                  <RefreshCcw className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>

          {message.isStreaming && !message.content ? (
            <TypingIndicator />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
          )}
        </div>

        {!isUser ? <SourceViewer sources={message.sources} /> : null}
      </div>

      {isUser ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-mint-400 text-ink-900 dark:bg-white/10 dark:text-white">
          <UserRound className="h-5 w-5" />
        </div>
      ) : null}
    </div>
  );
}

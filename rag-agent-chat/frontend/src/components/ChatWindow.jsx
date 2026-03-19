import { ArrowUp, Square, WandSparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({
  messages,
  onSend,
  onRegenerate,
  isSending,
  isStreaming,
  onStopStreaming,
  selectedCount,
}) {
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt) {
      return;
    }

    setInput("");
    await onSend(prompt);
  };

  return (
    <section className="glass-panel flex h-full min-h-[780px] flex-col rounded-[32px] lg:min-h-0">
      <div className="border-b border-ink-100/80 px-6 py-5 dark:border-white/10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-500 dark:text-ink-300">
          Conversation
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-ink-900 dark:text-white">
            Ask across your knowledge base
          </h2>
          <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700 dark:bg-white/10 dark:text-ink-100">
            {selectedCount} docs selected
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.length ? (
          <div className="space-y-6">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onRegenerate={onRegenerate}
              />
            ))}
            <div ref={endRef} />
          </div>
        ) : (
          <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-dashed border-ink-200/80 bg-white/55 px-6 text-center dark:border-white/10 dark:bg-white/5">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-mint-400/15 text-mint-500">
              <WandSparkles className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-ink-900 dark:text-white">
              Start a grounded conversation
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-7 text-ink-600 dark:text-ink-200">
              Upload PDFs, choose which documents to search, then ask questions. The assistant will
              answer from retrieved context and can show the evidence it used.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-ink-100/80 p-4 dark:border-white/10">
        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] border border-ink-100 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/5"
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask a question about your uploaded documents..."
            className="min-h-[86px] w-full resize-none border-0 bg-transparent px-2 py-2 text-sm leading-7 text-ink-900 outline-none placeholder:text-ink-400 dark:text-white dark:placeholder:text-ink-300"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-ink-500 dark:text-ink-300">
              Responses stay grounded in selected documents and session memory.
            </p>
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400"
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSending}
                className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-mint-400 dark:text-ink-900 dark:hover:bg-mint-300"
              >
                <ArrowUp className="h-4 w-4" />
                {isSending ? "Sending..." : "Send"}
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

import { FileUp, LoaderCircle } from "lucide-react";

export default function DocumentSelector({
  documents,
  selectedDocIds,
  onToggleDocument,
  onUpload,
  uploadProgress,
  isFetchingDocuments,
}) {
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await onUpload(file);
    event.target.value = "";
  };

  return (
    <section className="rounded-[28px] border border-ink-100/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-500 dark:text-ink-300">
            Documents
          </p>
          <h2 className="mt-1 text-base font-bold text-ink-900 dark:text-white">Scope retrieval</h2>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-mint-400 px-4 py-2 text-sm font-semibold text-ink-900 transition hover:bg-mint-300">
          <FileUp className="h-4 w-4" />
          Upload PDF
          <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
        </label>
      </div>

      {uploadProgress > 0 && uploadProgress < 100 ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink-500 dark:text-ink-300">
            <span>Uploading</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-ink-100 dark:bg-white/10">
            <div
              className="h-2 rounded-full bg-mint-400 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {isFetchingDocuments ? (
          <div className="flex items-center gap-2 rounded-2xl bg-ink-50 px-3 py-4 text-sm text-ink-500 dark:bg-white/5 dark:text-ink-200">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading documents...
          </div>
        ) : documents.length ? (
          documents.map((document) => {
            const checked = selectedDocIds.includes(document.id);
            return (
              <label
                key={document.id}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition ${
                  checked
                    ? "border-mint-400 bg-mint-400/10"
                    : "border-ink-100 bg-white/80 hover:border-ink-300 dark:border-white/10 dark:bg-white/5"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleDocument(document.id)}
                  className="mt-1 h-4 w-4 rounded border-ink-300 text-mint-500 focus:ring-mint-400"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">
                    {document.name}
                  </p>
                  <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">
                    {new Date(document.uploadedAt).toLocaleString()}
                  </p>
                </div>
              </label>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/80 px-4 py-6 text-sm text-ink-500 dark:border-white/10 dark:bg-white/5 dark:text-ink-200">
            No document endpoint response yet. Uploading still works, and selected scope will update when document metadata is available.
          </div>
        )}
      </div>
    </section>
  );
}

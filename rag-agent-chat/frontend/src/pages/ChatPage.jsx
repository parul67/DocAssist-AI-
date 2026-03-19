import ChatWindow from "../components/ChatWindow";
import DocumentSelector from "../components/DocumentSelector";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useChat } from "../hooks/useChat";

export default function ChatPage() {
  const {
    activeSession,
    documents,
    isFetchingDocuments,
    isSending,
    isStreaming,
    createNewChat,
    selectSession,
    sessions,
    sendMessage,
    regenerateLast,
    stopStreaming,
    toggleDocumentSelection,
    uploadFile,
    uploadProgress,
    refreshDocuments,
    theme,
    toggleTheme,
    streamingEnabled,
    setStreamingEnabled,
  } = useChat();

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <Navbar
          theme={theme}
          onToggleTheme={toggleTheme}
          onRefreshDocuments={refreshDocuments}
          streamingEnabled={streamingEnabled}
          onToggleStreaming={() => setStreamingEnabled((current) => !current)}
        />

        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <Sidebar
            sessions={sessions}
            activeSessionId={activeSession?.id}
            onCreateChat={createNewChat}
            onSelectSession={selectSession}
            documents={documents}
          >
            <DocumentSelector
              documents={documents}
              selectedDocIds={activeSession?.selectedDocIds || []}
              onToggleDocument={toggleDocumentSelection}
              onUpload={uploadFile}
              uploadProgress={uploadProgress}
              isFetchingDocuments={isFetchingDocuments}
            />
          </Sidebar>

          <ChatWindow
            messages={activeSession?.messages || []}
            onSend={sendMessage}
            onRegenerate={regenerateLast}
            isSending={isSending}
            isStreaming={isStreaming}
            onStopStreaming={stopStreaming}
            selectedCount={activeSession?.selectedDocIds?.length || 0}
          />
        </div>
      </div>
    </main>
  );
}

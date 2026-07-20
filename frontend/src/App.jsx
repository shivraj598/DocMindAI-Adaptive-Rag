import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const API_BASE = "http://127.0.0.1:8000";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const abortRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const stopGeneration = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setMessages((m) => [...m, { role: "system", content: "Stopped" }]);
      setLoading(false);
    }
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    const q = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);

    abortRef.current = new AbortController();
    try {
      const res = await fetch(`${API_BASE}/rag/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, session_id: sessionId }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.result?.content || "No response." }]);
    } catch (err) {
      if (err.name === "AbortError") return;
      setMessages((m) => [...m, { role: "assistant", content: "Unable to reach the server. Please check your connection." }]);
    }
    setLoading(false);
    abortRef.current = null;
  }, [input, sessionId]);

  const uploadFile = useCallback(async (file) => {
    if (!file) return;
    const desc = file.name.replace(/\.[^/.]+$/, "");
    const fd = new FormData();
    fd.append("file", file);
    setUploadProgress(0);
    setUploading(true);

    clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      setUploadProgress((p) => Math.min(p + Math.random() * 15, 85));
    }, 300);

    try {
      const res = await fetch(`${API_BASE}/rag/documents/upload`, {
        method: "POST",
        headers: { "X-Description": desc },
        body: fd,
      });
      clearInterval(progressRef.current);
      setUploadProgress(100);
      await new Promise((r) => setTimeout(r, 400));
      if (res.ok) setMessages((m) => [...m, { role: "system", content: `Document loaded — ${file.name}` }]);
      else alert(`Upload failed: ${await res.text()}`);
    } catch {
      clearInterval(progressRef.current);
      alert("Upload failed.");
    }
    setUploading(false);
    setUploadProgress(0);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-5 h-13 border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-secondary">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <span className="text-sm font-medium">Adaptive RAG</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setDark((p) => !p)} title="Toggle theme">
          {dark ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          )}
        </Button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="max-w-2xl mx-auto pt-12 pb-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-secondary">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">Upload a document or ask a question to get started</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className="animate-fade-in">
              {m.role === "system" ? (
                <div className="text-center">
                  <span className="text-xs text-muted-foreground">{m.content}</span>
                </div>
              ) : m.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed bg-primary text-primary-foreground">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div className="flex gap-4">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 mt-0.5 bg-secondary text-secondary-foreground">
                    A
                  </div>
                  <div className="text-sm leading-relaxed pt-1 text-foreground whitespace-pre-wrap">{m.content}</div>
                </div>
              )}
            </div>
          ))}
          {uploading && (
            <div className="max-w-2xl mx-auto animate-fade-in">
              <div className="flex items-center gap-4 p-4 rounded-xl border bg-card text-card-foreground">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Uploading document...</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-1.5" />
                </div>
                <svg className="w-4 h-4 animate-spin text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            </div>
          )}
          {loading && (
            <div className="flex gap-4 animate-fade-in">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 bg-secondary text-secondary-foreground">
                A
              </div>
              <div className="flex gap-1 items-center pt-2">
                <span className="w-1.5 h-1.5 rounded-full dot-pulse bg-muted-foreground" style={{ animationDelay: "0s" }} />
                <span className="w-1.5 h-1.5 rounded-full dot-pulse bg-muted-foreground" style={{ animationDelay: "0.2s" }} />
                <span className="w-1.5 h-1.5 rounded-full dot-pulse bg-muted-foreground" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2 rounded-2xl border border-input bg-card px-3 py-3 focus-within:ring-1 focus-within:ring-ring transition-shadow">
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => fileRef.current?.click()} title="Upload document">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </Button>
            <input ref={fileRef} type="file" accept=".pdf,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} className="hidden" />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask anything..."
              rows={1}
              disabled={loading}
              className="flex-1 bg-transparent text-sm outline-none resize-none py-0.5 placeholder:text-muted-foreground disabled:opacity-50"
              onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
            />
            {loading ? (
              <Button variant="secondary" size="icon" onClick={stopGeneration} title="Stop" className="shrink-0">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </Button>
            ) : (
              <Button variant="default" size="icon" onClick={sendMessage} disabled={!input.trim()} className="shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                </svg>
              </Button>
            )}
          </div>
          <p className="text-xs text-center mt-2 text-muted-foreground">Responses are generated by AI. Verify important information.</p>
        </div>
      </div>
    </div>
  );
}

export default App;

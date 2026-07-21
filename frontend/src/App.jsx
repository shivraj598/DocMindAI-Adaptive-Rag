import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const API_BASE = "http://127.0.0.1:8000";
const STORAGE_SESSIONS = "docmind_sessions";
const STORAGE_CURRENT = "docmind_current_session";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(STORAGE_CURRENT) || crypto.randomUUID());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_SESSIONS) || "[]"); }
    catch { return []; }
  });
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const abortRef = useRef(null);
  const progressRef = useRef(null);
  const sessionSavedRef = useRef(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_CURRENT, sessionId);
    sessionSavedRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_SESSIONS, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (messages.length > 0 && !sessionSavedRef.current) {
      const firstUser = messages.find(m => m.role === "user");
      if (firstUser) {
        setSessions(prev => {
          if (prev.some(s => s.id === sessionId)) return prev;
          return [{ id: sessionId, title: firstUser.content.slice(0, 50), timestamp: Date.now() }, ...prev];
        });
        sessionSavedRef.current = true;
      }
    }
  }, [messages, sessionId]);

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
        headers: { "X-Description": desc, "X-Session-Id": sessionId },
        body: fd,
      });
      clearInterval(progressRef.current);
      setUploadProgress(100);
      await new Promise((r) => setTimeout(r, 400));
      if (res.ok) {
        setMessages((m) => [...m, { role: "file", content: file.name }]);
      } else {
        alert(`Upload failed: ${await res.text()}`);
      }
    } catch {
      clearInterval(progressRef.current);
      alert("Upload failed.");
    }
    setUploading(false);
    setUploadProgress(0);
  }, [sessionId]);

  const saveCurrentSession = useCallback(() => {
    if (messages.length === 0) return;
    setSessions(prev => {
      if (prev.some(s => s.id === sessionId)) return prev;
      const firstUser = messages.find(m => m.role === "user");
      return [{ id: sessionId, title: firstUser?.content?.slice(0, 50) || "New Chat", timestamp: Date.now() }, ...prev];
    });
    sessionSavedRef.current = true;
  }, [messages, sessionId]);

  const newChat = () => {
    saveCurrentSession();
    setSessionId(crypto.randomUUID());
    setMessages([]);
  };

  const loadSession = async (id) => {
    if (id === sessionId) return;
    saveCurrentSession();
    setSessionId(id);
    setMessages([]);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/rag/sessions/${id}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    }
    setLoading(false);
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (id === sessionId) {
      setSessionId(crypto.randomUUID());
      setMessages([]);
    }
  };

  return (
    <div className="h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col shrink-0`}
      >
        <div className="flex flex-col h-full min-w-64">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-4 h-13 border-b border-sidebar-border shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-sidebar-accent text-sidebar-accent-foreground">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <span className="text-sm font-medium">DocMindAI</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-md hover:bg-sidebar-accent text-sidebar-accent-foreground"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-3">
            <button
              onClick={newChat}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-sidebar-border hover:bg-sidebar-accent transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Chat
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => loadSession(s.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-left transition-colors group ${
                  s.id === sessionId
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50"
                }`}
              >
                <svg className="w-4 h-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
                <span className="truncate flex-1">{s.title}</span>
                <button
                  onClick={(e) => deleteSession(e, s.id)}
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-sidebar-ring/20 transition-opacity"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-5 h-13 border-b shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1 rounded-md hover:bg-muted"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            )}
            <span className="text-sm font-medium">DocMindAI</span>
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
            {messages.length === 0 && !loading && (
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
                ) : m.role === "file" ? (
                  <div className="flex gap-4">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 mt-0.5 bg-secondary text-secondary-foreground">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-sm max-w-[80%]">
                      <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <span className="text-xs text-foreground truncate">{m.content}</span>
                      <span className="text-xs text-muted-foreground shrink-0">Uploaded</span>
                    </div>
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

        {/* Upload Progress / Popup */}
        <div className="px-4 shrink-0">
          <div className="max-w-2xl mx-auto">
            {uploading && (
              <div className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-lg border border-border bg-card/80 backdrop-blur-sm animate-fade-in">
                <svg className="w-3 h-3 animate-spin text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-[11px] text-muted-foreground">Uploading...</span>
                <div className="flex-1 max-w-24 ml-auto">
                  <Progress value={uploadProgress} className="h-0.5" />
                </div>
                <span className="text-[11px] tabular-nums text-muted-foreground w-6 text-right">{Math.round(uploadProgress)}%</span>
              </div>
            )}

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

    </div>
  );
}

export default App;

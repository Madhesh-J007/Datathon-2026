import { useState, useRef, useEffect } from "react";
import { assistantService } from "../../services/assistantService";
import { X, Send, Brain, FileText, Bot } from "lucide-react";
import { Link } from "react-router-dom";

export default function AssistantPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<any[]>([
    {
      sender: "bot",
      text: "Welcome to KSP Crime Intel Assistant. Ask me about case similarities, hotspots, or suspects.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMsg = query;
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setQuery("");
    setLoading(true);

    try {
      const data = await assistantService.queryAssistant(userMsg);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.answer,
          sources: data.source_case_ids || [],
          downloadUrl: data.download_url || null,
          modelVersion: data.model_version || "phase4-assistant-v1",
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Communication timeout. Ensure the AI inference backend is online." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none font-sans flex flex-col items-end">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-105 focus:outline-none"
        >
          <Brain size={22} className="animate-pulse" />
        </button>
      )}

      {isOpen && (
        <div className="w-[360px] h-[480px] bg-[#0d1322] border border-[#1e293b] rounded shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-[#111827] px-4 py-3 border-b border-[#1e293b] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="text-blue-500" size={16} />
              <span className="text-xs font-bold text-slate-200">KSP Intelligence Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col max-w-[85%] rounded p-2.5 text-xs leading-normal ${
                  m.sender === "user"
                    ? "bg-blue-600 text-white self-end ml-auto"
                    : "bg-[#111827] border border-[#1e293b] text-slate-300 self-start mr-auto"
                }`}
              >
                <p>{m.text}</p>

                {m.downloadUrl && (
                  <a
                    href={`http://localhost:8000${m.downloadUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2.5 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors w-fit shadow"
                  >
                    <FileText size={14} />
                    <span>Download PDF Dossier</span>
                  </a>
                )}

                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 border-t border-[#1e293b] pt-1.5 flex flex-wrap gap-1 items-center">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Citations:</span>
                    {m.sources.map((srcId: number) => (
                      <Link
                        key={srcId}
                        to={`/cases/${srcId}`}
                        onClick={() => setIsOpen(false)}
                        className="bg-blue-500/10 text-blue-400 hover:underline px-1 py-0.5 rounded text-[10px] font-mono border border-blue-500/25 flex items-center gap-0.5"
                      >
                        <FileText size={10} />
                        <span>Case #{srcId}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {m.sender === "bot" && m.modelVersion && (
                  <div className="text-[9px] text-slate-500 font-mono mt-1 text-right select-none uppercase tracking-wider">
                    rag_assistant · {m.modelVersion}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="bg-[#111827] border border-[#1e293b] text-slate-400 p-2.5 rounded text-xs self-start mr-auto animate-pulse flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></div>
                <span>Analyzing database index...</span>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <form onSubmit={handleSend} className="bg-[#111827] p-3 border-t border-[#1e293b] flex gap-2">
            <input
              type="text"
              placeholder="Ask about cases or hotspots..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-[#1e293b] border border-[#1e293b] text-slate-200 text-xs rounded px-3 py-1.5 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded p-1.5 flex items-center justify-center transition-colors focus:outline-none"
            >
              <Send size={12} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

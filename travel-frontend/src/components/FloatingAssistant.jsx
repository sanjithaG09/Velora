import React, { useState, useRef, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

function ChatText({ text }) {
  const lines = text.split("\n");
  return (
    <span>
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={i}>
            {parts.map((p, j) =>
              p.startsWith("**") && p.endsWith("**")
                ? <strong key={j}>{p.slice(2, -2)}</strong>
                : p
            )}
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </span>
  );
}

export default function FloatingAssistant({ pageContext = "travel planning", city = "", context = "" }) {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [streamText, setStream]   = useState("");
  const msgsEndRef = useRef(null);
  const inputRef   = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
      msgsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages, streamText]);

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setStream("");

    try {
      const res = await fetch(`${API}/api/ai/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: city || pageContext,
          route: [],
          messages: updated,
          pageContext: context || pageContext,
        }),
      });

      if (!res.ok || !res.body) { setLoading(false); return; }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") break;
          try {
            const { token } = JSON.parse(payload);
            reply += token;
            setStream(reply);
          } catch {}
        }
      }

      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      setStream("");
    } catch {}
    setLoading(false);
  };

  return (
    <>
      <style>{`
        .fa-fab{position:fixed;bottom:28px;right:28px;z-index:9000;width:52px;height:52px;border-radius:50%;border:none;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;font-size:22px;cursor:pointer;box-shadow:0 4px 20px rgba(124,58,237,0.45);transition:transform .2s,box-shadow .2s;display:flex;align-items:center;justify-content:center;}
        .fa-fab:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(124,58,237,0.6);}
        .fa-fab.active{background:linear-gradient(135deg,#5b21b6,#4c1d95);}
        .fa-panel{position:fixed;bottom:90px;right:28px;z-index:9000;width:340px;max-height:480px;background:#111;border:1px solid rgba(139,92,246,0.3);border-radius:18px;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.6);animation:fa-in .18s cubic-bezier(.22,1,.36,1);}
        @keyframes fa-in{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        .fa-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 12px;border-bottom:1px solid rgba(139,92,246,0.15);}
        .fa-title{display:flex;align-items:center;gap:8px;font-family:'Sora',sans-serif;font-size:13px;font-weight:700;color:#fff;}
        .fa-icon{width:26px;height:26px;border-radius:7px;background:rgba(139,92,246,0.18);border:1px solid rgba(139,92,246,0.3);display:flex;align-items:center;justify-content:center;font-size:13px;}
        .fa-close{background:none;border:none;color:rgba(255,255,255,0.4);font-size:18px;cursor:pointer;line-height:1;padding:2px 6px;border-radius:6px;transition:color .15s;}
        .fa-close:hover{color:#fff;}
        .fa-msgs{flex:1;overflow-y:auto;padding:14px 14px 8px;display:flex;flex-direction:column;gap:10px;min-height:60px;max-height:320px;}
        .fa-msgs::-webkit-scrollbar{width:3px}.fa-msgs::-webkit-scrollbar-thumb{background:#333;border-radius:2px;}
        .fa-empty{font-family:'Sora',sans-serif;font-size:12.5px;color:rgba(255,255,255,0.35);text-align:center;margin:auto;padding:20px 0;}
        .fa-bubble{max-width:90%;padding:9px 13px;border-radius:12px;font-family:'Sora',sans-serif;font-size:12.5px;line-height:1.6;}
        .fa-bubble.user{align-self:flex-end;background:rgba(124,58,237,0.25);border:1px solid rgba(139,92,246,0.3);color:#e9d5ff;border-bottom-right-radius:3px;}
        .fa-bubble.assistant{align-self:flex-start;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);color:rgba(255,255,255,0.82);border-bottom-left-radius:3px;}
        .fa-bubble.streaming{opacity:.85;}
        .fa-dots span{display:inline-block;width:5px;height:5px;border-radius:50%;background:#a78bfa;animation:fa-dot .9s infinite;margin:0 2px;}
        .fa-dots span:nth-child(2){animation-delay:.2s}.fa-dots span:nth-child(3){animation-delay:.4s}
        @keyframes fa-dot{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}
        .fa-form{display:flex;gap:7px;padding:10px 12px 12px;border-top:1px solid rgba(255,255,255,0.06);}
        .fa-input{flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:8px 12px;color:#fff;font-family:'Sora',sans-serif;font-size:12.5px;outline:none;resize:none;min-height:36px;max-height:80px;transition:border-color .2s;}
        .fa-input::placeholder{color:rgba(255,255,255,0.28);}
        .fa-input:focus{border-color:rgba(139,92,246,0.5);}
        .fa-send{padding:8px 13px;border-radius:10px;border:none;background:rgba(124,58,237,0.75);color:#fff;font-family:'Sora',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:background .2s;flex-shrink:0;height:36px;}
        .fa-send:hover:not(:disabled){background:rgba(124,58,237,1);}
        .fa-send:disabled{opacity:.4;cursor:not-allowed;}
        @media(max-width:480px){.fa-panel{width:calc(100vw - 32px);right:16px;bottom:84px;}.fa-fab{right:16px;bottom:20px;}}
      `}</style>

      {open && (
        <div className="fa-panel">
          <div className="fa-header">
            <div className="fa-title">
              <div className="fa-icon">✦</div>
              Velora Assistant
            </div>
            <button className="fa-close" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="fa-msgs">
            {messages.length === 0 && !loading && (
              <div className="fa-empty">Ask me anything about your trip ✦</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`fa-bubble ${m.role}`}>
                {m.role === "assistant" ? <ChatText text={m.content} /> : m.content}
              </div>
            ))}
            {loading && streamText && (
              <div className="fa-bubble assistant streaming">
                <ChatText text={streamText} />
              </div>
            )}
            {loading && !streamText && (
              <div className="fa-bubble assistant">
                <div className="fa-dots"><span/><span/><span/></div>
              </div>
            )}
            <div ref={msgsEndRef} />
          </div>

          <form className="fa-form" onSubmit={send}>
            <textarea
              ref={inputRef}
              className="fa-input"
              rows={1}
              placeholder="Ask a travel question…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={loading}
            />
            <button className="fa-send" type="submit" disabled={loading || !input.trim()}>↑</button>
          </form>
        </div>
      )}

      <button
        className={`fa-fab${open ? " active" : ""}`}
        onClick={() => setOpen(o => !o)}
        title="Travel Assistant"
      >
        ✦
      </button>
    </>
  );
}

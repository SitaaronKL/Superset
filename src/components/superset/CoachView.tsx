"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Sparkle, Trash2 } from "lucide-react";

interface SpeechRec {
  continuous: boolean; interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; start: () => void; stop: () => void;
}

const SUGGESTIONS = [
  "What's on Day 1?",
  "Build me a 10-min morning routine",
  "How should I warm up for shoulders?",
  "I slept badly. Adjust today.",
];

export default function CoachView() {
  const messages = useQuery(api.coach.history);
  const send = useAction(api.coach.send);
  const clearChat = useMutation(api.coach.clearChat);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const submit = async (content: string) => {
    if (!content.trim() || busy) return;
    setText(""); setBusy(true);
    try { await send({ content: content.trim() }); }
    finally { setBusy(false); }
  };

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + " ";
      setText(t.trim());
    };
    rec.onend = () => setListening(false);
    rec.start(); recRef.current = rec; setListening(true);
  };

  const empty = messages !== undefined && messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-7.5rem)]">
      <div className="flex items-center justify-between px-3 pt-1">
        <h2 className="display text-2xl">COACH</h2>
        {messages && messages.length > 0 && (
          <button onClick={() => clearChat()} className="text-muted-foreground p-1" aria-label="Clear chat"><Trash2 size={16} /></button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5">
        {empty && (
          <div className="flex flex-col items-center text-center gap-3 mt-10 px-4">
            <div className="h-12 w-12 rounded-full grid place-items-center" style={{ background: "color-mix(in oklch, var(--accent-user) 18%, transparent)" }}>
              <Sparkle size={22} style={{ color: "var(--accent-user)" }} />
            </div>
            <p className="text-sm text-muted-foreground">Your coach knows your program, history, and goals. Ask anything, or lock in a routine.</p>
            <div className="flex flex-col gap-2 w-full mt-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => submit(s)}
                  className="rounded-full ring-1 ring-foreground/15 px-4 py-2.5 text-sm text-left active:bg-muted">{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages?.map((m) => (
          <div key={m._id} className={m.role === "user" ? "self-end max-w-[85%]" : "self-start max-w-[90%]"}>
            <div className="rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed"
              style={m.role === "user"
                ? { background: "var(--accent-user)", color: "#fff" }
                : { background: "var(--muted)" }}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && <div className="self-start rounded-2xl bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">…</div>}
        <div ref={endRef} />
      </div>

      <div className="px-3 pb-2 pt-2 border-t border-border flex items-center gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(text); }}
          placeholder="Ask your coach…" className="h-11 flex-1" />
        <button onClick={toggleMic} aria-label="Voice"
          className="h-11 w-11 grid place-items-center rounded-full ring-1 ring-foreground/15 shrink-0"
          style={listening ? { background: "var(--accent-user)", color: "#fff" } : undefined}>
          {listening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button onClick={() => submit(text)} disabled={!text.trim() || busy} aria-label="Send"
          className="h-11 w-11 grid place-items-center rounded-full shrink-0 disabled:opacity-40"
          style={{ background: "var(--accent-user)", color: "#fff" }}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

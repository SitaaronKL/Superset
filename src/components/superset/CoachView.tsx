"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Sparkle, Trash2 } from "lucide-react";

interface SpeechRec {
  continuous: boolean; interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; start: () => void; stop: () => void;
}

const STATIC_SUGGESTIONS = [
  "Build me a 10-min morning routine",
  "I slept badly. Adjust today.",
];

// Chips lead with what the data says right now (taste first), then fall back
// to evergreen prompts.
function useLiveSuggestions(): string[] {
  const logs = useQuery(api.food.listFoodLogs);
  const settings = useQuery(api.settings.getAll);
  const days = useQuery(api.workouts.listProgramDays);
  const recency = useQuery(api.workouts.exerciseRecency);
  const [todayStart] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); });

  return useMemo(() => {
    const chips: string[] = [];

    const proteinGoal = Number(settings?.proteinGoal) || 0;
    if (proteinGoal && logs) {
      let pro = 0;
      for (const l of logs) if (l.loggedAt >= todayStart) pro += l.protein ?? 0;
      const left = Math.round(proteinGoal - pro);
      if (left > 20) chips.push(`I'm ${left}g under protein today. What should I eat?`);
    }

    if (days && days.length > 0 && recency) {
      // The stalest program day = the one whose exercises were trained longest ago.
      let stalest: { name: string; last: number } | null = null;
      for (const d of days) {
        const lasts = d.exerciseIds.map((id) => recency[id as string] ?? 0);
        const last = lasts.length ? Math.max(...lasts) : 0;
        if (!stalest || last < stalest.last) stalest = { name: d.name, last };
      }
      if (stalest) {
        const daysAgo = stalest.last ? Math.floor((Date.now() - stalest.last) / 86400000) : null;
        chips.push(daysAgo && daysAgo >= 4
          ? `${stalest.name} is due (last done ${daysAgo} days ago). Plan it for me.`
          : `What's on ${stalest.name}?`);
      }
    }

    return [...chips, ...STATIC_SUGGESTIONS].slice(0, 4);
  }, [logs, settings, days, recency, todayStart]);
}

export default function CoachView() {
  const messages = useQuery(api.coach.history);
  const send = useAction(api.coach.send);
  const clearChat = useMutation(api.coach.clearChat);
  const suggestions = useLiveSuggestions();

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const submit = async (content: string) => {
    if (!content.trim() || busy) return;
    setText(""); setBusy(true); setSendError(null);
    try { await send({ content: content.trim() }); }
    catch { setSendError("Couldn't reach the coach. Tap to retry."); setText(content.trim()); }
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
    <div className="flex flex-col h-(--chat-height)">
      <div className="flex items-center justify-between px-(--page-padding) pt-1">
        <h2 className="display text-2xl">COACH</h2>
        {messages && messages.length > 0 && (
          <button onClick={() => clearChat()} className="text-muted-foreground p-1" aria-label="Clear chat"><Trash2 size={16} /></button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-(--page-padding) py-3 flex flex-col gap-3">
        {empty && (
          <div className="flex flex-col items-center text-center gap-3 mt-10 px-4">
            <div className="h-12 w-12 rounded-full grid place-items-center bg-muted">
              <Sparkle size={22} className="text-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Your coach knows your program, history, and goals. Ask anything, or lock in a routine.</p>
            <div className="flex flex-col gap-2 w-full mt-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => submit(s)}
                  className="rounded-full ring-1 ring-foreground/15 px-4 py-3 text-sm text-left active:bg-muted">{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages?.map((m, i) => (
          <div key={m._id}
            className={`${m.role === "user" ? "self-end max-w-[85%]" : "self-start max-w-[90%]"}${
              i > 0 && messages[i - 1].role !== m.role ? " mt-2" : ""}`}>
            <div className="rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-normal"
              style={m.role === "user"
                ? { background: "var(--accent-user)", color: "var(--accent-foreground)" }
                : { background: "var(--muted)" }}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && <div className="self-start rounded-2xl bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">…</div>}
        {sendError && (
          <button onClick={() => submit(text)}
            className="self-start rounded-2xl px-3.5 py-2.5 text-sm text-left text-destructive"
            style={{ background: "var(--destructive-tint)" }}>
            {sendError}
          </button>
        )}
        <div ref={endRef} />
      </div>

      <div className="px-(--page-padding) pb-2 pt-2 border-t border-border flex items-center gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(text); }}
          placeholder="Ask your coach…" className="h-11 flex-1" />
        <button onClick={toggleMic} aria-label="Voice"
          className="h-11 w-11 grid place-items-center rounded-full ring-1 ring-foreground/15 shrink-0"
          style={listening ? { background: "var(--accent-user)", color: "var(--accent-foreground)" } : undefined}>
          {listening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button onClick={() => submit(text)} disabled={!text.trim() || busy} aria-label="Send"
          className="h-11 w-11 grid place-items-center rounded-full shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
          style={{ background: "var(--accent-user)", color: "var(--accent-foreground)" }}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

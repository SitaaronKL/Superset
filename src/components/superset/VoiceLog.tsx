"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff } from "lucide-react";

type Parsed = {
  sets: { exerciseName: string; weight: number; reps: number; fatigue: "ez" | "struggle" | "failure" | "tooTired" | null; isWarmup: boolean }[];
  memoryCandidates: { fact: string; category: string }[];
  readback: string;
};

export function VoiceLog({ sessionId, nextIndexFor }: {
  sessionId: Id<"sessions">;
  nextIndexFor: (exerciseId: Id<"exercises">) => number;
}) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const ingest = useAction(api.agent.ingest);
  const logSet = useMutation(api.workouts.logSet);
  const remember = useMutation(api.memories.remember);
  const exercises = useQuery(api.workouts.listExercises);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition not supported here — type it instead.");
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      let text = "";
      for (const r of e.results) text += r[0].transcript + " ";
      setTranscript(text.trim());
    };
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  };

  const parse = async () => {
    setBusy(true);
    setError(null);
    try {
      setParsed(await ingest({ transcript }));
    } catch (e: any) {
      setError(e.message?.includes("OPENAI_API_KEY") ? "OpenAI key not configured yet — add it in Convex env." : "Could not parse that.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!parsed || !exercises) return;
    setBusy(true);
    for (const s of parsed.sets) {
      const ex = exercises.find((e) => e.name === s.exerciseName);
      if (!ex) continue;
      await logSet({
        sessionId,
        exerciseId: ex._id,
        setIndex: nextIndexFor(ex._id),
        weight: s.weight,
        reps: s.reps,
        fatigue: s.fatigue ?? undefined,
        isWarmup: s.isWarmup,
      });
    }
    for (const m of parsed.memoryCandidates) {
      await remember({ fact: m.fact, category: m.category, source: "voice log" });
    }
    setBusy(false);
    setOpen(false);
    setTranscript("");
    setParsed(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-2 border-foreground rounded-none gap-2">
          <Mic size={16} /> VOICE
        </Button>
      </DialogTrigger>
      <DialogContent className="border-2 border-foreground rounded-none max-w-md">
        <DialogHeader>
          <DialogTitle className="display text-2xl">SPEAK YOUR SETS</DialogTitle>
        </DialogHeader>
        <Button onClick={toggleMic} variant={listening ? "default" : "outline"}
          className="h-14 rounded-none border-2 border-foreground gap-2"
          style={listening ? { background: "var(--accent-user)" } : undefined}>
          {listening ? <MicOff /> : <Mic />} {listening ? "STOP" : "START TALKING"}
        </Button>
        <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)}
          placeholder={'e.g. "skullcrushers 40 for 10 easy, then 50 for 8, last one was brutal"'}
          className="rounded-none border-2 border-foreground min-h-24" />
        {!parsed ? (
          <Button onClick={parse} disabled={!transcript || busy} className="rounded-none h-12">
            {busy ? "PARSING..." : "PARSE"}
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm border-l-4 pl-3" style={{ borderColor: "var(--accent-user)" }}>{parsed.readback}</p>
            <div className="text-xs space-y-1">
              {parsed.sets.map((s, i) => (
                <div key={i} className="flex justify-between border-b border-muted pb-1">
                  <span>{s.exerciseName}</span>
                  <span className="tabular-nums">{s.weight} × {s.reps} {s.fatigue ? `· ${s.fatigue}` : ""}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="rounded-none border-2" onClick={() => setParsed(null)}>FIX IT</Button>
              <Button className="rounded-none" onClick={confirm} disabled={busy}>SAVE ALL</Button>
            </div>
          </div>
        )}
        {error && <p className="text-xs" style={{ color: "var(--accent-user)" }}>{error}</p>}
      </DialogContent>
    </Dialog>
  );
}

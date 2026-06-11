"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export default function HistoryView() {
  const exercises = useQuery(api.workouts.listExercises);
  const excuses = useQuery(api.nudges.excuseLedger);
  const [selected, setSelected] = useState<Id<"exercises"> | null>(null);

  if (!exercises) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="display text-3xl">HISTORY</h2>
      <div className="flex flex-wrap gap-1">
        {exercises.map((e) => (
          <button key={e._id} onClick={() => setSelected(selected === e._id ? null : e._id)}
            className="border-2 border-foreground px-3 py-1.5 text-xs"
            style={selected === e._id ? { background: "var(--accent-user)", borderColor: "var(--accent-user)", color: "white" } : undefined}>
            {e.name}
          </button>
        ))}
      </div>
      {selected && <ExerciseHistory exerciseId={selected} />}

      {excuses && excuses.length > 0 && (
        <div className="mt-6">
          <h3 className="display text-xl mb-2" style={{ color: "var(--accent-user)" }}>EXCUSE LEDGER</h3>
          <div className="text-xs space-y-1">
            {excuses.map((e) => (
              <div key={e._id} className="flex justify-between border-b border-muted pb-1">
                <span>{e.reason}</span>
                <span className="text-muted-foreground">{new Date(e.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseHistory({ exerciseId }: { exerciseId: Id<"exercises"> }) {
  const history = useQuery(api.workouts.exerciseHistory, { exerciseId });
  if (!history) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (history.length === 0) return <p className="text-sm text-muted-foreground">No sets yet.</p>;

  const maxE1RM = Math.max(...history.map((h) => h.e1RM));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-1 h-24 border-b-2 border-foreground pb-px">
        {[...history].reverse().map((h) => (
          <div key={h.sessionId} className="flex-1 min-w-1"
            style={{ height: `${(h.e1RM / maxE1RM) * 100}%`, background: "var(--accent-user)" }}
            title={`${h.e1RM} e1RM`} />
        ))}
      </div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">estimated 1RM per session →</p>
      {history.map((h) => (
        <div key={h.sessionId} className="border-2 border-foreground p-3">
          <div className="flex justify-between text-xs mb-2">
            <span>{new Date(h.date).toLocaleDateString()}</span>
            <span className="display">e1RM {h.e1RM}</span>
          </div>
          <div className="text-xs space-y-0.5">
            {h.sets.map((s) => (
              <div key={s._id} className="flex justify-between tabular-nums">
                <span className="text-muted-foreground">{s.isWarmup ? "warmup" : `set ${s.setIndex + 1}`}</span>
                <span>{s.weight} × {s.reps} {s.fatigue ? `· ${s.fatigue}` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

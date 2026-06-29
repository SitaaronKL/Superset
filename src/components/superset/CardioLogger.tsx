"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ButtonGroup } from "@/components/ui/button-group";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Plus, Trash2 } from "lucide-react";

type Sweat = "light" | "medium" | "heavy" | "soaked";
const SWEATS: Sweat[] = ["light", "medium", "heavy", "soaked"];
const QUICK_TYPES = ["Incline walk", "Run", "Stairmaster", "Bike", "Row"];

// Read-only: a sweat pill shown on each row.
function SweatBadge({ sweat }: { sweat?: Sweat }) {
  if (!sweat) return null;
  return (
    <Badge
      variant="secondary"
      className="text-[9px] uppercase tracking-widest shrink-0"
      style={{ backgroundColor: "var(--accent-user)", color: "white", border: "none" }}
    >
      {sweat}
    </Badge>
  );
}

// A compact stat string: "22 min · 180 cal".
function statLine(minutes?: number, calories?: number) {
  const bits: string[] = [];
  if (minutes) bits.push(`${minutes} min`);
  if (calories) bits.push(`${calories} cal`);
  return bits.join(" · ");
}

type CardioRow = {
  _id: Id<"cardio">;
  type: string;
  description?: string;
  minutes?: number;
  calories?: number;
  sweat?: Sweat;
};

function Row({ c, onDelete }: { c: CardioRow; onDelete?: () => void }) {
  const stats = statLine(c.minutes, c.calories);
  return (
    <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-2">
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium truncate">{c.type}</span>
          <SweatBadge sweat={c.sweat} />
        </div>
        {(stats || c.description) && (
          <span className="num text-[11px] text-muted-foreground truncate">
            {stats}
            {stats && c.description ? " · " : ""}
            {c.description ? <span className="font-sans">{c.description}</span> : null}
          </span>
        )}
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete cardio"
          className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground active:scale-90 active:bg-muted shrink-0"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

// Editable cardio list with an add drawer. Used inside an active session.
export function CardioLogger({ sessionId }: { sessionId: Id<"sessions"> }) {
  const cardio = useQuery(api.cardio.sessionCardio, { sessionId }) as CardioRow[] | undefined;
  const del = useMutation(api.cardio.deleteCardio);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Cardio</p>
        <AddCardioDrawer sessionId={sessionId} />
      </div>

      {cardio && cardio.length > 0 && (
        <div className="flex flex-col gap-2">
          {cardio.map((c) => (
            <Row key={c._id} c={c} onDelete={() => del({ id: c._id })} />
          ))}
        </div>
      )}
    </div>
  );
}

// Read-only summary for the History detail view. Null when empty.
export function CardioSummary({ sessionId }: { sessionId: Id<"sessions"> }) {
  const cardio = useQuery(api.cardio.sessionCardio, { sessionId }) as CardioRow[] | undefined;
  if (!cardio || cardio.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground px-1">Cardio</p>
      <div className="flex flex-col gap-2">
        {cardio.map((c) => (
          <Row key={c._id} c={c} />
        ))}
      </div>
    </div>
  );
}

function AddCardioDrawer({ sessionId }: { sessionId: Id<"sessions"> }) {
  const addCardio = useMutation(api.cardio.addCardio);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [other, setOther] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [calories, setCalories] = useState("");
  const [sweat, setSweat] = useState<Sweat | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setType(""); setOther(false); setMinutes(""); setCalories("");
    setSweat(undefined); setDescription("");
  };

  const submit = async () => {
    const t = type.trim();
    if (!t) return;
    setBusy(true);
    try {
      await addCardio({
        sessionId,
        type: t,
        minutes: minutes ? Number(minutes) : undefined,
        calories: calories ? Number(calories) : undefined,
        sweat,
        description: description.trim() || undefined,
      });
      reset();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DrawerTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-8">
          <Plus size={14} /> Add cardio
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-w-md mx-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle className="display text-2xl">Add cardio</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-3">
          {/* Type quick-pick */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Type</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TYPES.map((qt) => {
                const active = !other && type === qt;
                return (
                  <button
                    key={qt}
                    type="button"
                    onClick={() => { setType(qt); setOther(false); }}
                    className="rounded-full border px-3 py-1.5 text-sm active:scale-95 transition"
                    style={active ? { backgroundColor: "var(--accent-user)", color: "white", borderColor: "transparent" } : undefined}
                  >
                    {qt}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => { setOther(true); setType(""); }}
                className="rounded-full border px-3 py-1.5 text-sm active:scale-95 transition"
                style={other ? { backgroundColor: "var(--accent-user)", color: "white", borderColor: "transparent" } : undefined}
              >
                Other
              </button>
            </div>
            {other && (
              <Input
                autoFocus
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="What kind of cardio?"
                className="h-11"
              />
            )}
          </div>

          {/* Minutes + calories */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              inputMode="numeric"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Minutes"
              className="h-11 num"
            />
            <Input
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Calories"
              className="h-11 num"
            />
          </div>

          {/* Sweat */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Sweat</span>
            <ButtonGroup className="w-full">
              {SWEATS.map((s) => {
                const active = sweat === s;
                return (
                  <Button
                    key={s}
                    type="button"
                    variant={active ? "default" : "outline"}
                    className="flex-1 text-[11px] uppercase tracking-widest"
                    onClick={() => setSweat(active ? undefined : s)}
                    style={active ? { backgroundColor: "var(--accent-user)", color: "white", borderColor: "transparent" } : undefined}
                  >
                    {s}
                  </Button>
                );
              })}
            </ButtonGroup>
          </div>

          {/* Description */}
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Note (optional)"
            className="h-11"
          />

          <Button className="h-11" disabled={!type.trim() || busy} onClick={submit}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

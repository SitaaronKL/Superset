"use client";

import { useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Plus, Camera, Trash2, Utensils, X } from "lucide-react";
import WeightCard from "./WeightCard";

function GoalBar({ label, value, goal, unit }: { label: string; value: number; goal: number; unit: string }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="uppercase tracking-widest text-muted-foreground text-[10px]">{label}</span>
        <span className="num">{value}{goal > 0 ? ` / ${goal}` : ""} {unit}</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: "var(--accent-user)" }} />
      </div>
    </div>
  );
}

const dayLabel = (d: number) => {
  const date = new Date(d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const y = new Date(today); y.setDate(y.getDate() - 1);
  if (d >= today.getTime()) return "Today";
  if (d >= y.getTime()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
};
const timeLabel = (d: number) => new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export default function FoodView() {
  const logs = useQuery(api.food.listFoodLogs);
  const settings = useQuery(api.settings.getAll);
  const del = useMutation(api.food.deleteFoodLog);

  const [todayStart] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); });
  const today = useMemo(() => {
    let cal = 0, pro = 0;
    for (const l of logs ?? []) if (l.loggedAt >= todayStart) { cal += l.calories ?? 0; pro += l.protein ?? 0; }
    return { cal, pro };
  }, [logs, todayStart]);
  const proteinGoal = Number(settings?.proteinGoal) || 0;
  const calorieGoal = Number(settings?.calorieGoal) || 0;

  const days = useMemo(() => {
    const out: { label: string; items: NonNullable<typeof logs> }[] = [];
    for (const l of logs ?? []) {
      const label = dayLabel(l.loggedAt);
      const bucket = out.find((m) => m.label === label);
      if (bucket) bucket.items.push(l);
      else out.push({ label, items: [l] });
    }
    return out;
  }, [logs]);

  return (
    <div className="p-3 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="display text-2xl mt-1">FOOD</h2>
        <AddFoodDrawer />
      </div>

      <Card className="gap-3 p-3">
        <GoalBar label="Protein today" value={today.pro} goal={proteinGoal} unit="g" />
        <GoalBar label="Calories today" value={today.cal} goal={calorieGoal} unit="cal" />
        {proteinGoal === 0 && calorieGoal === 0 && (
          <p className="text-[11px] text-muted-foreground">Set daily goals in Settings to track progress.</p>
        )}
      </Card>

      <WeightCard />

      {logs === undefined ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : logs.length === 0 ? (
        <Empty className="mt-10">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Utensils /></EmptyMedia>
            <EmptyTitle>Nothing logged yet</EmptyTitle>
            <EmptyDescription>Snap a photo of what you eat or drink to start your daily log.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        days.map((day) => (
          <div key={day.label} className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{day.label}</p>
              {(() => {
                const cal = day.items.reduce((s, l) => s + (l.calories ?? 0), 0);
                const pro = day.items.reduce((s, l) => s + (l.protein ?? 0), 0);
                return cal > 0 || pro > 0 ? (
                  <p className="num text-[11px] text-muted-foreground">{cal} cal · {pro}g protein</p>
                ) : null;
              })()}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {day.items.map((l) => (
                <Card key={l._id} className="gap-0 p-0 overflow-hidden relative">
                  {l.itemUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.itemUrl} alt={l.name ?? "food"} className="w-full aspect-square object-cover" />
                  )}
                  <div className="p-2 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-medium truncate">{l.name || "Logged"}</span>
                      {l.backUrl && <Badge variant="secondary" className="text-[9px] shrink-0">label</Badge>}
                    </div>
                    {(l.calories || l.protein) ? (
                      <span className="num text-[10px] text-muted-foreground">{l.calories ?? 0} cal · {l.protein ?? 0}g</span>
                    ) : null}
                    <span className="num text-[10px] text-muted-foreground">{timeLabel(l.loggedAt)}</span>
                  </div>
                  <button onClick={() => del({ id: l._id })} aria-label="Delete"
                    className="absolute top-1.5 right-1.5 h-7 w-7 grid place-items-center rounded-full bg-black/45 text-white backdrop-blur active:scale-90">
                    <Trash2 size={13} />
                  </button>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function PhotoPicker({ label, file, onPick }: { label: string; file: File | null; onPick: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <button type="button" onClick={() => ref.current?.click()}
        className="relative aspect-square rounded-2xl border border-dashed border-muted-foreground/40 overflow-hidden grid place-items-center active:bg-muted">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <Camera size={22} className="text-muted-foreground" />
        )}
        {preview && (
          <span onClick={(e) => { e.stopPropagation(); onPick(null); }}
            className="absolute top-1.5 right-1.5 h-6 w-6 grid place-items-center rounded-full bg-black/45 text-white">
            <X size={12} />
          </span>
        )}
      </button>
      <input ref={ref} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
    </div>
  );
}

function AddFoodDrawer() {
  const generateUploadUrl = useMutation(api.food.generateUploadUrl);
  const analyze = useAction(api.food.analyze);
  const addFoodLog = useMutation(api.food.addFoodLog);
  const [open, setOpen] = useState(false);
  const [itemFile, setItemFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>("");

  const upload = async (file: File): Promise<Id<"_storage">> => {
    const url = await generateUploadUrl();
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
    const { storageId } = await res.json();
    return storageId as Id<"_storage">;
  };

  const submit = async () => {
    if (!itemFile) return;
    setBusy(true);
    try {
      setStage("Uploading…");
      const itemImage = await upload(itemFile);
      const backImage = backFile ? await upload(backFile) : undefined;
      setStage("Reading the photo…");
      const a = await analyze({ itemImage, backImage });
      await addFoodLog({
        itemImage, backImage,
        name: name.trim() || a.name || undefined,
        calories: a.calories || undefined,
        protein: a.protein || undefined,
        summary: a.summary || undefined,
      });
      setItemFile(null); setBackFile(null); setName(""); setOpen(false);
    } finally {
      setBusy(false); setStage("");
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button className="gap-1.5"><Plus size={16} /> Log food</Button>
      </DrawerTrigger>
      <DrawerContent className="max-w-md mx-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <DrawerHeader className="px-0 text-left"><DrawerTitle className="display text-2xl">Log food</DrawerTitle></DrawerHeader>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <PhotoPicker label="Item" file={itemFile} onPick={setItemFile} />
            <PhotoPicker label="Back / label (optional)" file={backFile} onPick={setBackFile} />
          </div>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional, AI fills it in)" className="h-11" />
          <Button className="h-11" disabled={!itemFile || busy} onClick={submit}>
            {busy ? (stage || "Saving…") : "Save to today"}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center -mt-1">The coach reads your photos to name it and pull calories + protein.</p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MedsView() {
  const meds = useQuery(api.meds.list);
  const add = useMutation(api.meds.add);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("glp1");
  const [protocol, setProtocol] = useState("");

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="display text-3xl">MEDS</h2>
      <p className="text-xs text-muted-foreground border-l-4 border-muted pl-2">
        Logbook only. Superset records what you and your doctor decided, it never advises doses.
      </p>

      {meds?.map((m) => <MedCard key={m._id} med={m} />)}

      {!adding ? (
        <Button variant="outline" onClick={() => setAdding(true)}>
          + ADD MEDICATION
        </Button>
      ) : (
        <div className="rounded-card bg-card ring-1 ring-foreground/10 p-3 flex flex-col gap-2">
          <Input placeholder="name (e.g. Semaglutide)" value={name} onChange={(e) => setName(e.target.value)}
            className="h-11" />
          <div className="grid grid-cols-4 gap-1">
            {["glp1", "peptide", "supplement", "other"].map((k) => (
              <button key={k} onClick={() => setKind(k)} className="rounded-full ring-1 ring-foreground/15 py-2 text-xs uppercase"
                style={kind === k ? { background: "var(--accent-user)", color: "var(--accent-foreground)" } : undefined}>
                {k}
              </button>
            ))}
          </div>
          <Input placeholder="protocol (e.g. 0.5mg weekly, Sunday AM)" value={protocol} onChange={(e) => setProtocol(e.target.value)}
            className="h-11" />
          <Button disabled={!name || !protocol}
            onClick={async () => { await add({ name, kind, protocol }); setAdding(false); setName(""); setProtocol(""); }}>
            SAVE
          </Button>
        </div>
      )}
    </div>
  );
}

function MedCard({ med }: { med: Doc<"medications"> }) {
  const logs = useQuery(api.meds.logsFor, { medicationId: med._id });
  const logDose = useMutation(api.meds.logDose);
  const [dose, setDose] = useState("");
  const [site, setSite] = useState("");

  const last = logs?.[0];

  return (
    <div className="rounded-card bg-card ring-1 ring-foreground/10 p-4 flex flex-col gap-2">
      <div className="flex justify-between items-baseline">
        <span className="display text-xl">{med.name.toUpperCase()}</span>
        <span className="text-xs uppercase text-muted-foreground">{med.kind}</span>
      </div>
      <p className="text-xs text-muted-foreground">{med.protocol}</p>
      {last && (
        <p className="text-xs">
          Last: <span className="tabular-nums">{last.dose}</span>
          {last.site ? ` @ ${last.site}` : ""} · {new Date(last.takenAt).toLocaleDateString()}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="dose taken" value={dose} onChange={(e) => setDose(e.target.value)}
          className="h-11" />
        <Input placeholder="site (e.g. L abdomen)" value={site} onChange={(e) => setSite(e.target.value)}
          className="h-11" />
      </div>
      <Button disabled={!dose}
        onClick={async () => { await logDose({ medicationId: med._id, dose, site: site || undefined }); setDose(""); setSite(""); }}>
        LOG DOSE
      </Button>
    </div>
  );
}

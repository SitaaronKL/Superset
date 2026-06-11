"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 bg-black text-white">
      <h1 className="display text-6xl leading-none mb-2">
        SUPER<span style={{ color: "var(--accent-user)" }}>SET</span>
      </h1>
      <p className="text-sm text-neutral-400 mb-10">No excuses. Log, lift, progress.</p>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          try {
            await signIn("password", formData);
          } catch {
            setError(flow === "signIn" ? "Wrong email or password." : "Could not create account.");
            setBusy(false);
          }
        }}
      >
        <Input name="email" type="email" placeholder="email" required autoComplete="email"
          className="h-12 border-2 border-white bg-black text-white placeholder:text-neutral-500" />
        <Input name="password" type="password" placeholder="password" required
          autoComplete={flow === "signIn" ? "current-password" : "new-password"}
          className="h-12 border-2 border-white bg-black text-white placeholder:text-neutral-500" />
        <Button type="submit" disabled={busy}
          className="h-12 display text-lg bg-white text-black hover:bg-neutral-200">
          {busy ? "..." : flow === "signIn" ? "ENTER" : "CREATE ACCOUNT"}
        </Button>
        {error && <p className="text-sm" style={{ color: "var(--accent-user)" }}>{error}</p>}
        <button type="button" className="mt-4 text-xs text-neutral-500 underline self-start"
          onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}>
          {flow === "signIn" ? "First time? Create the account" : "Already set up? Sign in"}
        </button>
      </form>
    </main>
  );
}

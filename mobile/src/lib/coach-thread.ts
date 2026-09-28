import { useSyncExternalStore } from "react";
import type { Id } from "../../../convex/_generated/dataModel";

// Which coach chat is open. `null` is a fresh "New chat" that becomes a real
// thread on its first message. Shared by the Coach tab and the chats sidebar.

type ThreadId = Id<"chatThreads">;
let current: ThreadId | null = null;
const listeners = new Set<() => void>();

export function setCurrentThread(id: ThreadId | null) {
  if (id === current) return;
  current = id;
  for (const l of listeners) l();
}

export function useCurrentThread(): ThreadId | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

import { Alert, Share } from "react-native";
import { useConvex, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { setCurrentThread } from "@/lib/coach-thread";
import { success, warning } from "@/lib/haptics";

type Thread = Pick<Doc<"chatThreads">, "_id" | "title" | "pinned" | "archived">;

/**
 * The ChatGPT chat actions, shared by the in-chat menu and the chats list.
 * Rename uses the native iOS text prompt; delete confirms with a native alert.
 */
export function useChatActions(currentId: Thread["_id"] | null) {
  const convex = useConvex();
  const rename = useMutation(api.coach.renameThread);
  const setPinned = useMutation(api.coach.setPinned);
  const setArchived = useMutation(api.coach.setArchived);
  const del = useMutation(api.coach.deleteThread);

  const leaveIfOpen = (id: Thread["_id"]) => {
    if (id === currentId) setCurrentThread(null);
  };

  return {
    rename(thread: Thread) {
      Alert.prompt(
        "Rename chat",
        undefined,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: (value?: string) => {
              if (value?.trim()) void rename({ threadId: thread._id, title: value });
            },
          },
        ],
        "plain-text",
        thread.title,
      );
    },
    togglePin(thread: Thread) {
      success();
      void setPinned({ threadId: thread._id, pinned: !thread.pinned });
    },
    archive(thread: Thread) {
      success();
      leaveIfOpen(thread._id);
      void setArchived({ threadId: thread._id, archived: true });
    },
    unarchive(thread: Thread) {
      success();
      void setArchived({ threadId: thread._id, archived: false });
    },
    remove(thread: Thread) {
      warning();
      Alert.alert("Delete chat?", `"${thread.title}" and every message in it will be deleted. This can't be undone.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            leaveIfOpen(thread._id);
            void del({ threadId: thread._id });
          },
        },
      ]);
    },
    async share(thread: Thread) {
      const messages = await convex.query(api.coach.history, { threadId: thread._id });
      const body = messages
        .map((m) => `${m.role === "user" ? "You" : "Coach"}: ${m.content}`)
        .join("\n\n");
      await Share.share({ title: thread.title, message: `${thread.title}\n\n${body}` });
    },
  };
}

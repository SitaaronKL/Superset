import { useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Host } from "@expo/ui";
import { Button, ContextMenu, RNHostView } from "@expo/ui/swift-ui";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useChatActions } from "@/components/coach/chat-actions";
import { FloatingAction, GlassPill, IconButton, Skeleton, T } from "@/components/ui/kit";
import { setCurrentThread, useCurrentThread } from "@/lib/coach-thread";
import { tap } from "@/lib/haptics";
import { gap, sf, space, squircle, type, useTheme } from "@/lib/theme";

// ChatGPT's sidebar for Coach: search, pinned chats, then chats grouped by
// recency. Tap opens a chat; long-press for rename, pin, archive, delete.

type Thread = Doc<"chatThreads">;

const DAY = 86_400_000;

function groupLabel(updatedAt: number, now: Date): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (updatedAt >= startOfToday) return "Today";
  if (updatedAt >= startOfToday - DAY) return "Yesterday";
  if (updatedAt >= startOfToday - 7 * DAY) return "Previous 7 Days";
  if (updatedAt >= startOfToday - 30 * DAY) return "Previous 30 Days";
  const d = new Date(updatedAt);
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, sameYear ? { month: "long" } : { month: "long", year: "numeric" });
}

export default function ChatsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const current = useCurrentThread();
  const [search, setSearch] = useState("");
  const threads = useQuery(api.coach.threads, { search: search.trim() || undefined });
  const actions = useChatActions(current);

  const sections = useMemo(() => {
    if (!threads) return [];
    const now = new Date();
    const out: { label: string; items: Thread[] }[] = [];
    const pinned = threads.filter((th) => th.pinned);
    if (pinned.length) out.push({ label: "Pinned", items: pinned });
    for (const th of threads.filter((x) => !x.pinned)) {
      const label = groupLabel(th.updatedAt, now);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(th);
      else out.push({ label, items: [th] });
    }
    return out;
  }, [threads]);

  const open = (id: Thread["_id"] | null) => {
    tap();
    setCurrentThread(id);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingTop: insets.top + space[8],
          paddingBottom: insets.bottom + 96,
          paddingHorizontal: gap.screen,
          gap: gap.group,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
          <T variant="title">Chats</T>
          <GlassPill>
            <IconButton name="xmark" accessibilityLabel="Close" onPress={() => router.back()} />
          </GlassPill>
        </View>

        {/* Pill search field, like ChatGPT's sidebar. */}
        <View
          style={{
            flexDirection: "row", alignItems: "center", gap: space[8], height: 40,
            borderRadius: 20, ...squircle, backgroundColor: t.elevated, paddingHorizontal: space[12],
          }}
        >
          <SymbolView name="magnifyingglass" size={16} tintColor={t.secondaryLabel} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search chats"
            placeholderTextColor={t.tertiaryLabel}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            style={{ flex: 1, color: t.label, fontSize: type.body.fontSize, ...sf.regular }}
          />
        </View>

        {threads === undefined ? (
          <View style={{ gap: space[16], marginTop: space[8] }}>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} width={`${70 - i * 10}%`} height={type.body.fontSize} />)}
          </View>
        ) : sections.length === 0 ? (
          <T variant="subhead" style={{ textAlign: "center", marginTop: space[40] }}>
            {search.trim() ? "No chats match that search." : "Once you start chatting, your conversations will appear here."}
          </T>
        ) : (
          sections.map((section) => (
            <View key={section.label} style={{ gap: space[4] }}>
              <T variant="headline" style={{ marginTop: space[8], marginBottom: space[4] }}>{section.label}</T>
              {section.items.map((th) => (
                <ChatRow
                  key={th._id}
                  thread={th}
                  selected={th._id === current}
                  onOpen={() => open(th._id)}
                  actions={actions}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <FloatingAction icon="square.and.pencil" label="Chat" accessibilityLabel="New chat" onPress={() => open(null)} bottom={insets.bottom + space[16]} />
    </View>
  );
}

function ChatRow({ thread, selected, onOpen, actions }: {
  thread: Thread;
  selected: boolean;
  onOpen: () => void;
  actions: ReturnType<typeof useChatActions>;
}) {
  const t = useTheme();
  return (
    <Host matchContents={{ vertical: true }} colorScheme={t.scheme}>
      <ContextMenu>
        <ContextMenu.Trigger>
          <RNHostView matchContents>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={thread.title}
              onPress={onOpen}
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center", gap: space[8],
                minHeight: 44, paddingHorizontal: space[12], marginHorizontal: -space[12],
                borderRadius: 12, ...squircle,
                backgroundColor: selected || pressed ? t.elevated : "transparent",
              })}
            >
              <T variant="body" numberOfLines={1} style={{ flex: 1 }}>{thread.title}</T>
              {thread.pinned ? <SymbolView name="pin.fill" size={13} tintColor={t.tertiaryLabel} /> : null}
            </Pressable>
          </RNHostView>
        </ContextMenu.Trigger>
        <ContextMenu.Items>
          <Button label="Share" systemImage="square.and.arrow.up" onPress={() => void actions.share(thread)} />
          <Button label="Rename" systemImage="pencil" onPress={() => actions.rename(thread)} />
          <Button label={thread.pinned ? "Unpin" : "Pin"} systemImage={thread.pinned ? "pin.slash" : "pin"} onPress={() => actions.togglePin(thread)} />
          <Button label="Archive" systemImage="archivebox" onPress={() => actions.archive(thread)} />
          <Button label="Delete" systemImage="trash" role="destructive" onPress={() => actions.remove(thread)} />
        </ContextMenu.Items>
      </ContextMenu>
    </Host>
  );
}

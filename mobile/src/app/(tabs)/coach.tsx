import { useCallback, useEffect, useMemo, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowUp, Trash2 } from "lucide-react-native";
import {
  AssistantRuntimeProvider,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react-native";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { Body, Display, radius, squircle } from "@/components/ui/kit";
import { fonts, palette, useTheme } from "@/lib/theme";

// The coach chat runs on assistant-ui's React Native primitives. Convex owns
// the transcript (coach.history); the external-store runtime mirrors it and
// hands new user messages to coach.send.

const SUGGESTIONS = [
  "What's on Day 1?",
  "Build me a 10-min morning routine",
  "I slept badly. Adjust today.",
];

// Height of the floating native tab bar the composer has to clear.
const TAB_BAR_CLEARANCE = 14;

const convertMessage = (m: Doc<"chatMessages">): ThreadMessageLike => ({
  id: m._id,
  role: m.role,
  content: m.content,
  createdAt: new Date(m.createdAt),
});

export default function CoachScreen() {
  const messages = useQuery(api.coach.history);
  const send = useAction(api.coach.send);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onNew = useCallback(async (message: { content: readonly { type: string; text?: string }[] }) => {
    const text = message.content
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n")
      .trim();
    if (!text) return;
    setBusy(true); setError(null);
    try { await send({ content: text }); }
    catch { setError("Couldn't reach the coach. Try again."); }
    finally { setBusy(false); }
  }, [send]);

  const runtime = useExternalStoreRuntime({
    messages: messages ?? [],
    isLoading: messages === undefined,
    isRunning: busy,
    convertMessage,
    onNew,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <CoachThread error={error} />
    </AssistantRuntimeProvider>
  );
}

function CoachThread({ error }: { error: string | null }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const clearChat = useMutation(api.coach.clearChat);
  const hasMessages = useAuiState((s) => !s.thread.isEmpty);

  // The native tab bar sits under the content. Clear it while the keyboard is
  // hidden; once the keyboard is up it covers the tab bar, so sit on the keyboard.
  const [keyboardUp, setKeyboardUp] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", () => setKeyboardUp(true));
    const hide = Keyboard.addListener("keyboardWillHide", () => setKeyboardUp(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const composerBottom = keyboardUp ? 8 : insets.bottom + TAB_BAR_CLEARANCE;

  const [composerHeight, setComposerHeight] = useState(120);
  const components = useMemo(() => ({ UserMessage, AssistantMessage }), []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 6 }}>
          <Display size={24}>Coach</Display>
          {hasMessages && (
            <Pressable onPress={() => void clearChat()} accessibilityLabel="Clear chat" style={{ padding: 6 }}>
              <Trash2 size={16} color={t.mutedFg} />
            </Pressable>
          )}
        </View>

        <View style={{ flex: 1 }}>
        <ThreadPrimitive.Root style={{ flex: 1 }}>
          <ThreadPrimitive.MessagesFlatList
            components={components}
            contentContainerStyle={{ padding: 16, paddingBottom: composerHeight + 16, gap: 10, flexGrow: 1 }}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <AuiIf condition={(s) => s.thread.isEmpty}>
                <EmptyState />
              </AuiIf>
            }
            ListFooterComponent={
              <View style={{ gap: 10 }}>
                <AuiIf condition={(s) => s.thread.isRunning}>
                  <View style={{ alignSelf: "flex-start", backgroundColor: t.muted, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 }}>
                    <Body size={14} color={t.mutedFg}>…</Body>
                  </View>
                </AuiIf>
                {error && (
                  <View style={{ alignSelf: "flex-start", backgroundColor: t.destructive + "22", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 }}>
                    <Body size={14} color={t.destructive}>{error}</Body>
                  </View>
                )}
              </View>
            }
          />
        </ThreadPrimitive.Root>

        {/* ChatGPT-style composer: one rounded field, send button inside on the right. */}
        <View
          onLayout={(e) => setComposerHeight(e.nativeEvent.layout.height)}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 28, paddingBottom: composerBottom }}
        >
          <BottomFade />
          <ComposerPrimitive.Root
            style={{
              flexDirection: "row", alignItems: "flex-end", gap: 8,
              backgroundColor: t.card, borderRadius: 26, borderCurve: "continuous",
              borderWidth: 1, borderColor: t.hairline, paddingLeft: 18, paddingRight: 6, paddingVertical: 6,
            }}
          >
            <ComposerPrimitive.Input
              placeholder="Ask anything"
              placeholderTextColor={t.mutedFg}
              multiline
              style={{ flex: 1, minHeight: 40, maxHeight: 120, paddingVertical: 10, color: t.fg, fontSize: 16, fontFamily: fonts.sans }}
            />
            <SendButton />
          </ComposerPrimitive.Root>
        </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SendButton() {
  const t = useTheme();
  const canSend = useAuiState((s) => s.composer.canSend ?? false);
  return (
    <ComposerPrimitive.Send
      accessibilityLabel="Send"
      style={({ pressed }) => ({
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: canSend ? t.fg : t.muted,
        borderWidth: canSend ? 0 : 1, borderColor: t.border,
        alignItems: "center", justifyContent: "center", opacity: pressed ? 0.75 : 1,
      })}
    >
      <ArrowUp size={20} strokeWidth={2.5} color={canSend ? palette.bg : t.mutedFg} />
    </ComposerPrimitive.Send>
  );
}

// Messages fade into the page behind the composer and tab bar instead of
// stopping at a hard black band.
function BottomFade() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="coachFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.bg} stopOpacity={0} />
          <Stop offset="0.45" stopColor={palette.bg} stopOpacity={0.85} />
          <Stop offset="1" stopColor={palette.bg} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#coachFade)" />
    </Svg>
  );
}

function EmptyState() {
  const t = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 12, marginTop: 40, paddingHorizontal: 12 }}>
      <Body color={t.mutedFg} style={{ textAlign: "center" }}>
        Your coach knows your program, history, and goals. Ask anything, or lock in a routine.
      </Body>
      <View style={{ gap: 8, width: "100%", marginTop: 8 }}>
        {SUGGESTIONS.map((s) => (
          <ThreadPrimitive.Suggestion key={s} prompt={s} send
            style={{ borderRadius: radius.control, ...squircle, borderWidth: 1, borderColor: t.border, paddingHorizontal: 16, paddingVertical: 12 }}>
            <Body size={13}>{s}</Body>
          </ThreadPrimitive.Suggestion>
        ))}
      </View>
    </View>
  );
}

function UserMessage() {
  const t = useTheme();
  return (
    <MessagePrimitive.Root style={{ alignSelf: "flex-end", maxWidth: "86%", backgroundColor: t.accent, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 }}>
      <MessagePrimitive.Content renderText={({ part }) => <Body size={14} color={t.accentFg}>{part.text}</Body>} />
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  const t = useTheme();
  return (
    <MessagePrimitive.Root style={{ alignSelf: "flex-start", maxWidth: "86%", backgroundColor: t.muted, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 }}>
      <MessagePrimitive.Content renderText={({ part }) => <Body size={14} color={t.fg}>{part.text}</Body>} />
    </MessagePrimitive.Root>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAction, useMutation, useQuery } from "convex/react";
import { Host } from "@expo/ui";
import { Button, ConfirmationDialog, RNHostView, Text as SwiftText } from "@expo/ui/swift-ui";
import { SymbolView } from "expo-symbols";
import Animated, { useReducedMotion } from "react-native-reanimated";
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
import { Screen, ScreenFades, useScreenInsets } from "@/components/screen";
import { IconButton, ScreenTitle, T, gap, motion, radius, space, squircle, type } from "@/components/ui/kit";
import { fonts, palette, useTheme } from "@/lib/theme";
import { tap, warning } from "@/lib/haptics";
import { todayKey } from "@/lib/day";

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
    try { await send({ content: text, dayKey: todayKey() }); }
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
  const pad = useScreenInsets();
  const hasMessages = useAuiState((s) => !s.thread.isEmpty);

  // The native tab bar sits under the content. Clear it while the keyboard is
  // hidden; once the keyboard is up it covers the tab bar, so sit on the keyboard.
  const [keyboardUp, setKeyboardUp] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", () => setKeyboardUp(true));
    const hide = Keyboard.addListener("keyboardWillHide", () => setKeyboardUp(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const composerBottom = keyboardUp ? gap.row : insets.bottom + TAB_BAR_CLEARANCE;

  const [composerHeight, setComposerHeight] = useState(120);
  const components = useMemo(() => ({ UserMessage, AssistantMessage }), []);

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <ThreadPrimitive.Root style={{ flex: 1 }}>
            <ThreadPrimitive.MessagesFlatList
              components={components}
              contentContainerStyle={{
                paddingHorizontal: gap.screen,
                paddingTop: pad.top,
                paddingBottom: composerHeight + gap.group,
                gap: gap.group,
                flexGrow: 1,
              }}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={<CoachHeader hasMessages={hasMessages} />}
              ListFooterComponent={
                <View style={{ gap: gap.row }}>
                  <AuiIf condition={(s) => s.thread.isRunning}>
                    <TypingDots />
                  </AuiIf>
                  {error ? (
                    <T variant="footnote" color={t.destructive} selectable>
                      {error}
                    </T>
                  ) : null}
                </View>
              }
            />

            <ScreenFades topFade={28} bottom={false} />

            {/* Composer stays above ScreenFades; its own fade covers the tab bar. */}
            <View
              onLayout={(e) => setComposerHeight(e.nativeEvent.layout.height)}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 2,
                paddingHorizontal: gap.screen,
                paddingTop: space[24],
                paddingBottom: composerBottom,
                gap: gap.row,
              }}
            >
              <BottomFade />
              {!hasMessages ? <SuggestionChips /> : null}
              <ComposerPrimitive.Root
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  gap: gap.row,
                  backgroundColor: t.elevated,
                  borderRadius: radius.sheet,
                  ...squircle,
                  paddingLeft: space[16],
                  paddingRight: space[4],
                  paddingVertical: space[4],
                }}
              >
                <ComposerPrimitive.Input
                  placeholder="Ask anything"
                  placeholderTextColor={t.tertiaryLabel}
                  multiline
                  style={{
                    flex: 1,
                    minHeight: 40,
                    maxHeight: 120,
                    paddingVertical: space[8],
                    color: t.label,
                    fontSize: type.body.fontSize,
                    lineHeight: type.body.lineHeight,
                    letterSpacing: type.body.letterSpacing,
                    fontFamily: fonts.sans,
                  }}
                />
                <SendButton />
              </ComposerPrimitive.Root>
            </View>
          </ThreadPrimitive.Root>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function CoachHeader({ hasMessages }: { hasMessages: boolean }) {
  return (
    <View style={{ gap: gap.group, paddingBottom: hasMessages ? space[8] : space[16] }}>
      <ScreenTitle title="Coach" accessory={hasMessages ? <ClearChatButton /> : undefined} />
      {!hasMessages ? (
        <T variant="subhead">
          Your coach knows your program, history, and goals. Ask anything, or lock in a routine.
        </T>
      ) : null}
    </View>
  );
}

function SuggestionChips() {
  const t = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: gap.row, paddingRight: space[8] }}
    >
      {SUGGESTIONS.map((s) => (
        <ThreadPrimitive.Suggestion
          key={s}
          prompt={s}
          send
          onPressIn={() => tap()}
          style={({ pressed }) => ({
            backgroundColor: t.elevated2,
            borderRadius: radius.full,
            paddingHorizontal: space[16],
            paddingVertical: space[8],
            opacity: pressed ? 0.78 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <T variant="caption" color={t.label}>{s}</T>
        </ThreadPrimitive.Suggestion>
      ))}
    </ScrollView>
  );
}

function ClearChatButton() {
  const t = useTheme();
  const clearChat = useMutation(api.coach.clearChat);
  const [open, setOpen] = useState(false);

  return (
    <Host matchContents colorScheme="dark" style={{ width: 40, height: 40 }}>
      <ConfirmationDialog
        title="Clear chat?"
        isPresented={open}
        onIsPresentedChange={setOpen}
        titleVisibility="visible"
      >
        <ConfirmationDialog.Trigger>
          <RNHostView matchContents>
            <IconButton
              name="trash"
              variant="plain"
              color={t.secondaryLabel}
              accessibilityLabel="Clear chat"
              onPress={() => setOpen(true)}
            />
          </RNHostView>
        </ConfirmationDialog.Trigger>
        <ConfirmationDialog.Actions>
          <Button
            role="destructive"
            label="Clear chat"
            onPress={() => {
              warning();
              void clearChat();
            }}
          />
          <Button role="cancel" label="Cancel" />
        </ConfirmationDialog.Actions>
        <ConfirmationDialog.Message>
          <SwiftText>Every message in this conversation will be deleted.</SwiftText>
        </ConfirmationDialog.Message>
      </ConfirmationDialog>
    </Host>
  );
}

function SendButton() {
  const t = useTheme();
  const canSend = useAuiState((s) => s.composer.canSend ?? false);
  return (
    <ComposerPrimitive.Send
      accessibilityLabel="Send"
      onPressIn={() => { if (canSend) tap(); }}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: canSend ? t.label : t.elevated2,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.78 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <SymbolView
        name="arrow.up"
        size={18}
        tintColor={canSend ? palette.bg : t.tertiaryLabel}
        weight="semibold"
        resizeMode="scaleAspectFit"
      />
    </ComposerPrimitive.Send>
  );
}

function TypingDots() {
  const t = useTheme();
  const reduced = useReducedMotion();
  return (
    <View
      accessibilityLabel="Coach is typing"
      style={{ flexDirection: "row", alignItems: "center", gap: space[8], paddingVertical: space[8] }}
    >
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={{
            width: space[8],
            height: space[8],
            borderRadius: space[8] / 2,
            backgroundColor: t.secondaryLabel,
            opacity: reduced ? 0.45 : 0.3,
            ...(reduced
              ? {}
              : {
                  animationName: {
                    from: { opacity: 0.28 },
                    to: { opacity: 0.92 },
                  },
                  animationDuration: motion.duration.slow,
                  animationDelay: i * 140,
                  animationIterationCount: "infinite" as const,
                  animationDirection: "alternate" as const,
                  animationTimingFunction: "ease-in-out" as const,
                }),
          }}
        />
      ))}
    </View>
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

function UserMessage() {
  const t = useTheme();
  return (
    <MessagePrimitive.Root
      style={{
        alignSelf: "flex-end",
        maxWidth: "80%",
        backgroundColor: t.accent,
        borderRadius: radius.card,
        ...squircle,
        paddingHorizontal: space[16],
        paddingVertical: space[8],
      }}
    >
      <MessagePrimitive.Content
        renderText={({ part }) => (
          <T variant="callout" color={t.accentFg} selectable>{part.text}</T>
        )}
      />
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root style={{ alignSelf: "stretch" }}>
      <MessagePrimitive.Content
        renderText={({ part }) => <MarkdownText text={part.text} />}
      />
    </MessagePrimitive.Root>
  );
}

// Tiny markdown: paragraphs, nested numbered/bulleted lists, and **bold**. No extra deps.
type MdItem = { marker: string; text: string; depth: number; ordered: boolean };
type MdBlock = { kind: "p"; text: string } | { kind: "list"; items: MdItem[] };

const LIST_RE = /^(\s*)(?:([-*\u2022])|(\d+)[.)])\s+(.*)$/;

function parseMarkdown(src: string): MdBlock[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let para: string[] = [];

  const flushPara = () => {
    const text = para.join("\n").trim();
    para = [];
    if (text) blocks.push({ kind: "p", text });
  };

  for (const line of lines) {
    const m = line.match(LIST_RE);
    if (m) {
      flushPara();
      const indent = (m[1] ?? "").replace(/\t/g, "  ").length;
      const ordered = m[3] !== undefined;
      const last = blocks[blocks.length - 1];
      const list = last?.kind === "list" ? last : null;
      // A bullet directly under a numbered item nests even without indentation.
      const underNumber = !ordered && list && list.items.some((i) => i.ordered && i.depth === 0);
      const depth = indent >= 2 || underNumber ? 1 : 0;
      const item: MdItem = { marker: ordered ? `${m[3]}.` : "\u2022", text: m[4] ?? "", depth, ordered };
      if (list) list.items.push(item);
      else blocks.push({ kind: "list", items: [item] });
    } else if (line.trim() === "") {
      // A blank line between list items keeps the list together.
      const last = blocks[blocks.length - 1];
      if (last?.kind !== "list") flushPara();
    } else {
      para.push(line);
    }
  }
  flushPara();
  return blocks;
}

function Inline({ text, color }: { text: string; color: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text selectable style={{ color, ...type.body }}>
      {parts.map((p, i) => {
        const bold = /^\*\*([^*]+)\*\*$/.exec(p);
        if (bold) {
          return (
            <Text key={i} style={{ fontFamily: fonts.sansSemiBold }}>
              {bold[1]}
            </Text>
          );
        }
        return <Text key={i}>{p}</Text>;
      })}
    </Text>
  );
}

function MarkdownText({ text }: { text: string }) {
  const t = useTheme();
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  return (
    <View style={{ gap: space[12] }}>
      {blocks.map((b, i) => {
        if (b.kind === "p") return <Inline key={i} text={b.text} color={t.label} />;
        return (
          <View key={i} style={{ gap: space[4] }}>
            {b.items.map((item, j) => {
              const sub = item.depth > 0;
              // Breathing room before each new top-level item after the first.
              const top = !sub && j > 0 ? space[8] : 0;
              return (
                <View key={j} style={{ flexDirection: "row", gap: space[8], alignItems: "flex-start", marginLeft: sub ? space[24] : 0, marginTop: top }}>
                  <Text style={{ color: t.secondaryLabel, ...(sub ? type.subhead : type.body), minWidth: sub ? space[12] : space[20], fontFamily: item.ordered ? fonts.mono : fonts.sans }}>
                    {item.marker}
                  </Text>
                  <View style={{ flex: 1 }}>
                    {sub ? <SubInline text={item.text} color={t.secondaryLabel} /> : <Inline text={item.text} color={t.label} />}
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

function SubInline({ text, color }: { text: string; color: string }) {
  return <Text selectable style={{ color, ...type.subhead }}>{text.replace(/\*\*/g, "")}</Text>;
}

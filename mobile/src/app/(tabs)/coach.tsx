import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { SymbolView, type SFSymbol } from "expo-symbols";
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
import { GlassPill, IconButton, T, gap, motion, space, squircle, type } from "@/components/ui/kit";
import { SuggestionCard } from "@/components/ui/suggestion-card";
import { sf, useTheme } from "@/lib/theme";
import { tap, warning } from "@/lib/haptics";
import { todayKey } from "@/lib/day";

// The coach chat runs on assistant-ui's React Native primitives. Convex owns
// the transcript (coach.history); the external-store runtime mirrors it and
// hands new user messages to coach.send.

const SUGGESTIONS = [
  {
    title: "What's on Day 1?",
    subtitle: "See today's session and how it fits the week.",
    prompt: "What's on Day 1?",
  },
  {
    title: "Morning routine",
    subtitle: "Build a 10-minute start you will actually keep.",
    prompt: "Build me a 10-min morning routine",
  },
  {
    title: "I slept badly",
    subtitle: "Adjust today so you still get the work in.",
    prompt: "I slept badly. Adjust today.",
  },
];

// Height of the floating native tab bar the composer has to clear.
const TAB_BAR_CLEARANCE = 14;
// Overlay chrome is a 40pt row of glass controls under the status bar.
const CHROME_ROW = 40;

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
  const pad = useScreenInsets(CHROME_ROW);
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
              ListFooterComponent={
                <View style={{ gap: gap.row }}>
                  <AuiIf condition={(s) => s.thread.isRunning}>
                    <ThinkingDot />
                  </AuiIf>
                  {error ? (
                    <T variant="footnote" color={t.destructive} selectable>
                      {error}
                    </T>
                  ) : null}
                </View>
              }
            />

            <ScreenFades topFade={CHROME_ROW + space[40]} bottom={false} />

            <CoachChrome hasMessages={hasMessages} />

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
                paddingTop: space[16],
                paddingBottom: composerBottom,
                gap: gap.row,
              }}
            >
              <BottomFade />
              {!hasMessages ? <SuggestionRow /> : null}
              <ComposerPrimitive.Root
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  minHeight: 52,
                  backgroundColor: t.elevated,
                  borderRadius: 26,
                  ...squircle,
                  paddingLeft: space[4],
                  paddingRight: space[8],
                  paddingVertical: space[8],
                  gap: space[4],
                }}
              >
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={{
                    width: 36,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <SymbolView
                    name="plus"
                    size={22}
                    tintColor={t.label}
                    weight="regular"
                    resizeMode="scaleAspectFit"
                  />
                </View>
                <ComposerPrimitive.Input
                  placeholder="Ask anything"
                  placeholderTextColor={t.tertiaryLabel}
                  multiline
                  style={{
                    flex: 1,
                    minHeight: 36,
                    maxHeight: 120,
                    paddingVertical: 7,
                    color: t.label,
                    fontSize: type.body.fontSize,
                    lineHeight: type.body.lineHeight,
                    letterSpacing: type.body.letterSpacing,
                    ...sf.regular,
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

function CoachChrome({ hasMessages }: { hasMessages: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 3,
        paddingTop: insets.top,
        paddingHorizontal: gap.screen,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <IconButton
        name="line.3.horizontal"
        variant="glass"
        accessibilityLabel="Menu"
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: insets.top,
          height: CHROME_ROW,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <T variant="headline">Coach</T>
      </View>
      <GlassPill>
        <NewChatButton hasMessages={hasMessages} />
      </GlassPill>
    </View>
  );
}

function SuggestionRow() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={{ marginHorizontal: -gap.screen }}
      contentContainerStyle={{ gap: gap.row, paddingHorizontal: gap.screen }}
    >
      {SUGGESTIONS.map((s) => (
        <ThreadPrimitive.Suggestion
          key={s.prompt}
          prompt={s.prompt}
          send
          onPressIn={() => tap()}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <SuggestionCard title={s.title} subtitle={s.subtitle} />
        </ThreadPrimitive.Suggestion>
      ))}
    </ScrollView>
  );
}

function NewChatButton({ hasMessages }: { hasMessages: boolean }) {
  const t = useTheme();
  const clearChat = useMutation(api.coach.clearChat);
  const [open, setOpen] = useState(false);

  const button = (
    <IconButton
      name="square.and.pencil"
      variant="plain"
      color={t.label}
      accessibilityLabel="New chat"
      onPress={hasMessages ? () => setOpen(true) : undefined}
    />
  );

  if (!hasMessages) return button;

  return (
    <Host matchContents colorScheme={t.scheme} style={{ width: 40, height: 40 }}>
      <ConfirmationDialog
        title="Clear chat?"
        isPresented={open}
        onIsPresentedChange={setOpen}
        titleVisibility="visible"
      >
        <ConfirmationDialog.Trigger>
          <RNHostView matchContents>
            {button}
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
  if (!canSend) return null;
  return (
    <ComposerPrimitive.Send
      accessibilityLabel="Send"
      onPressIn={() => tap()}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: t.label,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.78 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <SymbolView
        name="arrow.up"
        size={16}
        tintColor={t.bg}
        weight="semibold"
        resizeMode="scaleAspectFit"
      />
    </ComposerPrimitive.Send>
  );
}

function ThinkingDot() {
  const t = useTheme();
  const reduced = useReducedMotion();
  return (
    <View
      accessibilityLabel="Coach is thinking"
      style={{ paddingVertical: space[8] }}
    >
      <Animated.View
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
                animationIterationCount: "infinite" as const,
                animationDirection: "alternate" as const,
                animationTimingFunction: "ease-in-out" as const,
              }),
        }}
      />
    </View>
  );
}

// Messages fade into the page behind the composer and tab bar instead of
// stopping at a hard black band.
function BottomFade() {
  const t = useTheme();
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="coachFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={t.bg} stopOpacity={0} />
          <Stop offset="0.45" stopColor={t.bg} stopOpacity={0.85} />
          <Stop offset="1" stopColor={t.bg} stopOpacity={1} />
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
        backgroundColor: t.elevated2,
        borderRadius: 20,
        ...squircle,
        paddingHorizontal: space[16],
        paddingVertical: space[12],
      }}
    >
      <MessagePrimitive.Content
        renderText={({ part }) => (
          <T variant="body" color={t.label} selectable>{part.text}</T>
        )}
      />
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root style={{ alignSelf: "stretch", gap: space[12] }}>
      <MessagePrimitive.Content
        renderText={({ part }) => <MarkdownText text={part.text} />}
      />
      <AssistantActions />
    </MessagePrimitive.Root>
  );
}

function AssistantActions() {
  const t = useTheme();
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space[12] }}>
      <ActionIcon
        name={vote === "up" ? "hand.thumbsup.fill" : "hand.thumbsup"}
        label="Good response"
        color={t.secondaryLabel}
        onPress={() => setVote((v) => (v === "up" ? null : "up"))}
      />
      <ActionIcon
        name={vote === "down" ? "hand.thumbsdown.fill" : "hand.thumbsdown"}
        label="Bad response"
        color={t.secondaryLabel}
        onPress={() => setVote((v) => (v === "down" ? null : "down"))}
      />
    </View>
  );
}

function ActionIcon({
  name,
  label,
  color,
  onPress,
}: {
  name: SFSymbol;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <SymbolView
        name={name}
        size={18}
        tintColor={color}
        weight="regular"
        resizeMode="scaleAspectFit"
      />
    </Pressable>
  );
}

// Tiny markdown: paragraphs, nested numbered/bulleted lists, **bold**, and --- rules.
type MdItem = { marker: string; text: string; depth: number; ordered: boolean };
type MdBlock = { kind: "p"; text: string } | { kind: "list"; items: MdItem[] } | { kind: "hr" };

const LIST_RE = /^(\s*)(?:([-*\u2022])|(\d+)[.)])\s+(.*)$/;
const HR_RE = /^(-{3,}|\*{3,}|_{3,})$/;

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
    if (HR_RE.test(line.trim())) {
      flushPara();
      const last = blocks[blocks.length - 1];
      if (last?.kind !== "hr") blocks.push({ kind: "hr" });
      continue;
    }
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
            <Text key={i} style={{ ...sf.semibold }}>
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
        if (b.kind === "hr") {
          return <Hairline key={i} color={t.separator} />;
        }
        const prev = i > 0 ? blocks[i - 1] : undefined;
        const ruleBefore =
          prev != null &&
          prev.kind !== "hr" &&
          ((prev.kind === "list" && b.kind === "p") ||
            (b.kind === "p" && /^\*\*[^*]+\*\*/.test(b.text.trim())));
        const body =
          b.kind === "p" ? (
            <Inline text={b.text} color={t.label} />
          ) : (
            <View style={{ gap: space[4] }}>
              {b.items.map((item, j) => {
                const sub = item.depth > 0;
                const top = !sub && j > 0 ? space[8] : 0;
                return (
                  <View key={j} style={{ flexDirection: "row", gap: space[8], alignItems: "flex-start", marginLeft: sub ? space[24] : 0, marginTop: top }}>
                    <Text style={{ color: t.secondaryLabel, ...(sub ? type.subhead : type.body), minWidth: sub ? space[12] : space[20], ...(item.ordered ? sf.tabular : sf.regular) }}>
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
        if (!ruleBefore) return <View key={i}>{body}</View>;
        return (
          <View key={i} style={{ gap: space[12] }}>
            <Hairline color={t.separator} />
            {body}
          </View>
        );
      })}
    </View>
  );
}

function Hairline({ color }: { color: string }) {
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: color,
        marginVertical: space[4],
      }}
    />
  );
}

function SubInline({ text, color }: { text: string; color: string }) {
  return <Text selectable style={{ color, ...type.subhead }}>{text.replace(/\*\*/g, "")}</Text>;
}

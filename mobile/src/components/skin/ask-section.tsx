import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { useAction, useMutation, useQuery } from "convex/react";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { Host } from "@expo/ui";
import { Button, ConfirmationDialog, RNHostView, Text as SwiftText } from "@expo/ui/swift-ui";
import { SymbolView } from "expo-symbols";
import { api } from "../../../../convex/_generated/api";
import { SuggestionCard } from "@/components/ui/suggestion-card";
import { T, gap, motion, radius, space, squircle, type } from "@/components/ui/kit";
import { palette, sf, useTheme } from "@/lib/theme";
import { tap } from "@/lib/haptics";

const SUGGESTIONS = [
  { title: "Am I shaving today?", subtitle: "Based on your usual days" },
  { title: "What goes on tonight?", subtitle: "Night steps and actives" },
  { title: "My neck stings, what now?", subtitle: "Calm it without skipping" },
];

export function AskSection({ dayKey }: { dayKey: string }) {
  const t = useTheme();
  const asks = useQuery(api.skin.asks);
  const ask = useAction(api.skin.ask);
  const clearAsks = useMutation(api.skin.clearAsks);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    setText("");
    tap();
    try {
      await ask({ question: q, dayKey });
    } catch {
      setError("Couldn't answer that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const list = asks ?? [];
  const empty = list.length === 0 && !busy;

  return (
    <View style={{ gap: gap.group }}>
      {list.length > 0 ? (
        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
          <Host matchContents colorScheme="dark" style={{ height: 22 }}>
            <ConfirmationDialog
              title="Clear questions?"
              isPresented={clearOpen}
              onIsPresentedChange={setClearOpen}
              titleVisibility="visible"
            >
              <ConfirmationDialog.Trigger>
                <RNHostView matchContents>
                  <Pressable onPress={() => setClearOpen(true)} hitSlop={8}>
                    <T variant="footnote">Clear</T>
                  </Pressable>
                </RNHostView>
              </ConfirmationDialog.Trigger>
              <ConfirmationDialog.Message>
                <SwiftText>This removes the recent Q&A on this tab.</SwiftText>
              </ConfirmationDialog.Message>
              <ConfirmationDialog.Actions>
                <Button label="Keep" role="cancel" />
                <Button label="Clear" role="destructive" onPress={() => void clearAsks()} />
              </ConfirmationDialog.Actions>
            </ConfirmationDialog>
          </Host>
        </View>
      ) : null}

      {list.slice(-6).map((a) => (
        <View key={a._id} style={{ gap: space[12] }}>
          <View
            style={{
              alignSelf: "flex-end",
              maxWidth: "80%",
              backgroundColor: t.elevated2,
              borderRadius: 20,
              ...squircle,
              paddingHorizontal: space[16],
              paddingVertical: space[8],
            }}
          >
            <T variant="body" color={t.label} selectable>{a.question}</T>
          </View>
          <View style={{ alignSelf: "stretch" }}>
            <T variant="body" color={t.label} selectable>{a.answer}</T>
          </View>
        </View>
      ))}

      {busy ? <ThinkingDot /> : null}
      {error ? <T variant="footnote" color={t.destructive} selectable>{error}</T> : null}

      {empty ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: gap.row, paddingRight: space[8] }}
        >
          {SUGGESTIONS.map((s) => (
            <SuggestionCard
              key={s.title}
              title={s.title}
              subtitle={s.subtitle}
              disabled={busy}
              onPress={() => void send(s.title)}
            />
          ))}
        </ScrollView>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: t.elevated,
          borderRadius: radius.sheet,
          ...squircle,
          minHeight: 52,
          paddingLeft: space[16],
          paddingRight: space[8],
          paddingVertical: space[4],
          gap: space[8],
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Ask anything"
          placeholderTextColor={t.tertiaryLabel}
          returnKeyType="send"
          onSubmitEditing={() => void send(text)}
          editable={!busy}
          style={{
            flex: 1,
            minHeight: 40,
            paddingVertical: space[8],
            color: t.label,
            fontSize: type.body.fontSize,
            lineHeight: type.body.lineHeight,
            letterSpacing: type.body.letterSpacing,
            ...sf.regular,
          }}
        />
        {text.trim() ? (
          <Pressable
            accessibilityLabel="Send"
            disabled={busy}
            onPress={() => void send(text)}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: t.label,
              alignItems: "center",
              justifyContent: "center",
              opacity: busy ? 0.35 : pressed ? 0.78 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <SymbolView name="arrow.up" tintColor={palette.bg} weight="semibold" size={16} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function ThinkingDot() {
  const t = useTheme();
  const reduced = useReducedMotion();
  return (
    <View
      accessibilityLabel="Thinking"
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: space[8] }}
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

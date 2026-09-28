import { useState } from "react";
import { Pressable, View } from "react-native";
import { useAction, useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { Host } from "@expo/ui";
import { Button, ConfirmationDialog, RNHostView, Text as SwiftText } from "@expo/ui/swift-ui";
import { SymbolView } from "expo-symbols";
import { api } from "../../../../convex/_generated/api";
import { Body, Eyebrow, Field } from "@/components/ui/kit";
import { useTheme } from "@/lib/theme";
import { Group } from "./group";

const CHIPS = [
  "Am I shaving today?",
  "What goes on tonight?",
  "My neck stings, what now?",
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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await ask({ question: q, dayKey });
    } catch {
      setError("Couldn't answer that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const list = asks ?? [];

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", paddingHorizontal: 4 }}>
        <Eyebrow style={{ flex: 1 }}>Ask</Eyebrow>
        {list.length > 0 && (
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
                    <Body size={13} color={t.mutedFg}>Clear</Body>
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
        )}
      </View>

      <Group style={{ padding: 12, gap: 10, overflow: "visible" }}>
        {list.slice(-6).map((a) => (
          <View key={a._id} style={{ gap: 6 }}>
            <View style={{ alignSelf: "flex-end", maxWidth: "88%", backgroundColor: t.accentTint, borderRadius: 18, borderCurve: "continuous", paddingHorizontal: 12, paddingVertical: 8 }}>
              <Body size={15}>{a.question}</Body>
            </View>
            <View style={{ alignSelf: "flex-start", maxWidth: "88%", backgroundColor: t.muted, borderRadius: 18, borderCurve: "continuous", paddingHorizontal: 12, paddingVertical: 8 }}>
              <Body size={15} color={t.mutedFg}>{a.answer}</Body>
            </View>
          </View>
        ))}
        {busy && (
          <View style={{ alignSelf: "flex-start", backgroundColor: t.muted, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Body size={15} color={t.mutedFg}>Thinking…</Body>
          </View>
        )}
        {error && <Body size={13} color={t.destructive}>{error}</Body>}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {CHIPS.map((c) => (
            <Pressable
              key={c}
              onPress={() => void send(c)}
              disabled={busy}
              style={({ pressed }) => ({
                borderRadius: 16,
                borderCurve: "continuous",
                backgroundColor: t.muted,
                paddingHorizontal: 12,
                paddingVertical: 8,
                opacity: pressed || busy ? 0.6 : 1,
              })}
            >
              <Body size={13} color={t.mutedFg}>{c}</Body>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Field
            value={text}
            onChangeText={setText}
            placeholder="Ask about your skin"
            returnKeyType="send"
            onSubmitEditing={() => void send(text)}
            editable={!busy}
            style={{ flex: 1 }}
          />
          <Pressable
            accessibilityLabel="Send"
            disabled={!text.trim() || busy}
            onPress={() => void send(text)}
            style={({ pressed }) => ({
              width: 44, height: 44, borderRadius: 22, backgroundColor: t.fg,
              alignItems: "center", justifyContent: "center",
              opacity: !text.trim() || busy ? 0.35 : pressed ? 0.75 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <SymbolView name="arrow.up" tintColor="#000" weight="bold" style={{ width: 16, height: 16 }} />
          </Pressable>
        </View>
      </Group>
    </View>
  );
}

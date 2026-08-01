import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAction, useMutation, useQuery } from "convex/react";
import { Send, Sparkle, Trash2 } from "lucide-react-native";
import { api } from "../../../../convex/_generated/api";
import { Body, Display, Field } from "@/components/ui/kit";
import { palette, useTheme } from "@/lib/theme";

const SUGGESTIONS = [
  "What's on Day 1?",
  "Build me a 10-min morning routine",
  "I slept badly. Adjust today.",
];

export default function CoachScreen() {
  const t = useTheme();
  const messages = useQuery(api.coach.history);
  const send = useAction(api.coach.send);
  const clearChat = useMutation(api.coach.clearChat);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, busy]);

  const submit = async (content: string) => {
    if (!content.trim() || busy) return;
    setText(""); setBusy(true); setError(null);
    try { await send({ content: content.trim() }); }
    catch { setError("Couldn't reach the coach. Tap to retry."); setText(content.trim()); }
    finally { setBusy(false); }
  };

  const empty = messages !== undefined && messages.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 6 }}>
          <Display size={24}>Coach</Display>
          {messages && messages.length > 0 && (
            <Pressable onPress={() => void clearChat()} accessibilityLabel="Clear chat" style={{ padding: 6 }}>
              <Trash2 size={16} color={t.mutedFg} />
            </Pressable>
          )}
        </View>

        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
          {empty && (
            <View style={{ alignItems: "center", gap: 12, marginTop: 40, paddingHorizontal: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.muted, alignItems: "center", justifyContent: "center" }}>
                <Sparkle size={22} color={t.fg} />
              </View>
              <Body color={t.mutedFg} style={{ textAlign: "center" }}>
                Your coach knows your program, history, and goals. Ask anything, or lock in a routine.
              </Body>
              <View style={{ gap: 8, width: "100%", marginTop: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <Pressable key={s} onPress={() => void submit(s)}
                    style={{ borderRadius: 999, borderWidth: 1, borderColor: t.border, paddingHorizontal: 16, paddingVertical: 12 }}>
                    <Body size={13}>{s}</Body>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {messages?.map((m) => (
            <View key={m._id} style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "86%",
              backgroundColor: m.role === "user" ? t.accent : t.muted,
              borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
            }}>
              <Body size={14} color={m.role === "user" ? t.accentFg : t.fg}>{m.content}</Body>
            </View>
          ))}
          {busy && (
            <View style={{ alignSelf: "flex-start", backgroundColor: t.muted, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 }}>
              <Body size={14} color={t.mutedFg}>…</Body>
            </View>
          )}
          {error && (
            <Pressable onPress={() => void submit(text)}
              style={{ alignSelf: "flex-start", backgroundColor: t.destructive + "22", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 }}>
              <Body size={14} color={t.destructive}>{error}</Body>
            </Pressable>
          )}
          <View style={{ height: 60 }} />
        </ScrollView>

        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8, alignItems: "center" }}>
          <Field value={text} onChangeText={setText} placeholder="Ask your coach…"
            style={{ flex: 1 }} onSubmitEditing={() => void submit(text)} returnKeyType="send" />
          <Pressable onPress={() => void submit(text)} disabled={!text.trim() || busy} accessibilityLabel="Send"
            style={{
              width: 44, height: 44, borderRadius: 22, backgroundColor: t.accent,
              alignItems: "center", justifyContent: "center", opacity: !text.trim() || busy ? 0.4 : 1,
            }}>
            <Send size={18} color={t.accentFg} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

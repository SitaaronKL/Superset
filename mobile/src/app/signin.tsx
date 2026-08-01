import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Redirect } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Body, Display, Field, Pill } from "@/components/ui/kit";
import { fonts, useTheme } from "@/lib/theme";

export default function SignIn() {
  const t = useTheme();
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Redirect href="/" />;

  const submit = async () => {
    if (!email.trim() || !password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn("password", { email: email.trim(), password, flow });
    } catch {
      setError(flow === "signIn" ? "Wrong email or password." : "Could not create account.");
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 12 }}
      >
        <View style={{ flexDirection: "row", marginBottom: 4 }}>
          <Display size={54}>Super</Display>
          <Display size={54} color={t.accent}>set</Display>
        </View>
        <Body color={t.mutedFg} style={{ marginBottom: 24 }}>No excuses. Log, lift, progress.</Body>

        <Field value={email} onChangeText={setEmail} placeholder="email" autoCapitalize="none"
          keyboardType="email-address" autoComplete="email" style={{ height: 50 }} />
        <Field value={password} onChangeText={setPassword} placeholder="password" secureTextEntry
          style={{ height: 50 }} onSubmitEditing={submit} />
        <Pill label={busy ? "..." : flow === "signIn" ? "ENTER" : "CREATE ACCOUNT"}
          onPress={submit} disabled={busy} style={{ height: 50, marginTop: 4 }} />
        {error && <Body color={t.destructive}>{error}</Body>}

        <Text
          onPress={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          style={{ color: t.mutedFg, fontFamily: fonts.sans, fontSize: 13, textDecorationLine: "underline", marginTop: 16 }}
        >
          {flow === "signIn" ? "First time? Create the account" : "Already set up? Sign in"}
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

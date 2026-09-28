import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Redirect } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/screen";
import { Display, Field, Pill, T, gap, space } from "@/components/ui/kit";
import { tap } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";

export default function SignIn() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
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
    <Screen>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: gap.screen,
            paddingTop: insets.top + space[24],
            paddingBottom: insets.bottom + space[24],
            gap: gap.group,
          }}
        >
          <View>
            <View style={{ flexDirection: "row" }}>
              {/* optical: hero wordmark, above the 34 title step */}
              <Display size={48}>Super</Display>
              <Display size={48} color={t.accent}>set</Display>
            </View>
            <T variant="subhead" style={{ marginTop: space[8] }}>
              No excuses. Log, lift, progress.
            </T>
          </View>

          <View style={{ gap: gap.row, marginTop: space[8] }}>
            <Field
              value={email}
              onChangeText={setEmail}
              placeholder="email"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              autoCorrect={false}
              returnKeyType="next"
            />
            <Field
              value={password}
              onChangeText={setPassword}
              placeholder="password"
              secureTextEntry
              textContentType={flow === "signIn" ? "password" : "newPassword"}
              onSubmitEditing={submit}
              returnKeyType="go"
            />
          </View>

          <Pill
            label={busy ? "..." : flow === "signIn" ? "ENTER" : "CREATE ACCOUNT"}
            onPress={submit}
            disabled={busy}
          />

          {error ? <T variant="footnote" color={t.destructive}>{error}</T> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={flow === "signIn" ? "Create the account" : "Sign in"}
            hitSlop={8}
            onPress={() => {
              tap();
              setFlow(flow === "signIn" ? "signUp" : "signIn");
            }}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              minHeight: 44,
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <T variant="footnote">
              {flow === "signIn" ? "First time? Create the account" : "Already set up? Sign in"}
            </T>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

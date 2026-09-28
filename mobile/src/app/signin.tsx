import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Redirect } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";
import { Screen, ScreenFades, useScreenInsets } from "@/components/screen";
import { Display, T, gap, space, type } from "@/components/ui/kit";
import { SignInField } from "@/components/ui/signin-field";
import { tap } from "@/lib/haptics";
import { sf, useTheme } from "@/lib/theme";

export default function SignIn() {
  const t = useTheme();
  const pad = useScreenInsets(0, { tabBar: false });
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Redirect href="/" />;

  const valid = email.trim().length > 0 && password.length > 0;
  const canSubmit = valid && !busy;

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
            paddingHorizontal: gap.screen,
            paddingTop: pad.top + space[24],
            paddingBottom: pad.bottom,
            gap: gap.group,
          }}
        >
          <View style={{ alignItems: "center", gap: space[8], paddingBottom: space[8] }}>
            <Display size={type.title.fontSize}>Superset</Display>
            <T
              variant="title2"
              color={t.label}
              style={{ ...sf.regular, textAlign: "center" }}
            >
              Log in or sign up
            </T>
            <T variant="subhead" style={{ textAlign: "center" }}>
              {flow === "signIn"
                ? "Use your email and password to continue."
                : "Create an account with your email and password."}
            </T>
          </View>

          <View style={{ gap: gap.row }}>
            <SignInField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              autoCorrect={false}
              returnKeyType="next"
            />
            <SignInField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={flow === "signIn" ? "password" : "newPassword"}
              onSubmitEditing={() => { void submit(); }}
              returnKeyType="go"
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue"
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            onPress={() => {
              tap();
              void submit();
            }}
            style={({ pressed }) => ({
              // ChatGPT login Continue is a 50pt capsule, taller than kit Pill.
              height: 50,
              borderRadius: 25,
              backgroundColor: valid ? t.label : t.elevated2,
              alignItems: "center",
              justifyContent: "center",
              opacity: busy ? 0.6 : pressed ? 0.78 : 1,
            })}
          >
            <T variant="headline" color={valid ? "#000000" : t.tertiaryLabel}>
              Continue
            </T>
          </Pressable>

          {error ? (
            <T variant="footnote" color={t.destructive} style={{ textAlign: "center" }}>{error}</T>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={flow === "signIn" ? "Create the account" : "Sign in"}
            hitSlop={8}
            onPress={() => {
              tap();
              setFlow(flow === "signIn" ? "signUp" : "signIn");
            }}
            style={({ pressed }) => ({
              alignSelf: "center",
              minHeight: 44,
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <T variant="footnote" style={{ textAlign: "center" }}>
              {flow === "signIn" ? "Need an account? " : "Already have an account? "}
              <T variant="footnote" color={t.label} style={{ textDecorationLine: "underline" }}>
                {flow === "signIn" ? "Create one" : "Sign in"}
              </T>
            </T>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <ScreenFades bottom={false} />
    </Screen>
  );
}

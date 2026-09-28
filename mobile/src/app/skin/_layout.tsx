import { Stack } from "expo-router/stack";
import { sf, useTheme } from "@/lib/theme";

export default function SkinStack() {
  const t = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: t.bg },
        headerTintColor: t.fg,
        headerShadowVisible: false,
        headerTitleStyle: { ...sf.semibold, fontSize: 17, color: t.fg },
        contentStyle: { backgroundColor: t.bg },
      }}
    >
      <Stack.Screen name="routine" options={{ title: "My routine", headerBackTitle: "Skin" }} />
    </Stack>
  );
}

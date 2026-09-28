import { Stack } from "expo-router/stack";
import { sf, palette } from "@/lib/theme";

export default function SkinStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: palette.bg },
        headerTintColor: palette.fg,
        headerShadowVisible: false,
        headerTitleStyle: { ...sf.semibold, fontSize: 17, color: palette.fg },
        contentStyle: { backgroundColor: palette.bg },
      }}
    >
      <Stack.Screen name="routine" options={{ title: "My routine", headerBackTitle: "Skin" }} />
    </Stack>
  );
}

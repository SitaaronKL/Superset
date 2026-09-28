import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import * as SecureStore from "expo-secure-store";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View } from "react-native";
import { ThemeProvider, radius, useTheme } from "@/lib/theme";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // SF Pro is the system font, so there is nothing to load before first paint.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <ConvexAuthProvider client={convex} storage={secureStorage}>
      <ThemeProvider>
        <ThemedShell />
      </ThemeProvider>
    </ConvexAuthProvider>
  );
}

// Reads the active theme so the page color and status bar follow light/dark.
function ThemedShell() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="signin" />
        <Stack.Screen
          name="settings"
          options={{
            presentation: "formSheet",
            headerShown: false,
            sheetGrabberVisible: true,
            sheetAllowedDetents: [1],
            sheetCornerRadius: radius.sheet,
            contentStyle: { backgroundColor: t.bg },
          }}
        />
        <Stack.Screen name="skin" />
        {/* Coach's chat list slides in from the left, like ChatGPT's sidebar. */}
        <Stack.Screen name="chats" options={{ animation: "slide_from_left", gestureDirection: "horizontal" }} />
      </Stack>
    </View>
  );
}

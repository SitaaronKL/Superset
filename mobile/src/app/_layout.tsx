import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import * as SecureStore from "expo-secure-store";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View } from "react-native";
import { ThemeProvider, palette, radius } from "@/lib/theme";

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
        <View style={{ flex: 1, backgroundColor: palette.bg }}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: palette.bg },
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
                contentStyle: { backgroundColor: palette.bg },
              }}
            />
            <Stack.Screen name="skin" />
          </Stack>
        </View>
      </ThemeProvider>
    </ConvexAuthProvider>
  );
}

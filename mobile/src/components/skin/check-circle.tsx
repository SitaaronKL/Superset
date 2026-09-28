import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { success, tap } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";

// ChatGPT research-plan check: fills white with a black check. Spring + haptic
// on complete. Reduced motion keeps the fill, drops the scale.


export function CheckCircle({ checked, onToggle, label, interactive = true }: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  interactive?: boolean;
}) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.set(checked ? 1 : 0);
      return;
    }
    progress.set(withSpring(checked ? 1 : 0, { duration: 240, dampingRatio: 0.62 }));
  }, [checked, reduced, progress]);

  const fillStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p,
      transform: [{ scale: 0.92 + p * 0.08 }],
    };
  });

  const mark = (
    <Animated.View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: checked ? 0 : 1.5,
        borderColor: t.tertiaryLabel,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: t.label,
          },
          fillStyle,
        ]}
      />
      {checked ? (
        <SymbolView name="checkmark" tintColor={t.inverseLabel} weight="bold" size={12} />
      ) : null}
    </Animated.View>
  );

  if (!interactive) {
    return (
      <View
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}
      >
        {mark}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        if (!checked) success();
        else tap();
        onToggle();
      }}
      style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}
    >
      {mark}
    </Pressable>
  );
}

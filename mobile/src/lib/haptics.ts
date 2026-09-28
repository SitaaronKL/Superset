import * as Haptics from "expo-haptics";

/** Light impact for taps, buttons, and row presses. */
export function tap() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Success notification for completed actions (logged set, checked item). */
export function success() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Warning notification for destructive or blocked actions. */
export function warning() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

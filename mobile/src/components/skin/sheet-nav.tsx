import { View } from "react-native";
import { IconButton, T } from "@/components/ui/kit";

/** ChatGPT sheet chrome: centered 17 semibold title, glass X, optional back. */
export function SheetNav({
  title,
  onClose,
  onBack,
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
}) {
  return (
    <View style={{ minHeight: 44, justifyContent: "center" }}>
      {onBack ? (
        <View style={{ position: "absolute", left: 0, top: 0, zIndex: 1 }}>
          <IconButton
            name="chevron.left"
            variant="glass"
            accessibilityLabel="Back"
            onPress={onBack}
          />
        </View>
      ) : null}
      <T variant="headline" style={{ textAlign: "center", paddingHorizontal: 48 }} numberOfLines={1}>
        {title}
      </T>
      <View style={{ position: "absolute", right: 0, top: 0, zIndex: 1 }}>
        <IconButton
          name="xmark"
          variant="glass"
          accessibilityLabel="Close"
          onPress={onClose}
        />
      </View>
    </View>
  );
}

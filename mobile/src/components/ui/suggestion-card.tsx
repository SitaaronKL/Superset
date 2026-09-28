import { View } from "react-native";
import { T } from "@/components/ui/kit";
import { sf, space, squircle, useTheme } from "@/lib/theme";

/** Two-line prompt card for an empty chat, matching ChatGPT's empty-cards. */
export function SuggestionCard({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        width: 184,
        backgroundColor: t.elevated,
        borderRadius: 18,
        ...squircle,
        paddingHorizontal: space[16],
        paddingVertical: space[12],
        gap: space[4],
      }}
    >
      <T variant="subhead" color={t.label} style={sf.semibold} numberOfLines={2}>
        {title}
      </T>
      <T variant="subhead" numberOfLines={2}>
        {subtitle}
      </T>
    </View>
  );
}

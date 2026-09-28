import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { T } from "@/components/ui/kit";
import { sf, space, squircle, type, useTheme } from "@/lib/theme";

/** ChatGPT login field: radius 12, faint outline, floating 11pt label once filled. */
export function SignInField({
  label,
  value,
  style,
  ...rest
}: { label: string } & Omit<TextInputProps, "placeholder">) {
  const t = useTheme();
  const filled = typeof value === "string" ? value.length > 0 : value != null;
  return (
    <View
      style={{
        minHeight: 56,
        borderRadius: 12,
        ...squircle,
        backgroundColor: t.elevated,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.separator,
        paddingHorizontal: space[16],
        paddingVertical: space[8],
        justifyContent: "center",
      }}
    >
      {filled ? (
        <T
          variant="caption"
          color={t.secondaryLabel}
          // ChatGPT floating label is 11pt; caption token is 12.
          style={{ fontSize: 11, lineHeight: 13, marginBottom: 2 }}
        >
          {label}
        </T>
      ) : null}
      <TextInput
        value={value}
        placeholder={filled ? undefined : label}
        placeholderTextColor={t.tertiaryLabel}
        selectionColor={t.accent}
        {...rest}
        style={[
          {
            color: t.label,
            fontSize: type.body.fontSize,
            lineHeight: type.body.lineHeight,
            letterSpacing: type.body.letterSpacing,
            ...sf.regular,
            padding: 0,
            margin: 0,
          },
          style,
        ]}
      />
    </View>
  );
}

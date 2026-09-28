import { Screen } from "@/components/screen";
import { RoutineEditor } from "@/components/skin/routine-editor";
import { useTheme } from "@/lib/theme";
import { View } from "react-native";

export default function RoutineRoute() {
  const t = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <RoutineEditor />
      </View>
    </Screen>
  );
}

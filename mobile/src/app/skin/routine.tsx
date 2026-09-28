import { Screen } from "@/components/screen";
import { RoutineEditor } from "@/components/skin/routine-editor";
import { palette } from "@/lib/theme";
import { View } from "react-native";

export default function RoutineRoute() {
  return (
    <Screen>
      <View style={{ flex: 1, backgroundColor: palette.bg }}>
        <RoutineEditor />
      </View>
    </Screen>
  );
}

import { ScrollView } from "react-native";
import { Screen, ScreenFades, useScreenInsets } from "@/components/screen";
import { ScreenTitle } from "@/components/ui/kit";
import { space } from "@/lib/theme";

export default function SkinScreen() {
  const pad = useScreenInsets();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space[16], paddingTop: pad.top, paddingBottom: pad.bottom }}>
        <ScreenTitle title="Skin" />
      </ScrollView>
      <ScreenFades />
    </Screen>
  );
}

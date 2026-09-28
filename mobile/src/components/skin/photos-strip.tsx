import { useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAction, useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { BottomSheet, Host } from "@expo/ui";
import { Button, ContextMenu, RNHostView } from "@expo/ui/swift-ui";
import { presentationBackground } from "@expo/ui/swift-ui/modifiers";
import { SymbolView } from "expo-symbols";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Body, Display, Eyebrow, Pill } from "@/components/ui/kit";
import { palette, useTheme } from "@/lib/theme";
import { formatLongDate, todayKey } from "@/lib/day";
import { uploadAsset } from "./upload";
import type { SkinPhoto } from "./types";

export function PhotosStrip({ dayKey }: { dayKey: string }) {
  const t = useTheme();
  const photos = useQuery(api.skin.photos);
  const generateUploadUrl = useMutation(api.skin.generateUploadUrl);
  const addPhoto = useMutation(api.skin.addPhoto);
  const [selected, setSelected] = useState<Id<"skinPhotos"> | null>(null);
  const [uploading, setUploading] = useState(false);

  const pick = async (fromCamera: boolean) => {
    const fn = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
    }
    const res = await fn({ mediaTypes: ["images"], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    setUploading(true);
    try {
      const image = await uploadAsset(generateUploadUrl, res.assets[0]);
      await addPhoto({ image });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setUploading(false);
    }
  };

  const list = photos ?? [];
  const selectedPhoto = list.find((p) => p._id === selected) ?? null;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", paddingHorizontal: 4 }}>
        <Eyebrow style={{ flex: 1 }}>Face photos</Eyebrow>
        {list.length > 0 && <Body size={13} color={t.mutedFg}>{list.length}</Body>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
        <Host matchContents colorScheme="dark" style={{ width: 72, height: 96 }}>
          <ContextMenu>
            <ContextMenu.Trigger>
              <RNHostView matchContents>
                <Pressable
                  accessibilityLabel="Add a face photo"
                  onPress={() => void pick(true)}
                  style={({ pressed }) => ({
                    width: 72, height: 96, borderRadius: 16, borderCurve: "continuous",
                    backgroundColor: t.card, alignItems: "center", justifyContent: "center", gap: 6,
                    opacity: pressed || uploading ? 0.6 : 1,
                  })}
                >
                  <SymbolView name="camera.fill" tintColor={t.mutedFg} style={{ width: 20, height: 20 }} />
                  <Body size={11} color={t.mutedFg}>{uploading ? "Saving" : "Add"}</Body>
                </Pressable>
              </RNHostView>
            </ContextMenu.Trigger>
            <ContextMenu.Items>
              <Button label="Take photo" systemImage="camera" onPress={() => void pick(true)} />
              <Button label="Choose from library" systemImage="photo" onPress={() => void pick(false)} />
            </ContextMenu.Items>
          </ContextMenu>
        </Host>
        {list.map((p) => (
          <PhotoThumb key={p._id} photo={p} onOpen={() => setSelected(p._id)} />
        ))}
      </ScrollView>
      <PhotoDetailSheet
        photo={selectedPhoto}
        dayKey={dayKey}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

function PhotoThumb({ photo, onOpen }: { photo: SkinPhoto; onOpen: () => void }) {
  const t = useTheme();
  const deletePhoto = useMutation(api.skin.deletePhoto);
  return (
    <Host matchContents colorScheme="dark" style={{ width: 72, height: 96 }}>
      <ContextMenu>
        <ContextMenu.Trigger>
          <RNHostView matchContents>
            <Pressable onPress={onOpen} style={{ width: 72, height: 96, borderRadius: 16, borderCurve: "continuous", overflow: "hidden", backgroundColor: t.muted }}>
              {photo.url ? (
                <Image source={{ uri: photo.url }} style={{ width: 72, height: 96 }} contentFit="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <SymbolView name="photo" tintColor={t.mutedFg} style={{ width: 18, height: 18 }} />
                </View>
              )}
            </Pressable>
          </RNHostView>
        </ContextMenu.Trigger>
        <ContextMenu.Items>
          <Button label="Read this photo" systemImage="text.viewfinder" onPress={onOpen} />
          <Button
            role="destructive"
            label="Delete"
            systemImage="trash"
            onPress={() => void deletePhoto({ id: photo._id })}
          />
        </ContextMenu.Items>
      </ContextMenu>
    </Host>
  );
}

function PhotoDetailSheet({ photo, dayKey, onClose }: {
  photo: SkinPhoto | null;
  dayKey: string;
  onClose: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const analyze = useAction(api.skin.analyzePhoto);
  const deletePhoto = useMutation(api.skin.deletePhoto);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState<SkinPhoto["analysis"] | undefined>(undefined);

  const analysis = local ?? photo?.analysis;
  const sheetWidth = width - 32;
  const sheetHeight = Math.max(420, Math.round(height * 0.88) - 36);

  const read = async () => {
    if (!photo) return;
    setBusy(true);
    setError(null);
    try {
      const result = await analyze({ id: photo._id, dayKey });
      setLocal(result);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setError("Couldn't read this photo. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      isPresented={photo !== null}
      onDismiss={() => {
        setLocal(undefined);
        setError(null);
        onClose();
      }}
      snapPoints={[{ fraction: 0.88 }]}
      modifiers={[presentationBackground(palette.bg)]}
    >
      <RNHostView matchContents>
        <ScrollView
          style={{ width: sheetWidth, height: sheetHeight, backgroundColor: t.bg }}
          contentContainerStyle={{ gap: 12, paddingBottom: insets.bottom + 12 }}
        >
          {photo ? (
            <>
              <Display size={24}>Face photo</Display>
              <Body size={15} color={t.mutedFg}>{formatLongDate(todayKey(new Date(photo.takenAt)))}</Body>
              <View style={{ borderRadius: 22, borderCurve: "continuous", overflow: "hidden", backgroundColor: t.card, aspectRatio: 3 / 4 }}>
                {photo.url ? (
                  <Image source={{ uri: photo.url }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                ) : null}
              </View>
              <Pill
                label={busy ? "Reading…" : analysis ? "Read again" : "Read this photo"}
                kind="accent"
                onPress={() => void read()}
                disabled={busy}
              />
              {error && <Body size={13} color={t.destructive}>{error}</Body>}
              {analysis && (
                <View style={{ gap: 10 }}>
                  <Body size={17}>{analysis.summary}</Body>
                  {analysis.observations.map((o) => (
                    <Body key={o} size={15} color={t.mutedFg}>{o}</Body>
                  ))}
                  {analysis.suggestions.length > 0 && (
                    <View style={{ gap: 6, backgroundColor: t.accentTint, borderRadius: 16, borderCurve: "continuous", padding: 12 }}>
                      <Eyebrow>Try</Eyebrow>
                      {analysis.suggestions.map((s) => (
                        <Body key={s} size={15}>{s}</Body>
                      ))}
                    </View>
                  )}
                </View>
              )}
              <Pill
                label="Delete photo"
                kind="outline"
                onPress={() => {
                  void deletePhoto({ id: photo._id });
                  onClose();
                }}
              />
            </>
          ) : (
            <View />
          )}
        </ScrollView>
      </RNHostView>
    </BottomSheet>
  );
}

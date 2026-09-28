import { useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useAction, useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Host } from "@expo/ui";
import { Button, ContextMenu, RNHostView } from "@expo/ui/swift-ui";
import { SymbolView } from "expo-symbols";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { EmptyState, Pill, T, gap, radius, space, squircle } from "@/components/ui/kit";
import { Sheet } from "@/components/ui/sheet";
import { success, tap } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import { formatLongDate, todayKey } from "@/lib/day";
import { SheetNav } from "./sheet-nav";
import { uploadAsset } from "./upload";
import type { SkinPhoto } from "./types";

export function PhotosTab({
  dayKey,
  visible,
  addOpen,
  onOpenAdd,
  onCloseAdd,
}: {
  dayKey: string;
  visible: boolean;
  addOpen: boolean;
  onOpenAdd: () => void;
  onCloseAdd: () => void;
}) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const photos = useQuery(api.skin.photos);
  const [selected, setSelected] = useState<Id<"skinPhotos"> | null>(null);

  const list = photos ?? [];
  const selectedPhoto = list.find((p) => p._id === selected) ?? null;
  const cols = 3;
  const gutter = space[4];
  const tile = (width - gap.screen * 2 - gutter * (cols - 1)) / cols;

  return (
    <>
      {visible ? (
        photos === undefined ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: gutter }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: tile,
                  aspectRatio: 3 / 4,
                  borderRadius: radius.sm,
                  ...squircle,
                  backgroundColor: t.elevated,
                }}
              />
            ))}
          </View>
        ) : list.length === 0 ? (
          <EmptyState
            symbol="camera"
            title="No face photos yet"
            message="Take one in the same light each week so you can see what is changing."
            action={{ label: "Add a photo", onPress: onOpenAdd }}
          />
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: gutter }}>
            {list.map((p) => (
              <PhotoThumb
                key={p._id}
                photo={p}
                size={tile}
                onOpen={() => setSelected(p._id)}
              />
            ))}
          </View>
        )
      ) : null}

      <AddPhotoSheet open={addOpen} onClose={onCloseAdd} />
      <PhotoDetailSheet
        photo={selectedPhoto}
        dayKey={dayKey}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function PhotoThumb({ photo, size, onOpen }: {
  photo: SkinPhoto;
  size: number;
  onOpen: () => void;
}) {
  const t = useTheme();
  const deletePhoto = useMutation(api.skin.deletePhoto);
  const height = size * (4 / 3);
  return (
    <Host matchContents colorScheme={t.scheme} style={{ width: size, height }}>
      <ContextMenu>
        <ContextMenu.Trigger>
          <RNHostView matchContents>
            <Pressable
              onPress={onOpen}
              style={{
                width: size,
                height,
                borderRadius: radius.sm,
                ...squircle,
                overflow: "hidden",
                backgroundColor: t.elevated2,
              }}
            >
              {photo.url ? (
                <Image source={{ uri: photo.url }} style={{ width: size, height }} contentFit="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <SymbolView name="photo" tintColor={t.secondaryLabel} size={18} />
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

function AddPhotoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTheme();
  const generateUploadUrl = useMutation(api.skin.generateUploadUrl);
  const addPhoto = useMutation(api.skin.addPhoto);
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
      success();
      onClose();
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet isPresented={open} onDismiss={onClose}>
      <SheetNav title="Add a photo" onClose={onClose} />
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <T variant="subhead" color={t.label}>Photos</T>
        <Pressable onPress={() => void pick(false)} hitSlop={8} disabled={uploading}>
          <T variant="subhead" color={t.accent}>All Photos</T>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space[8] }}
      >
        <AttachTile
          symbol="camera.fill"
          label={uploading ? "Saving" : "Camera"}
          disabled={uploading}
          onPress={() => void pick(true)}
        />
        <AttachTile
          symbol="photo"
          label="Library"
          disabled={uploading}
          onPress={() => void pick(false)}
        />
      </ScrollView>
    </Sheet>
  );
}

function AttachTile({ symbol, label, onPress, disabled }: {
  symbol: "camera.fill" | "photo";
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({
        width: 88,
        height: 88,
        borderRadius: 18,
        ...squircle,
        backgroundColor: t.elevated2,
        alignItems: "center",
        justifyContent: "center",
        gap: space[8],
        opacity: disabled ? 0.5 : pressed ? 0.78 : 1,
      })}
    >
      <SymbolView name={symbol} tintColor={t.label} size={22} />
      <T variant="subhead" color={t.label}>{label}</T>
    </Pressable>
  );
}

function PhotoDetailSheet({ photo, dayKey, onClose }: {
  photo: SkinPhoto | null;
  dayKey: string;
  onClose: () => void;
}) {
  const t = useTheme();
  const analyze = useAction(api.skin.analyzePhoto);
  const deletePhoto = useMutation(api.skin.deletePhoto);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState<SkinPhoto["analysis"] | undefined>(undefined);

  const analysis = local ?? photo?.analysis;

  const read = async () => {
    if (!photo) return;
    setBusy(true);
    setError(null);
    try {
      const result = await analyze({ id: photo._id, dayKey });
      setLocal(result);
      success();
    } catch {
      setError("Couldn't read this photo. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      isPresented={photo !== null}
      onDismiss={() => {
        setLocal(undefined);
        setError(null);
        onClose();
      }}
      scroll
      fraction={0.88}
    >
      <SheetNav title="Face photo" onClose={onClose} />
      {photo ? (
        <>
          <T variant="subhead">{formatLongDate(todayKey(new Date(photo.takenAt)))}</T>
          <View
            style={{
              borderRadius: radius.card,
              ...squircle,
              overflow: "hidden",
              backgroundColor: t.elevated,
              aspectRatio: 3 / 4,
            }}
          >
            {photo.url ? (
              <Image source={{ uri: photo.url }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : null}
          </View>
          <Pill
            label={busy ? "Reading..." : analysis ? "Read again" : "Read this photo"}
            kind="primary"
            onPress={() => void read()}
            disabled={busy}
          />
          {error ? <T variant="footnote" color={t.destructive} selectable>{error}</T> : null}
          {analysis ? (
            <View style={{ gap: space[12] }}>
              <T variant="body" selectable>{analysis.summary}</T>
              {analysis.observations.map((o) => (
                <T key={o} variant="subhead" selectable>{o}</T>
              ))}
              {analysis.suggestions.length > 0 ? (
                <View
                  style={{
                    gap: space[8],
                    backgroundColor: t.elevated2,
                    borderRadius: 18,
                    ...squircle,
                    padding: space[12],
                  }}
                >
                  <T variant="headline">Try</T>
                  {analysis.suggestions.map((s) => (
                    <T key={s} variant="subhead" color={t.label} selectable>{s}</T>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
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
    </Sheet>
  );
}

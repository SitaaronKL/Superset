import { useEffect, useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAction, useMutation } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { BottomSheet, Host } from "@expo/ui";
import { Button, ConfirmationDialog, RNHostView, Text as SwiftText } from "@expo/ui/swift-ui";
import { presentationBackground } from "@expo/ui/swift-ui/modifiers";
import { SymbolView } from "expo-symbols";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Body, Display, Eyebrow, Field, Pill } from "@/components/ui/kit";
import { fonts, palette, useTheme } from "@/lib/theme";
import { todayKey } from "@/lib/day";
import { uploadAsset } from "./upload";
import { Group, Hairline } from "./group";
import { SLOTS, type Proposal } from "./types";

export function ProposeSheet({ open, initialPath, onClose }: {
  open: boolean;
  initialPath?: "import" | "recommend" | null;
  onClose: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const propose = useAction(api.skin.propose);
  const applyRoutine = useMutation(api.skin.applyRoutine);
  const generateUploadUrl = useMutation(api.skin.generateUploadUrl);
  const addPhoto = useMutation(api.skin.addPhoto);

  const [path, setPath] = useState<"choose" | "import" | "recommend" | "review">(initialPath ?? "choose");
  const [text, setText] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoId, setPhotoId] = useState<Id<"skinPhotos"> | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPath(initialPath ?? "choose");
    setText("");
    setPhotoUri(null);
    setPhotoId(undefined);
    setBusy(false);
    setError(null);
    setProposal(null);
    setConfirmOpen(false);
  }, [open, initialPath]);

  const sheetWidth = width - 32;
  const sheetHeight = Math.max(420, Math.round(height * 0.92) - 36);

  const reset = () => {
    setPath(initialPath ?? "choose");
    setText("");
    setPhotoUri(null);
    setPhotoId(undefined);
    setBusy(false);
    setError(null);
    setProposal(null);
    setConfirmOpen(false);
  };

  const pickFace = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const fn = perm.granted ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const res = await fn({ mediaTypes: ["images"], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    setPhotoUri(res.assets[0].uri);
    setBusy(true);
    try {
      const image = await uploadAsset(generateUploadUrl, res.assets[0]);
      const id = await addPhoto({ image });
      setPhotoId(id);
    } catch {
      setError("Couldn't upload that photo.");
    } finally {
      setBusy(false);
    }
  };

  const run = async (mode: "import" | "recommend") => {
    setBusy(true);
    setError(null);
    try {
      const next = await propose({
        mode,
        text: text.trim() || undefined,
        photoId: mode === "recommend" ? photoId : undefined,
      });
      setProposal(next);
      setPath("review");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setError("Couldn't build that routine. Try again, or paste a bit more detail.");
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!proposal) return;
    await applyRoutine({ proposal, startDate: todayKey() });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reset();
    onClose();
  };

  return (
    <BottomSheet
      isPresented={open}
      onDismiss={() => {
        reset();
        onClose();
      }}
      snapPoints={[{ fraction: 0.92 }]}
      modifiers={[presentationBackground(palette.bg)]}
    >
      <RNHostView matchContents>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={{ width: sheetWidth, height: sheetHeight, backgroundColor: t.bg }}
          contentContainerStyle={{ gap: 14, paddingBottom: insets.bottom + 12 }}
        >
          {path === "choose" && (
            <>
              <Display size={26}>Your routine</Display>
              <Body size={15} color={t.mutedFg}>
                Paste what you already use, or get a simple starter from your goals.
              </Body>
              <Pressable
                onPress={() => setPath("import")}
                style={({ pressed }) => ({
                  backgroundColor: t.card, borderRadius: 22, borderCurve: "continuous",
                  padding: 18, gap: 6, opacity: pressed ? 0.7 : 1,
                })}
              >
                <Body size={17} style={{ fontFamily: fonts.sansSemiBold }}>Paste my routine</Body>
                <Body size={15} color={t.mutedFg}>Keep your products and order. We turn the note into steps.</Body>
              </Pressable>
              <Pressable
                onPress={() => setPath("recommend")}
                style={({ pressed }) => ({
                  backgroundColor: t.card, borderRadius: 22, borderCurve: "continuous",
                  padding: 18, gap: 6, opacity: pressed ? 0.7 : 1,
                })}
              >
                <Body size={17} style={{ fontFamily: fonts.sansSemiBold }}>Recommend one for me</Body>
                <Body size={15} color={t.mutedFg}>Cleanser, moisturizer, SPF, and at most two night actives.</Body>
              </Pressable>
            </>
          )}

          {path === "import" && (
            <>
              <Display size={26}>Paste my routine</Display>
              <Field
                value={text}
                onChangeText={setText}
                placeholder="Morning, night, shower. Product names and how you use them."
                multiline
                style={{ height: 180, paddingTop: 12, textAlignVertical: "top" }}
              />
              <Pill
                label={busy ? "Reading…" : "Turn this into a routine"}
                kind="accent"
                disabled={!text.trim() || busy}
                onPress={() => void run("import")}
              />
              {error && <Body size={13} color={t.destructive}>{error}</Body>}
              <Pill label="Back" kind="outline" onPress={() => setPath("choose")} />
            </>
          )}

          {path === "recommend" && (
            <>
              <Display size={26}>Recommend one</Display>
              <Field
                value={text}
                onChangeText={setText}
                placeholder="Goals. Oil, dark spots, shaving, body acne…"
                multiline
                style={{ height: 120, paddingTop: 12, textAlignVertical: "top" }}
              />
              <Pressable
                onPress={() => void pickFace()}
                style={{
                  height: 88, borderRadius: 18, borderCurve: "continuous",
                  backgroundColor: t.card, overflow: "hidden",
                  alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10,
                }}
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                ) : (
                  <>
                    <SymbolView name="camera" tintColor={t.mutedFg} style={{ width: 18, height: 18 }} />
                    <Body size={15} color={t.mutedFg}>Optional face photo</Body>
                  </>
                )}
              </Pressable>
              <Pill
                label={busy ? "Building…" : "Build a routine"}
                kind="accent"
                disabled={busy}
                onPress={() => void run("recommend")}
              />
              {error && <Body size={13} color={t.destructive}>{error}</Body>}
              <Pill label="Back" kind="outline" onPress={() => setPath("choose")} />
            </>
          )}

          {path === "review" && proposal && (
            <>
              <Display size={26}>Review</Display>
              <Body size={15}>{proposal.summary}</Body>
              <Eyebrow>Products</Eyebrow>
              <Group>
                {proposal.products.map((p, i) => (
                  <View key={p.key}>
                    {i > 0 && <Hairline />}
                    <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 2 }}>
                      <Body size={17} style={{ fontFamily: fonts.sansMedium }}>{p.name}</Body>
                      <Body size={13} color={t.mutedFg}>
                        {[p.brand, p.kind, p.zone].filter(Boolean).join(" · ")}
                      </Body>
                      {p.why ? <Body size={13} color={t.mutedFg}>{p.why}</Body> : null}
                    </View>
                  </View>
                ))}
              </Group>
              {SLOTS.map((slot) => {
                const rows = proposal.steps.filter((s) => s.slot === slot.id).sort((a, b) => a.order - b.order);
                if (rows.length === 0) return null;
                const byKey = new Map(proposal.products.map((p) => [p.key, p]));
                return (
                  <View key={slot.id} style={{ gap: 8 }}>
                    <Eyebrow>{slot.label}</Eyebrow>
                    <Group>
                      {rows.map((s, i) => {
                        const p = byKey.get(s.product);
                        return (
                          <View key={`${s.product}-${s.order}`}>
                            {i > 0 && <Hairline />}
                            <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 2 }}>
                              <Body size={17}>{p?.name ?? s.product}</Body>
                              {s.howTo ? <Body size={13} color={t.mutedFg}>{s.howTo}</Body> : null}
                            </View>
                          </View>
                        );
                      })}
                    </Group>
                  </View>
                );
              })}
              <Host matchContents colorScheme="dark" seedColor={t.accent}>
                <ConfirmationDialog
                  title="Replace your routine?"
                  isPresented={confirmOpen}
                  onIsPresentedChange={setConfirmOpen}
                  titleVisibility="visible"
                >
                  <ConfirmationDialog.Trigger>
                    <RNHostView matchContents>
                      <Pill label="Use this routine" kind="accent" onPress={() => setConfirmOpen(true)} />
                    </RNHostView>
                  </ConfirmationDialog.Trigger>
                  <ConfirmationDialog.Message>
                    <SwiftText>This replaces the current routine. Old products are archived, not deleted.</SwiftText>
                  </ConfirmationDialog.Message>
                  <ConfirmationDialog.Actions>
                    <Button label="Keep current" role="cancel" />
                    <Button label="Use this routine" role="destructive" onPress={() => void apply()} />
                  </ConfirmationDialog.Actions>
                </ConfirmationDialog>
              </Host>
              <Pill label="Start over" kind="outline" onPress={() => { setProposal(null); setPath("choose"); }} />
            </>
          )}
        </ScrollView>
      </RNHostView>
    </BottomSheet>
  );
}

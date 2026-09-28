import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useAction, useMutation } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Host } from "@expo/ui";
import { Button, ConfirmationDialog, RNHostView, Text as SwiftText } from "@expo/ui/swift-ui";
import { SymbolView } from "expo-symbols";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Field, Pill, Row, Section, T, gap, space, squircle } from "@/components/ui/kit";
import { Sheet } from "@/components/ui/sheet";
import { useTheme } from "@/lib/theme";
import { success } from "@/lib/haptics";
import { todayKey } from "@/lib/day";
import { SheetNav } from "./sheet-nav";
import { uploadAsset } from "./upload";
import { SLOTS, type Proposal } from "./types";

export function ProposeSheet({ open, initialPath, onClose }: {
  open: boolean;
  initialPath?: "import" | "recommend" | null;
  onClose: () => void;
}) {
  const t = useTheme();
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

  const dismiss = () => {
    reset();
    onClose();
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
      success();
    } catch {
      setError("Couldn't build that routine. Try again, or paste a bit more detail.");
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!proposal) return;
    await applyRoutine({ proposal, startDate: todayKey() });
    success();
    reset();
    onClose();
  };

  const title =
    path === "import" ? "Paste my routine"
      : path === "recommend" ? "Recommend one"
        : path === "review" ? "Review"
          : "Your routine";
  const nested = path === "import" || path === "recommend";

  return (
    <Sheet
      isPresented={open}
      onDismiss={dismiss}
      scroll={path !== "choose"}
      fraction={0.92}
    >
      <SheetNav
        title={title}
        onClose={dismiss}
        onBack={nested ? () => { setError(null); setPath("choose"); } : undefined}
      />

      {path === "choose" ? (
        <View style={{ gap: gap.group }}>
          <T variant="subhead">
            Paste what you already use, or get a simple starter from your goals.
          </T>
          <View style={{ flexDirection: "row", gap: space[12] }}>
            <ChoiceTile
              symbol="square.and.pencil"
              title="Paste my routine"
              subtitle="Keep your products and order."
              onPress={() => setPath("import")}
            />
            <ChoiceTile
              symbol="sparkles"
              title="Recommend one"
              subtitle="A calm starter around your goals."
              onPress={() => setPath("recommend")}
            />
          </View>
        </View>
      ) : null}

      {path === "import" ? (
        <View style={{ gap: gap.group }}>
          <Field
            value={text}
            onChangeText={setText}
            placeholder="Morning, night, shower. Product names and how you use them."
            multiline
            style={{ height: 180, paddingTop: space[12], textAlignVertical: "top" }}
          />
          <Pill
            label={busy ? "Reading..." : "Turn this into a routine"}
            kind="primary"
            disabled={!text.trim() || busy}
            onPress={() => void run("import")}
          />
          {error ? <T variant="footnote" color={t.destructive} selectable>{error}</T> : null}
        </View>
      ) : null}

      {path === "recommend" ? (
        <View style={{ gap: gap.group }}>
          <Field
            value={text}
            onChangeText={setText}
            placeholder="Goals. Oil, dark spots, shaving, body acne..."
            multiline
            style={{ height: 120, paddingTop: space[12], textAlignVertical: "top" }}
          />
          <Pressable
            onPress={() => void pickFace()}
            style={({ pressed }) => ({
              height: 88,
              borderRadius: 18,
              ...squircle,
              backgroundColor: t.elevated2,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: space[8],
              opacity: pressed ? 0.78 : 1,
            })}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : (
              <>
                <SymbolView name="camera" tintColor={t.secondaryLabel} size={18} />
                <T variant="subhead">Optional face photo</T>
              </>
            )}
          </Pressable>
          <Pill
            label={busy ? "Building..." : "Build a routine"}
            kind="primary"
            disabled={busy}
            onPress={() => void run("recommend")}
          />
          {error ? <T variant="footnote" color={t.destructive} selectable>{error}</T> : null}
        </View>
      ) : null}

      {path === "review" && proposal ? (
        <View style={{ gap: gap.group }}>
          <T variant="body" selectable>{proposal.summary}</T>
          <Section header="Products">
            {proposal.products.map((p) => (
              <Row
                key={p.key}
                title={p.name}
                subtitle={[p.brand, p.kind, p.zone, p.why].filter(Boolean).join(" · ")}
              />
            ))}
          </Section>
          {SLOTS.map((slot) => {
            const rows = proposal.steps.filter((s) => s.slot === slot.id).sort((a, b) => a.order - b.order);
            if (rows.length === 0) return null;
            const byKey = new Map(proposal.products.map((p) => [p.key, p]));
            return (
              <Section key={slot.id} header={slot.label}>
                {rows.map((s) => {
                  const p = byKey.get(s.product);
                  return (
                    <Row
                      key={`${s.product}-${s.order}`}
                      title={p?.name ?? s.product}
                      subtitle={s.howTo}
                    />
                  );
                })}
              </Section>
            );
          })}
          <Host matchContents colorScheme={t.scheme}>
            <ConfirmationDialog
              title="Replace your routine?"
              isPresented={confirmOpen}
              onIsPresentedChange={setConfirmOpen}
              titleVisibility="visible"
            >
              <ConfirmationDialog.Trigger>
                <RNHostView matchContents>
                  <Pill label="Use this routine" kind="primary" onPress={() => setConfirmOpen(true)} />
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
          <Pressable
            onPress={() => { setProposal(null); setPath("choose"); }}
            hitSlop={8}
            style={{ alignSelf: "center", paddingVertical: space[8] }}
          >
            <T variant="subhead">Start over</T>
          </Pressable>
        </View>
      ) : null}
    </Sheet>
  );
}

function ChoiceTile({ symbol, title, subtitle, onPress }: {
  symbol: "square.and.pencil" | "sparkles";
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: t.elevated2,
        borderRadius: 18,
        ...squircle,
        padding: space[16],
        gap: space[8],
        minHeight: 140,
        opacity: pressed ? 0.78 : 1,
      })}
    >
      <SymbolView name={symbol} tintColor={t.label} size={22} />
      <T variant="headline">{title}</T>
      <T variant="subhead">{subtitle}</T>
    </Pressable>
  );
}

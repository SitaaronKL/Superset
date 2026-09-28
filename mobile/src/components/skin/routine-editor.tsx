import { useEffect, useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { BottomSheet, Host } from "@expo/ui";
import { Button, ConfirmationDialog, DatePicker, Picker, RNHostView, Text as SwiftText } from "@expo/ui/swift-ui";
import { labelsHidden, pickerStyle, presentationBackground, tag, tint } from "@expo/ui/swift-ui/modifiers";
import { SymbolView } from "expo-symbols";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Body, Display, Eyebrow, Field, Pill } from "@/components/ui/kit";
import { sf, palette, useTheme } from "@/lib/theme";
import { dateFromKey, todayKey } from "@/lib/day";
import { Group, Hairline } from "./group";
import { WeekdayChips } from "./weekday-chips";
import { uploadAsset } from "./upload";
import {
  KINDS, SLOTS, ZONES, type RoutineProduct, type RoutineStep, type ShaveMode, type Slot,
} from "./types";

export function RoutineEditor() {
  const t = useTheme();
  const padTop = 16;
  const insets = useSafeAreaInsets();
  const dayKey = todayKey();
  const data = useQuery(api.skin.routine, { todayKey: dayKey });
  const day = useQuery(api.skin.day, { dayKey });
  const setSetting = useMutation(api.settings.set);

  const [productEdit, setProductEdit] = useState<Id<"skinProducts"> | "new" | null>(null);
  const [stepEdit, setStepEdit] = useState<{ id?: Id<"skinSteps">; slot: Slot; productId?: Id<"skinProducts"> } | null>(null);

  if (data === undefined || day === undefined) {
    return (
      <View style={{ padding: 16, paddingTop: padTop }}>
        <View style={{ height: 18, width: 120, borderRadius: 8, backgroundColor: t.muted }} />
        <View style={{ height: 88, borderRadius: 22, backgroundColor: t.card, marginTop: 16 }} />
      </View>
    );
  }

  const shaveDays: number[] = day.shaveDays ?? [];
  const startDate = day.startDate;

  return (
    <>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 22, paddingBottom: insets.bottom + 28 }}
      >
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Eyebrow style={{ flex: 1 }}>Products</Eyebrow>
            <Pressable onPress={() => setProductEdit("new")} hitSlop={8}>
              <Body size={13} color={t.accent} style={{ ...sf.semibold }}>Add</Body>
            </Pressable>
          </View>
          <Group>
            {data.products.length === 0 ? (
              <View style={{ padding: 16 }}>
                <Body size={15} color={t.mutedFg}>No products yet.</Body>
              </View>
            ) : data.products.map((p, i) => (
              <View key={p._id}>
                {i > 0 && <Hairline />}
                <Pressable
                  onPress={() => setProductEdit(p._id)}
                  style={({ pressed }) => ({
                    flexDirection: "row", alignItems: "center", gap: 12,
                    paddingHorizontal: 16, paddingVertical: 12,
                    backgroundColor: pressed ? t.muted : "transparent",
                  })}
                >
                  {p.imageUrl ? (
                    <Image source={{ uri: p.imageUrl }} style={{ width: 40, height: 40, borderRadius: 10 }} />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: t.muted }} />
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Body size={17} style={{ ...sf.medium }}>{p.name}</Body>
                    <Body size={13} color={t.mutedFg}>
                      {[p.brand, p.kind, p.zone].filter(Boolean).join(" · ")}
                    </Body>
                    {p.refillDaysLeft !== null && p.refillDaysLeft < 14 && (
                      <Body size={13} color={t.accent}>
                        {p.refillDaysLeft < 0 ? "Refill now" : `${p.refillDaysLeft} days left`}
                      </Body>
                    )}
                  </View>
                  <SymbolView name="chevron.right" tintColor={t.mutedFg} style={{ width: 12, height: 12 }} />
                </Pressable>
              </View>
            ))}
          </Group>
        </View>

        {SLOTS.map((slot) => {
          const rows = data.steps.filter((s) => s.slot === slot.id);
          return (
            <View key={slot.id} style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                <Eyebrow style={{ flex: 1 }}>{slot.label}</Eyebrow>
                <Pressable
                  onPress={() => setStepEdit({ slot: slot.id, productId: data.products[0]?._id })}
                  hitSlop={8}
                >
                  <Body size={13} color={t.accent} style={{ ...sf.semibold }}>Add step</Body>
                </Pressable>
              </View>
              <Group>
                {rows.length === 0 ? (
                  <View style={{ padding: 16 }}>
                    <Body size={15} color={t.mutedFg}>Nothing in {slot.label.toLowerCase()}.</Body>
                  </View>
                ) : rows.map((s, i) => (
                  <View key={s._id}>
                    {i > 0 && <Hairline />}
                    <StepEditorRow
                      step={s}
                      isFirst={i === 0}
                      isLast={i === rows.length - 1}
                      onEdit={() => setStepEdit({ id: s._id, slot: s.slot, productId: s.productId })}
                    />
                  </View>
                ))}
              </Group>
            </View>
          );
        })}

        <View style={{ gap: 8 }}>
          <Eyebrow>Schedule</Eyebrow>
          <Group style={{ padding: 16, gap: 14, overflow: "visible" }}>
            <Body size={17} style={{ ...sf.medium }}>Routine start</Body>
            <Body size={13} color={t.mutedFg}>Ramp-up counts from this day.</Body>
            <Host matchContents={{ vertical: true }} colorScheme="dark" seedColor={t.accent} style={{ minHeight: 36 }}>
              <DatePicker
                title="Start date"
                selection={startDate ? dateFromKey(startDate) : new Date()}
                displayedComponents={["date"]}
                onDateChange={(d) => {
                  void Haptics.selectionAsync();
                  void setSetting({ key: "skinStartDate", value: todayKey(d) });
                }}
              />
            </Host>
            <Body size={17} style={{ ...sf.medium }}>Usual shave days</Body>
            <WeekdayChips
              selected={shaveDays}
              onChange={(next) => void setSetting({ key: "skinShaveDays", value: JSON.stringify(next) })}
            />
          </Group>
        </View>
      </ScrollView>

      <ProductSheet
        products={data.products}
        editing={productEdit}
        onClose={() => setProductEdit(null)}
      />
      <StepSheet
        products={data.products}
        steps={data.steps}
        editing={stepEdit}
        onClose={() => setStepEdit(null)}
      />
    </>
  );
}

function StepEditorRow({ step, isFirst, isLast, onEdit }: {
  step: RoutineStep;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
}) {
  const t = useTheme();
  const moveStep = useMutation(api.skin.moveStep);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingRight: 8 }}>
      <Pressable
        onPress={onEdit}
        style={({ pressed }) => ({
          flex: 1, paddingHorizontal: 16, paddingVertical: 12, gap: 2,
          backgroundColor: pressed ? t.muted : "transparent",
        })}
      >
        <Body size={17} style={{ ...sf.medium }}>{step.productName}</Body>
        <Body size={13} color={t.mutedFg} numberOfLines={1}>
          {step.howTo || (step.brand ?? step.kind)}
        </Body>
      </Pressable>
      <Pressable
        disabled={isFirst}
        onPress={() => { void Haptics.selectionAsync(); void moveStep({ id: step._id, direction: "up" }); }}
        hitSlop={6}
        style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", opacity: isFirst ? 0.25 : 1 }}
      >
        <SymbolView name="chevron.up" tintColor={t.fg} style={{ width: 14, height: 14 }} />
      </Pressable>
      <Pressable
        disabled={isLast}
        onPress={() => { void Haptics.selectionAsync(); void moveStep({ id: step._id, direction: "down" }); }}
        hitSlop={6}
        style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", opacity: isLast ? 0.25 : 1 }}
      >
        <SymbolView name="chevron.down" tintColor={t.fg} style={{ width: 14, height: 14 }} />
      </Pressable>
    </View>
  );
}

function ProductSheet({ products, editing, onClose }: {
  products: RoutineProduct[];
  editing: Id<"skinProducts"> | "new" | null;
  onClose: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const saveProduct = useMutation(api.skin.saveProduct);
  const archiveProduct = useMutation(api.skin.archiveProduct);
  const generateUploadUrl = useMutation(api.skin.generateUploadUrl);
  const existing = editing && editing !== "new" ? products.find((p) => p._id === editing) : undefined;

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [kind, setKind] = useState<string>("Cleanser");
  const [zone, setZone] = useState<string>("face");
  const [why, setWhy] = useState("");
  const [lasts, setLasts] = useState("");
  const [openedOn, setOpenedOn] = useState("");
  const [image, setImage] = useState<Id<"_storage"> | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setName(existing?.name ?? "");
    setBrand(existing?.brand ?? "");
    setKind(existing?.kind ?? "Cleanser");
    setZone(existing?.zone ?? "face");
    setWhy(existing?.why ?? "");
    setLasts(existing?.lastsDays != null ? String(existing.lastsDays) : "");
    setOpenedOn(existing?.openedOn ?? "");
    setImage(existing?.image);
    setPreview(existing?.imageUrl ?? null);
    setBusy(false);
  }, [editing, existing]);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    setPreview(res.assets[0].uri);
    setBusy(true);
    try {
      setImage(await uploadAsset(generateUploadUrl, res.assets[0]));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const lastsDays = lasts.trim() ? Number(lasts) : undefined;
      await saveProduct({
        id: existing?._id,
        name: name.trim(),
        brand: brand.trim() || undefined,
        kind,
        zone,
        why: why.trim() || undefined,
        image,
        lastsDays: Number.isFinite(lastsDays) ? lastsDays : undefined,
        openedOn: openedOn.trim() || undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const sheetWidth = width - 32;
  const sheetHeight = Math.max(420, Math.round(height * 0.92) - 36);

  return (
    <BottomSheet
      isPresented={editing !== null}
      onDismiss={onClose}
      snapPoints={[{ fraction: 0.92 }]}
      modifiers={[presentationBackground(palette.bg)]}
    >
      <RNHostView matchContents>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={{ width: sheetWidth, height: sheetHeight, backgroundColor: t.bg }}
          contentContainerStyle={{ gap: 12, paddingBottom: insets.bottom + 12 }}
        >
          <Display size={24}>{existing ? "Edit product" : "Add product"}</Display>
          <Pressable
            onPress={() => void pick()}
            style={{
              height: 88, borderRadius: 18, borderCurve: "continuous", backgroundColor: t.card,
              alignItems: "center", justifyContent: "center", overflow: "hidden",
            }}
          >
            {preview ? (
              <Image source={{ uri: preview }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : (
              <Body size={13} color={t.mutedFg}>Add a bottle photo</Body>
            )}
          </Pressable>
          <Field value={name} onChangeText={setName} placeholder="Name" />
          <Field value={brand} onChangeText={setBrand} placeholder="Brand" />
          <ChipRow values={KINDS} selected={kind} onChange={setKind} />
          <ChipRow values={ZONES} selected={zone} onChange={setZone} />
          <Field value={why} onChangeText={setWhy} placeholder="Why you use it (optional)" />
          <Field mono value={lasts} onChangeText={setLasts} placeholder="Days one bottle lasts" keyboardType="number-pad" />
          <Field mono value={openedOn} onChangeText={setOpenedOn} placeholder="Opened on (YYYY-MM-DD)" />
          <Pill label={busy ? "Saving…" : "Save"} kind="accent" disabled={!name.trim() || busy} onPress={() => void save()} />
          {existing && (
            <Host matchContents colorScheme="dark">
              <ConfirmationDialog
                title="Archive this product?"
                isPresented={confirm}
                onIsPresentedChange={setConfirm}
                titleVisibility="visible"
              >
                <ConfirmationDialog.Trigger>
                  <RNHostView matchContents>
                    <Pill label="Archive" kind="outline" onPress={() => setConfirm(true)} />
                  </RNHostView>
                </ConfirmationDialog.Trigger>
                <ConfirmationDialog.Message>
                  <SwiftText>Its steps leave the routine. Past check-offs stay.</SwiftText>
                </ConfirmationDialog.Message>
                <ConfirmationDialog.Actions>
                  <Button label="Keep" role="cancel" />
                  <Button
                    label="Archive"
                    role="destructive"
                    onPress={() => {
                      void archiveProduct({ id: existing._id });
                      onClose();
                    }}
                  />
                </ConfirmationDialog.Actions>
              </ConfirmationDialog>
            </Host>
          )}
        </ScrollView>
      </RNHostView>
    </BottomSheet>
  );
}

function StepSheet({ products, steps, editing, onClose }: {
  products: RoutineProduct[];
  steps: RoutineStep[];
  editing: { id?: Id<"skinSteps">; slot: Slot; productId?: Id<"skinProducts"> } | null;
  onClose: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const saveStep = useMutation(api.skin.saveStep);
  const deleteStep = useMutation(api.skin.deleteStep);
  const existing = editing?.id ? steps.find((s) => s._id === editing.id) : undefined;

  const [productId, setProductId] = useState<Id<"skinProducts"> | undefined>(undefined);
  const [slot, setSlot] = useState<Slot>("am");
  const [howTo, setHowTo] = useState("");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [shave, setShave] = useState<ShaveMode>("normal");
  const [shaveNote, setShaveNote] = useState("");
  const [group, setGroup] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setProductId(existing?.productId ?? editing.productId ?? products[0]?._id);
    setSlot(existing?.slot ?? editing.slot);
    setHowTo(existing?.howTo ?? "");
    setDays(existing?.days ?? [0, 1, 2, 3, 4, 5, 6]);
    setShave(existing?.onShaveDay ?? "normal");
    setShaveNote(existing?.shaveNote ?? "");
    setGroup(existing?.group ?? "");
    setBusy(false);
  }, [editing, existing, products]);

  const save = async () => {
    if (!productId) return;
    setBusy(true);
    try {
      await saveStep({
        id: existing?._id,
        productId,
        slot,
        howTo: howTo.trim() || undefined,
        days,
        onShaveDay: shave,
        shaveNote: shaveNote.trim() || undefined,
        group: group.trim() || undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const sheetWidth = width - 32;
  const sheetHeight = Math.max(420, Math.round(height * 0.92) - 36);
  const product = products.find((p) => p._id === productId);

  return (
    <BottomSheet
      isPresented={editing !== null}
      onDismiss={onClose}
      snapPoints={[{ fraction: 0.92 }]}
      modifiers={[presentationBackground(palette.bg)]}
    >
      <RNHostView matchContents>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={{ width: sheetWidth, height: sheetHeight, backgroundColor: t.bg }}
          contentContainerStyle={{ gap: 12, paddingBottom: insets.bottom + 12 }}
        >
          <Display size={24}>{existing ? "Edit step" : "Add step"}</Display>
          <Eyebrow>Product</Eyebrow>
          <Group>
            {products.map((p, i) => (
              <View key={p._id}>
                {i > 0 && <Hairline />}
                <Pressable
                  onPress={() => setProductId(p._id)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 12,
                    backgroundColor: p._id === productId ? t.accentTint : "transparent",
                  }}
                >
                  <Body size={17}>{p.name}</Body>
                  {p.brand ? <Body size={13} color={t.mutedFg}>{p.brand}</Body> : null}
                </Pressable>
              </View>
            ))}
            {products.length === 0 && (
              <View style={{ padding: 16 }}>
                <Body size={15} color={t.mutedFg}>Add a product first.</Body>
              </View>
            )}
          </Group>

          <Eyebrow>Slot</Eyebrow>
          <Host matchContents={{ vertical: true }} colorScheme="dark" seedColor={t.accent} style={{ minHeight: 36 }}>
            <Picker<Slot>
              label="Slot"
              selection={slot}
              onSelectionChange={setSlot}
              modifiers={[pickerStyle("segmented"), labelsHidden(), tint(t.accent)]}
            >
              <SwiftText modifiers={[tag("am")]}>Morning</SwiftText>
              <SwiftText modifiers={[tag("pm")]}>Night</SwiftText>
              <SwiftText modifiers={[tag("shower")]}>Shower</SwiftText>
            </Picker>
          </Host>

          <Field value={howTo} onChangeText={setHowTo} placeholder="How to use it" />
          <Eyebrow>Days</Eyebrow>
          <WeekdayChips selected={days} onChange={setDays} />

          <Eyebrow>On a shave day</Eyebrow>
          <Host matchContents={{ vertical: true }} colorScheme="dark" seedColor={t.accent} style={{ minHeight: 36 }}>
            <Picker<ShaveMode>
              label="Shave day"
              selection={shave}
              onSelectionChange={setShave}
              modifiers={[pickerStyle("segmented"), labelsHidden(), tint(t.accent)]}
            >
              <SwiftText modifiers={[tag("normal")]}>Usual</SwiftText>
              <SwiftText modifiers={[tag("skip")]}>Skip</SwiftText>
              <SwiftText modifiers={[tag("include")]}>Always</SwiftText>
            </Picker>
          </Host>
          <Field value={shaveNote} onChangeText={setShaveNote} placeholder="Shave-day note (optional)" />
          <Field value={group} onChangeText={setGroup} placeholder="Group (alternate with another step)" />

          <Pill
            label={busy ? "Saving…" : "Save"}
            kind="accent"
            disabled={!productId || busy}
            onPress={() => void save()}
          />
          {existing && (
            <Host matchContents colorScheme="dark">
              <ConfirmationDialog
                title="Delete this step?"
                isPresented={confirm}
                onIsPresentedChange={setConfirm}
                titleVisibility="visible"
              >
                <ConfirmationDialog.Trigger>
                  <RNHostView matchContents>
                    <Pill label="Delete step" kind="outline" onPress={() => setConfirm(true)} />
                  </RNHostView>
                </ConfirmationDialog.Trigger>
                <ConfirmationDialog.Actions>
                  <Button label="Keep" role="cancel" />
                  <Button
                    label="Delete"
                    role="destructive"
                    onPress={() => {
                      void deleteStep({ id: existing._id });
                      onClose();
                    }}
                  />
                </ConfirmationDialog.Actions>
              </ConfirmationDialog>
            </Host>
          )}
          {product ? <Body size={11} color={t.mutedFg}>{product.brand ? `${product.brand} ${product.name}` : product.name}</Body> : null}
        </ScrollView>
      </RNHostView>
    </BottomSheet>
  );
}

function ChipRow({ values, selected, onChange }: {
  values: readonly string[];
  selected: string;
  onChange: (v: string) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {values.map((v) => {
        const on = v === selected;
        return (
          <Pressable
            key={v}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(v);
            }}
            style={{
              borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8,
              backgroundColor: on ? t.fg : t.muted,
            }}
          >
            <Body size={13} color={on ? "#000" : t.mutedFg} style={{ ...sf.medium }}>{v}</Body>
          </Pressable>
        );
      })}
    </View>
  );
}

import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Host } from "@expo/ui";
import { Button, ConfirmationDialog, DatePicker, Picker, RNHostView, Text as SwiftText } from "@expo/ui/swift-ui";
import { labelsHidden, pickerStyle, tag, tint } from "@expo/ui/swift-ui/modifiers";
import { SymbolView } from "expo-symbols";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Field, Pill, Row, Section, Skeleton, T, gap, radius, space, squircle } from "@/components/ui/kit";
import { Sheet } from "@/components/ui/sheet";
import { sf, useTheme } from "@/lib/theme";
import { success, tap } from "@/lib/haptics";
import { dateFromKey, todayKey } from "@/lib/day";
import { SheetNav } from "./sheet-nav";
import { WeekdayChips } from "./weekday-chips";
import { uploadAsset } from "./upload";
import {
  KINDS, SLOTS, ZONES, type RoutineProduct, type RoutineStep, type ShaveMode, type Slot,
} from "./types";

export function RoutineEditor({ scroll = true }: { scroll?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const dayKey = todayKey();
  const data = useQuery(api.skin.routine, { todayKey: dayKey });
  const day = useQuery(api.skin.day, { dayKey });
  const setSetting = useMutation(api.settings.set);

  const [productEdit, setProductEdit] = useState<Id<"skinProducts"> | "new" | null>(null);
  const [stepEdit, setStepEdit] = useState<{ id?: Id<"skinSteps">; slot: Slot; productId?: Id<"skinProducts"> } | null>(null);

  if (data === undefined || day === undefined) {
    return (
      <View style={{ gap: gap.group }}>
        <Skeleton height={18} width={120} />
        <Skeleton height={88} />
        <Skeleton height={120} />
      </View>
    );
  }

  const shaveDays: number[] = day.shaveDays ?? [];
  const startDate = day.startDate;

  const body = (
    <>
      <Section
        header={
          <View style={{ flexDirection: "row", alignItems: "baseline", paddingHorizontal: space[16] }}>
            <T variant="footnote" style={{ flex: 1 }}>Products</T>
            <Pressable onPress={() => setProductEdit("new")} hitSlop={8}>
              <T variant="footnote" color={t.accent} style={sf.semibold}>Add</T>
            </Pressable>
          </View>
        }
      >
        {data.products.length === 0 ? (
          <View style={{ paddingHorizontal: space[16], paddingVertical: space[12] }}>
            <T variant="subhead">No products yet.</T>
          </View>
        ) : data.products.map((p) => {
          const refill =
            p.refillDaysLeft !== null && p.refillDaysLeft < 14
              ? p.refillDaysLeft < 0 ? "Refill now" : `${p.refillDaysLeft} days left`
              : null;
          const subtitle = [p.brand, refill].filter(Boolean).join(" · ") || undefined;
          return (
            <Row
              key={p._id}
              title={p.name}
              subtitle={subtitle}
              leading={
                p.imageUrl ? (
                  <Image
                    source={{ uri: p.imageUrl }}
                    style={{ width: 40, height: 40, borderRadius: 10, ...squircle }}
                  />
                ) : (
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      ...squircle,
                      backgroundColor: t.elevated2,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <SymbolView name="drop.fill" tintColor={t.secondaryLabel} size={18} />
                  </View>
                )
              }
              onPress={() => setProductEdit(p._id)}
            />
          );
        })}
      </Section>

      {SLOTS.map((slot) => {
        const rows = data.steps.filter((s) => s.slot === slot.id);
        return (
          <Section
            key={slot.id}
            header={
              <View style={{ flexDirection: "row", alignItems: "baseline", paddingHorizontal: space[16] }}>
                <T variant="footnote" style={{ flex: 1 }}>{slot.label}</T>
                <Pressable
                  onPress={() => setStepEdit({ slot: slot.id, productId: data.products[0]?._id })}
                  hitSlop={8}
                >
                  <T variant="footnote" color={t.accent} style={sf.semibold}>Add step</T>
                </Pressable>
              </View>
            }
          >
            {rows.length === 0 ? (
              <View style={{ paddingHorizontal: space[16], paddingVertical: space[12] }}>
                <T variant="subhead">Nothing in {slot.label.toLowerCase()}.</T>
              </View>
            ) : rows.map((s, i) => (
              <StepEditorRow
                key={s._id}
                step={s}
                isFirst={i === 0}
                isLast={i === rows.length - 1}
                onEdit={() => setStepEdit({ id: s._id, slot: s.slot, productId: s.productId })}
              />
            ))}
          </Section>
        );
      })}

      <Section header="Schedule">
        <View style={{ paddingHorizontal: space[16], paddingVertical: space[12], gap: space[12] }}>
          <View style={{ gap: space[4] }}>
            <T variant="body" color={t.label}>Routine start</T>
            <T variant="footnote">Ramp-up counts from this day.</T>
          </View>
          <Host matchContents={{ vertical: true }} colorScheme={t.scheme} seedColor={t.accent} style={{ minHeight: 36 }}>
            <DatePicker
              title="Start date"
              selection={startDate ? dateFromKey(startDate) : new Date()}
              displayedComponents={["date"]}
              onDateChange={(d) => {
                tap();
                void setSetting({ key: "skinStartDate", value: todayKey(d) });
              }}
            />
          </Host>
          <T variant="body" color={t.label}>Usual shave days</T>
          <WeekdayChips
            selected={shaveDays}
            onChange={(next) => void setSetting({ key: "skinShaveDays", value: JSON.stringify(next) })}
          />
        </View>
      </Section>
    </>
  );

  return (
    <>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            gap: gap.section,
            paddingHorizontal: gap.screen,
            paddingTop: space[16],
            paddingBottom: insets.bottom + space[24],
          }}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={{ gap: gap.section }}>{body}</View>
      )}

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
    <Row
      title={step.productName}
      subtitle={step.howTo || (step.brand ?? step.kind) || undefined}
      onPress={onEdit}
      accessory={
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable
            disabled={isFirst}
            onPress={() => { tap(); void moveStep({ id: step._id, direction: "up" }); }}
            hitSlop={6}
            style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", opacity: isFirst ? 0.25 : 1 }}
          >
            <SymbolView name="chevron.up" tintColor={t.label} size={14} />
          </Pressable>
          <Pressable
            disabled={isLast}
            onPress={() => { tap(); void moveStep({ id: step._id, direction: "down" }); }}
            hitSlop={6}
            style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", opacity: isLast ? 0.25 : 1 }}
          >
            <SymbolView name="chevron.down" tintColor={t.label} size={14} />
          </Pressable>
        </View>
      }
    />
  );
}

function ProductSheet({ products, editing, onClose }: {
  products: RoutineProduct[];
  editing: Id<"skinProducts"> | "new" | null;
  onClose: () => void;
}) {
  const t = useTheme();
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
      success();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet isPresented={editing !== null} onDismiss={onClose} scroll fraction={0.92}>
      <SheetNav title={existing ? "Edit product" : "Add product"} onClose={onClose} />
      <Pressable
        onPress={() => void pick()}
        style={{
          height: 88,
          borderRadius: 18,
          ...squircle,
          backgroundColor: t.elevated2,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {preview ? (
          <Image source={{ uri: preview }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        ) : (
          <T variant="subhead">Add a bottle photo</T>
        )}
      </Pressable>
      <Field value={name} onChangeText={setName} placeholder="Name" />
      <Field value={brand} onChangeText={setBrand} placeholder="Brand" />
      <ChipRow values={KINDS} selected={kind} onChange={setKind} />
      <ChipRow values={ZONES} selected={zone} onChange={setZone} />
      <Field value={why} onChangeText={setWhy} placeholder="Why you use it (optional)" />
      <Field mono value={lasts} onChangeText={setLasts} placeholder="Days one bottle lasts" keyboardType="number-pad" />
      <Field mono value={openedOn} onChangeText={setOpenedOn} placeholder="Opened on (YYYY-MM-DD)" />
      <Pill label={busy ? "Saving..." : "Save"} kind="primary" disabled={!name.trim() || busy} onPress={() => void save()} />
      {existing ? (
        <Host matchContents colorScheme={t.scheme}>
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
      ) : null}
    </Sheet>
  );
}

function StepSheet({ products, steps, editing, onClose }: {
  products: RoutineProduct[];
  steps: RoutineStep[];
  editing: { id?: Id<"skinSteps">; slot: Slot; productId?: Id<"skinProducts"> } | null;
  onClose: () => void;
}) {
  const t = useTheme();
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
      success();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const product = products.find((p) => p._id === productId);

  return (
    <Sheet isPresented={editing !== null} onDismiss={onClose} scroll fraction={0.92}>
      <SheetNav title={existing ? "Edit step" : "Add step"} onClose={onClose} />
      <T variant="footnote">Product</T>
      <View style={{ backgroundColor: t.elevated, borderRadius: radius.card, ...squircle, overflow: "hidden" }}>
        {products.map((p) => {
          const on = p._id === productId;
          return (
            <Pressable
              key={p._id}
              onPress={() => setProductId(p._id)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: space[12],
                paddingHorizontal: space[16],
                paddingVertical: space[12],
                backgroundColor: pressed ? t.elevated2 : "transparent",
              })}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 1.5,
                  borderColor: on ? t.label : t.tertiaryLabel,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {on ? (
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: t.label }} />
                ) : null}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="body" color={t.label}>{p.name}</T>
                {p.brand ? <T variant="footnote">{p.brand}</T> : null}
              </View>
            </Pressable>
          );
        })}
        {products.length === 0 ? (
          <View style={{ padding: space[16] }}>
            <T variant="subhead">Add a product first.</T>
          </View>
        ) : null}
      </View>

      <T variant="footnote">Slot</T>
      <Host matchContents={{ vertical: true }} colorScheme={t.scheme} seedColor={t.accent} style={{ minHeight: 36 }}>
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
      <T variant="footnote">Days</T>
      <WeekdayChips selected={days} onChange={setDays} />

      <T variant="footnote">On a shave day</T>
      <Host matchContents={{ vertical: true }} colorScheme={t.scheme} seedColor={t.accent} style={{ minHeight: 36 }}>
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
        label={busy ? "Saving..." : "Save"}
        kind="primary"
        disabled={!productId || busy}
        onPress={() => void save()}
      />
      {existing ? (
        <Host matchContents colorScheme={t.scheme}>
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
      ) : null}
      {product ? (
        <T variant="caption">{product.brand ? `${product.brand} ${product.name}` : product.name}</T>
      ) : null}
    </Sheet>
  );
}

function ChipRow({ values, selected, onChange }: {
  values: readonly string[];
  selected: string;
  onChange: (v: string) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[8] }}>
      {values.map((v) => {
        const on = v === selected;
        return (
          <Pressable
            key={v}
            onPress={() => {
              tap();
              onChange(v);
            }}
            style={{
              borderRadius: radius.full,
              paddingHorizontal: space[12],
              paddingVertical: space[8],
              backgroundColor: on ? t.label : t.elevated2,
            }}
          >
            <T variant="footnote" color={on ? t.inverseLabel : t.secondaryLabel} style={sf.medium}>{v}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

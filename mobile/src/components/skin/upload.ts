import type { ImagePickerAsset } from "expo-image-picker";
import type { Id } from "../../../../convex/_generated/dataModel";

export async function uploadAsset(
  generateUploadUrl: () => Promise<string>,
  asset: ImagePickerAsset,
): Promise<Id<"_storage">> {
  const uploadUrl = await generateUploadUrl();
  const blob = await (await fetch(asset.uri)).blob();
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
    body: blob,
  });
  const json = (await res.json()) as { storageId: Id<"_storage"> };
  return json.storageId;
}

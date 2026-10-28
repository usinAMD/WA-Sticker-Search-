import * as Sharing from "expo-sharing";
import type { StickerRecord } from "./types";

export async function shareSticker(sticker: StickerRecord): Promise<"shared" | "downloaded"> {
  if (sticker.source !== "imported" || !sticker.uri) throw new Error("Only imported stickers can be shared.");
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this device.");
  await Sharing.shareAsync(sticker.uri, {
    mimeType: sticker.mimeType || "image/webp",
    dialogTitle: "Share sticker to WhatsApp",
    UTI: "public.image",
  });
  return "shared";
}

import type { StickerRecord } from "./types";

type ShareNavigator = Navigator & {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

function safeName(value: string): string {
  return value.trim().replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(0, 72) || "stickly-sticker";
}

export async function shareSticker(sticker: StickerRecord): Promise<"shared" | "downloaded"> {
  if (sticker.source !== "imported" || !sticker.uri) throw new Error("Only imported stickers can be shared.");
  const blob = await fetch(sticker.uri).then((response) => {
    if (!response.ok) throw new Error("The sticker image could not be loaded from browser storage.");
    return response.blob();
  });
  const extension = sticker.mimeType === "image/png" ? "png" : sticker.mimeType === "image/jpeg" ? "jpg" : sticker.mimeType === "image/gif" ? "gif" : "webp";
  const file = new File([blob], `${safeName(sticker.name)}.${extension}`, { type: sticker.mimeType || blob.type || "image/webp" });
  const shareNavigator = navigator as ShareNavigator;
  const payload: ShareData = { files: [file], title: sticker.name };

  if (shareNavigator.share && (!shareNavigator.canShare || shareNavigator.canShare(payload))) {
    await shareNavigator.share(payload);
    return "shared";
  }

  const link = document.createElement("a");
  const downloadUrl = URL.createObjectURL(blob);
  link.href = downloadUrl;
  link.download = file.name;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  return "downloaded";
}

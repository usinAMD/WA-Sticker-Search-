import * as DocumentPicker from "expo-document-picker";
import type { ImportedStickerAsset, ImportMode } from "./types";

const MIME_BY_EXTENSION: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
};

function supported(name: string): boolean {
  return /\.(webp|png|jpe?g|gif)$/i.test(name);
}

function mimeFor(name: string, fileType: string): string {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return fileType || MIME_BY_EXTENSION[extension] || "image/webp";
}

export async function importStickers(_mode: ImportMode): Promise<ImportedStickerAsset[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/webp", "image/png", "image/jpeg", "image/gif"],
    multiple: true,
    copyToCacheDirectory: true,
    base64: false,
  });
  if (result.canceled) return [];
  const assets: ImportedStickerAsset[] = [];
  for (const asset of result.assets) {
    if (!supported(asset.name)) continue;
    try {
      let blob: Blob;
      if (asset.file) {
        blob = asset.file;
      } else {
        const response = await fetch(asset.uri);
        if (!response.ok) throw new Error("The selected file could not be read.");
        blob = await response.blob();
      }
      assets.push({
        name: asset.name,
        uri: URL.createObjectURL(blob),
        mimeType: mimeFor(asset.name, asset.mimeType ?? blob.type),
        size: asset.size ?? blob.size,
        blob,
      });
    } catch {
      // Continue with the rest of a multi-file selection.
    }
  }
  return assets;
}

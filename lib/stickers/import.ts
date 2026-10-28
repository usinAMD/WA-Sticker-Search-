import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
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

function fileNameFromUri(uri: string): string {
  const lastPart = uri.split(/[/?#]/).filter(Boolean).pop() ?? "sticker.webp";
  try {
    return decodeURIComponent(lastPart);
  } catch {
    return lastPart;
  }
}

function mimeFor(name: string, fallback?: string | null): string {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? fallback ?? "image/webp";
}

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 90);
  return cleaned || `sticker-${Date.now()}.webp`;
}

async function copyIntoPrivateStorage(uri: string, name: string, mimeType?: string | null, knownSize?: number): Promise<ImportedStickerAsset> {
  const root = FileSystem.documentDirectory;
  if (!root) throw new Error("Private app storage is unavailable on this device.");
  const folder = `${root}stickly/`;
  await FileSystem.makeDirectoryAsync(folder, { intermediates: true }).catch(() => undefined);
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const localUri = `${folder}${id}-${safeFileName(name)}`;
  await FileSystem.copyAsync({ from: uri, to: localUri });
  const info = await FileSystem.getInfoAsync(localUri).catch(() => null);
  return {
    name,
    uri: localUri,
    mimeType: mimeFor(name, mimeType),
    size: knownSize ?? (info && "size" in info ? info.size ?? 0 : 0),
  };
}

async function importFromWhatsAppFolder(): Promise<ImportedStickerAsset[]> {
  if (Platform.OS !== "android") return [];
  const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) return [];
  const uris = await FileSystem.StorageAccessFramework.readDirectoryAsync(permissions.directoryUri);
  const imageUris = uris.filter((uri) => supported(fileNameFromUri(uri)));
  const assets: ImportedStickerAsset[] = [];
  for (const uri of imageUris) {
    const name = fileNameFromUri(uri);
    try {
      assets.push(await copyIntoPrivateStorage(uri, name));
    } catch {
      // A provider may expose a file that cannot be copied; keep importing other supported images.
    }
  }
  return assets;
}

async function importSelectedFiles(): Promise<ImportedStickerAsset[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/webp", "image/png", "image/jpeg", "image/gif"],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  const candidates = result.assets.filter((asset) => supported(asset.name));
  const assets: ImportedStickerAsset[] = [];
  for (const asset of candidates) {
    try {
      assets.push(await copyIntoPrivateStorage(asset.uri, asset.name, asset.mimeType, asset.size));
    } catch {
      // A single unreadable file should not cancel a multi-file import.
    }
  }
  return assets;
}

export async function importStickers(mode: ImportMode): Promise<ImportedStickerAsset[]> {
  if (mode === "folder" && Platform.OS === "android") return importFromWhatsAppFolder();
  return importSelectedFiles();
}

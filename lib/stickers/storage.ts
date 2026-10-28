import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import type { StickerRecord } from "./types";

const STORAGE_KEY = "@stickly/library/v1";

async function readAll(): Promise<StickerRecord[]> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as StickerRecord[];
    return Array.isArray(parsed) ? parsed.filter((item) => item.source === "imported") : [];
  } catch {
    return [];
  }
}

export async function loadStickers(): Promise<StickerRecord[]> {
  return readAll();
}

export async function saveSticker(sticker: StickerRecord, _blob?: Blob): Promise<void> {
  const current = await readAll();
  const next = [sticker, ...current.filter((item) => item.id !== sticker.id)];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function removeSticker(id: string): Promise<void> {
  const current = await readAll();
  const removed = current.find((item) => item.id === id);
  const next = current.filter((item) => item.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  if (removed?.uri && FileSystem.documentDirectory && removed.uri.startsWith(FileSystem.documentDirectory)) {
    await FileSystem.deleteAsync(removed.uri, { idempotent: true }).catch(() => undefined);
  }
}

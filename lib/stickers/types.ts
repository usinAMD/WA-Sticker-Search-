export type StickerSource = "imported" | "demo";

export type StickerRecord = {
  id: string;
  name: string;
  uri: string;
  mimeType: string;
  size: number;
  ocrText: string;
  tags: string[];
  description: string;
  createdAt: number;
  indexedAt: number;
  source: StickerSource;
};

export type ImportedStickerAsset = {
  name: string;
  uri: string;
  mimeType: string;
  size: number;
  blob?: Blob;
};

export type ImportMode = "folder" | "files";

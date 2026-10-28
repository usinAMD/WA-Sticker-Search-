import { expandTokenVariants, getConceptLabels, getConceptTerms, normalizeText, tokenize } from "./normalize";
import type { ImportedStickerAsset, StickerRecord } from "./types";
import { recognizeStickerText } from "./ocr";

const STOP_WORDS = new Set(["the", "and", "for", "this", "that", "with", "from", "sticker", "image", "whatsapp", "media", "copy", "new"]);

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function generateTags(name: string, ocrText: string): string[] {
  const source = `${name} ${ocrText}`;
  const concepts = getConceptLabels(source);
  const conceptTerms = concepts.flatMap((label) => getConceptTerms(label));
  const textTokens = tokenize(source)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .slice(0, 8);
  const romanTokens = textTokens.map((token) => expandTokenVariants(token).find((variant) => variant !== token) ?? "");
  const scriptTags = /[\u0900-\u097f]/u.test(ocrText) ? ["Hindi", "Devanagari"] : [];
  return unique([...concepts, ...conceptTerms, ...textTokens, ...romanTokens, ...scriptTags]).slice(0, 12);
}

function makeDescription(name: string, ocrText: string, tags: string[]): string {
  const detected = getConceptLabels(`${name} ${ocrText}`);
  const snippet = ocrText.replace(/\s+/g, " ").trim().slice(0, 54);
  if (detected.length) {
    return `${detected[0][0].toUpperCase()}${detected[0].slice(1)} reaction${snippet ? ` with “${snippet}”` : ""}.`;
  }
  if (snippet) return `Contains “${snippet}”.`;
  if (tags.length) return `A ${tags[0]} reaction. Add a tag if you want to make it easier to find.`;
  const readableName = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return readableName ? `Imported as “${readableName}”. Add a few tags to make it easier to find.` : "Imported sticker. Add a few tags to make it easier to find.";
}

export async function indexSticker(asset: ImportedStickerAsset): Promise<StickerRecord> {
  let ocrText = "";
  try {
    ocrText = await recognizeStickerText(asset.uri, asset.blob);
  } catch {
    // Keep the sticker available even if an OCR engine is unavailable on this device.
  }

  const tags = generateTags(asset.name, ocrText);
  const now = Date.now();
  return {
    id: `st_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: asset.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled sticker",
    uri: asset.uri,
    mimeType: asset.mimeType || "image/webp",
    size: asset.size,
    ocrText,
    tags,
    description: makeDescription(asset.name, ocrText, tags),
    createdAt: now,
    indexedAt: now,
    source: "imported",
  };
}

export function suggestedTagsFromText(value: string): string[] {
  const concepts = getConceptLabels(value);
  const tokens = tokenize(value).filter((token) => token.length > 2 && !STOP_WORDS.has(token));
  return unique([...concepts, ...concepts.flatMap(getConceptTerms), ...tokens]).slice(0, 12);
}

export function hasSearchableContent(sticker: StickerRecord): boolean {
  return Boolean(normalizeText(`${sticker.name} ${sticker.ocrText} ${sticker.tags.join(" ")}`));
}

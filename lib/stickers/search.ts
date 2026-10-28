import { expandTokenVariants, getConceptLabels, normalizeText, tokenize } from "./normalize";
import type { StickerRecord } from "./types";

const FIELD_WEIGHTS = [
  { key: "name", weight: 8 },
  { key: "tags", weight: 9 },
  { key: "ocrText", weight: 7 },
  { key: "description", weight: 4 },
] as const;

type SearchField = (typeof FIELD_WEIGHTS)[number]["key"];
type IndexedSticker = {
  fieldTokens: Map<SearchField, string[]>;
  searchableText: string;
};

const stickerIndexCache = new WeakMap<StickerRecord, IndexedSticker>();
const tokenVariantCache = new Map<string, string[]>();
const TOKEN_VARIANT_CACHE_LIMIT = 512;

function variantsForToken(token: string): string[] {
  const normalized = normalizeText(token);
  const cached = tokenVariantCache.get(normalized);
  if (cached) return cached;

  const variants = expandTokenVariants(normalized);
  if (tokenVariantCache.size >= TOKEN_VARIANT_CACHE_LIMIT) tokenVariantCache.clear();
  tokenVariantCache.set(normalized, variants);
  return variants;
}

function indexSticker(sticker: StickerRecord): IndexedSticker {
  const cached = stickerIndexCache.get(sticker);
  if (cached) return cached;

  const fieldTokens = new Map<SearchField, string[]>();
  for (const field of FIELD_WEIGHTS) {
    const value = field.key === "tags" ? sticker.tags.join(" ") : sticker[field.key];
    fieldTokens.set(field.key, tokenize(value));
  }

  const indexed = {
    fieldTokens,
    searchableText: normalizeText([
      sticker.name,
      sticker.ocrText,
      sticker.description,
      sticker.tags.join(" "),
    ].join(" ")),
  };
  stickerIndexCache.set(sticker, indexed);
  return indexed;
}

function editDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + cost,
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function tokenMatchScore(variants: string[], queryToken: string, candidate: string): number {
  if (variants.includes(candidate)) return 1;
  if (variants.some((variant) => candidate.startsWith(variant) || variant.startsWith(candidate))) return 0.74;

  if (queryToken.length < 4 || candidate.length < 4) return 0;
  const threshold = Math.min(2, Math.floor(Math.max(queryToken.length, candidate.length) / 4));
  let distance = Number.POSITIVE_INFINITY;
  for (const variant of variants) {
    distance = Math.min(distance, editDistance(variant, candidate));
    if (distance === 0) break;
  }
  return distance <= threshold ? 0.52 - distance * 0.08 : 0;
}

function scoreSticker(
  indexed: IndexedSticker,
  normalizedQuery: string,
  queryTokens: string[],
  queryVariants: string[][],
): number {
  let score = 0;
  let matchedTokens = 0;

  for (let index = 0; index < queryTokens.length; index += 1) {
    const queryToken = queryTokens[index];
    const variants = queryVariants[index];
    let bestFieldScore = 0;

    for (const field of FIELD_WEIGHTS) {
      const candidates = indexed.fieldTokens.get(field.key) ?? [];
      for (const candidate of candidates) {
        bestFieldScore = Math.max(bestFieldScore, tokenMatchScore(variants, queryToken, candidate) * field.weight);
      }
    }

    if (bestFieldScore > 0) {
      score += bestFieldScore;
      matchedTokens += 1;
    }
  }

  if (!matchedTokens) return 0;
  const coverage = matchedTokens / queryTokens.length;
  score += coverage * 6;

  const romanizedQuery = queryTokens
    .map((token, index) => queryVariants[index][1] ?? token)
    .join(" ");
  if (indexed.searchableText.includes(normalizedQuery) || (romanizedQuery && indexed.searchableText.includes(romanizedQuery))) {
    score += 5;
  }

  return score * coverage;
}

const RELATED_CONCEPTS: Record<string, string[]> = {
  happy: ["laugh", "celebration", "love", "shy"],
  laugh: ["happy", "surprise", "celebration"],
  love: ["happy", "shy"],
  good: ["yes", "chai"],
  yes: ["good", "celebration"],
  no: ["angry", "good"],
  sad: ["love", "shy"],
  angry: ["no", "surprise"],
  shy: ["love", "happy"],
  chai: ["good", "happy"],
  celebration: ["happy", "laugh", "surprise"],
  surprise: ["laugh", "celebration", "happy"],
};

export function suggestRelatedStickers(
  stickers: StickerRecord[],
  query: string,
  primaryResults: StickerRecord[],
  limit = 4,
): StickerRecord[] {
  if (!normalizeText(query) || limit <= 0) return [];

  const queryConcepts = getConceptLabels(query);
  const anchors = queryConcepts.length
    ? queryConcepts
    : Array.from(new Set(primaryResults.slice(0, 3).flatMap((sticker) =>
        getConceptLabels(`${sticker.name} ${sticker.ocrText} ${sticker.description} ${sticker.tags.join(" ")}`),
      )));
  const relatedLabels = new Set(anchors.flatMap((label) => RELATED_CONCEPTS[label] ?? []));
  if (!relatedLabels.size) return [];

  const primaryIds = new Set(primaryResults.map((sticker) => sticker.id));
  return stickers
    .filter((sticker) => !primaryIds.has(sticker.id))
    .map((sticker) => {
      const labels = getConceptLabels(`${sticker.name} ${sticker.ocrText} ${sticker.description} ${sticker.tags.join(" ")}`);
      const score = labels.reduce((total, label) => total + (relatedLabels.has(label) ? 1 : 0), 0);
      return { sticker, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || right.sticker.createdAt - left.sticker.createdAt)
    .slice(0, limit)
    .map((item) => item.sticker);
}

export function searchStickers(stickers: StickerRecord[], query: string): StickerRecord[] {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return stickers.slice();

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];
  const queryVariants = queryTokens.map(variantsForToken);

  return stickers
    .map((sticker) => ({
      sticker,
      score: scoreSticker(indexSticker(sticker), normalizedQuery, queryTokens, queryVariants),
    }))
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || right.sticker.createdAt - left.sticker.createdAt)
    .map((result) => result.sticker);
}

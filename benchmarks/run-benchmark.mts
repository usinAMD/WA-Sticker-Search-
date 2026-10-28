import { readFile, mkdir, writeFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { createRequire } from "node:module";
import Tesseract from "tesseract.js";
import type { StickerRecord } from "../lib/stickers/types";

const require = createRequire(import.meta.url);
const { normalizeText } = require("../lib/stickers/normalize.ts") as { normalizeText: (value: string) => string };
const { searchStickers } = require("../lib/stickers/search.ts") as { searchStickers: (records: StickerRecord[], query: string) => StickerRecord[] };

type Fixture = {
  id: string;
  text: string;
  concept: string;
  queries: string[];
  difficulty: string;
  file: string;
};
type Manifest = { dataset: string; synthetic: boolean; cases: Fixture[] };

const root = path.resolve("benchmarks");
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8")) as Manifest;
const outputDir = path.join(root, "results");
const cacheDir = path.join(outputDir, ".tessdata-cache");
await mkdir(cacheDir, { recursive: true });
const initialCacheFiles = new Set(await readdir(cacheDir).catch(() => []));
const languageModelsCachedAtStart = ["eng.traineddata", "hin.traineddata"].every((file) => initialCacheFiles.has(file));

const elapsed = (start: number) => performance.now() - start;
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
};

function editDistance(a: string[], b: string[]): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const next = [i];
    for (let j = 1; j <= b.length; j += 1) {
      next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + Number(a[i - 1] !== b[j - 1]));
    }
    row = next;
  }
  return row[b.length];
}

const workerStart = performance.now();
const worker = await Tesseract.createWorker("eng+hin", undefined, {
  logger: (message) => {
    if (process.env.BENCH_VERBOSE === "1") console.error(message.status, `${Math.round(message.progress * 100)}%`);
  },
  cachePath: cacheDir,
});
const coldInitMs = elapsed(workerStart);

const ocrRows: Array<{
  id: string;
  expected: string;
  recognized: string;
  concept: string;
  queries: string[];
  difficulty: string;
  confidence: number;
  confidenceSource: "mean-word" | "page";
  elapsedMs: number;
  normalizedCer: number;
}> = [];
const records: StickerRecord[] = [];

try {
  for (const fixture of manifest.cases) {
    const image = await readFile(path.join(root, fixture.file));
    const start = performance.now();
    const result = await worker.recognize(image);
    const elapsedMs = elapsed(start);
    const recognized = result.data.text.trim();
    const expectedTokens = Array.from(normalizeText(fixture.text));
    const recognizedTokens = Array.from(normalizeText(recognized));
    const normalizedCer = expectedTokens.length
      ? editDistance(expectedTokens, recognizedTokens) / expectedTokens.length
      : 0;
    const wordConfidence = (result.data.words ?? []).map((word) => word.confidence).filter(Number.isFinite);
    const confidence = wordConfidence.length
      ? wordConfidence.reduce((sum, value) => sum + value, 0) / wordConfidence.length
      : Number(result.data.confidence ?? 0);
    const confidenceSource = wordConfidence.length ? "mean-word" : "page";

    ocrRows.push({
      id: fixture.id,
      expected: fixture.text,
      recognized,
      concept: fixture.concept,
      queries: fixture.queries,
      difficulty: fixture.difficulty,
      confidence,
      confidenceSource,
      elapsedMs,
      normalizedCer,
    });

    records.push({
      id: fixture.id,
      name: `Fixture ${fixture.id.slice(-2)}`,
      uri: fixture.file,
      mimeType: "image/png",
      size: image.byteLength,
      ocrText: recognized,
      tags: [],
      description: "",
      createdAt: 1,
      indexedAt: 1,
      source: "imported",
    });
  }
} finally {
  await worker.terminate();
}

// Measure the actual app search ranking over only OCR-recognized text (no filename/tag leakage).
const retrievalRows: Array<{ query: string; targetId: string; rank: number | null; top1: boolean; reciprocalRank: number }> = [];
for (const fixture of manifest.cases) {
  for (const query of fixture.queries) {
    const ranked = searchStickers(records, query);
    const index = ranked.findIndex((record) => record.id === fixture.id);
    retrievalRows.push({
      query,
      targetId: fixture.id,
      rank: index < 0 ? null : index + 1,
      top1: index === 0,
      reciprocalRank: index < 0 ? 0 : 1 / (index + 1),
    });
  }
}

const timedQueries = retrievalRows.map((row) => row.query);
for (const query of timedQueries) searchStickers(records, query); // one warm-up pass
const searchTimes: number[] = [];
for (let repeat = 0; repeat < 20; repeat += 1) {
  for (const query of timedQueries) {
    const start = performance.now();
    searchStickers(records, query);
    searchTimes.push(elapsed(start));
  }
}

const searchScale: Array<{ librarySize: number; measuredQueryRuns: number; p50Ms: number; p95Ms: number; maxMs: number }> = [];
for (const librarySize of [12, 100, 500, 1000]) {
  const scaledRecords = Array.from({ length: librarySize }, (_, index) => ({
    ...records[index % records.length],
    id: `scale-${librarySize}-${index}`,
    createdAt: index,
  }));
  for (const query of timedQueries) searchStickers(scaledRecords, query);

  const timings: number[] = [];
  for (let repeat = 0; repeat < 5; repeat += 1) {
    for (const query of timedQueries) {
      const start = performance.now();
      searchStickers(scaledRecords, query);
      timings.push(elapsed(start));
    }
  }
  searchScale.push({
    librarySize,
    measuredQueryRuns: timings.length,
    p50Ms: Number(percentile(timings, 0.5).toFixed(3)),
    p95Ms: Number(percentile(timings, 0.95).toFixed(3)),
    maxMs: Number(Math.max(...timings).toFixed(3)),
  });
}

const ocrTimes = ocrRows.map((row) => row.elapsedMs);
const meanCer = ocrRows.reduce((sum, row) => sum + row.normalizedCer, 0) / ocrRows.length;
const exactNormalized = ocrRows.filter((row) => row.normalizedCer === 0).length;
const retrievalTop1 = retrievalRows.filter((row) => row.top1).length;
const retrievalHit3 = retrievalRows.filter((row) => row.rank !== null && row.rank <= 3).length;
const meanReciprocalRank = retrievalRows.reduce((sum, row) => sum + row.reciprocalRank, 0) / retrievalRows.length;
const ocrOrder = [...ocrRows].sort((a, b) => b.elapsedMs - a.elapsedMs);
const summary = {
  dataset: manifest.dataset,
  synthetic: manifest.synthetic,
  measuredAt: new Date().toISOString(),
  runtime: { node: process.version, platform: process.platform, arch: process.arch, tesseract: "tesseract.js 7.0.0", languages: "eng+hin", ocrWorkers: 1 },
  corpus: { imageCount: ocrRows.length, queryCount: retrievalRows.length, searchCollectionSize: records.length },
  ocr: {
    workerAndLanguageInitMs: Math.round(coldInitMs),
    languageModelsCachedAtStart,
    totalWarmRecognitionMs: Math.round(ocrTimes.reduce((sum, n) => sum + n, 0)),
    perImageMs: { median: Math.round(percentile(ocrTimes, 0.5)), p95: Math.round(percentile(ocrTimes, 0.95)), min: Math.round(Math.min(...ocrTimes)), max: Math.round(Math.max(...ocrTimes)) },
    normalizedCharacterErrorRateMean: Number(meanCer.toFixed(4)),
    exactNormalizedTranscriptions: exactNormalized,
    meanConfidence: Number((ocrRows.reduce((sum, row) => sum + row.confidence, 0) / ocrRows.length).toFixed(2)),
    confidenceSources: Array.from(new Set(ocrRows.map((row) => row.confidenceSource))),
    slowestImages: ocrOrder.slice(0, 3).map(({ id, elapsedMs }) => ({ id, elapsedMs: Math.round(elapsedMs) })),
  },
  search: {
    directOcrFieldsOnly: true,
    measuredQueryRuns: searchTimes.length,
    p50Ms: Number(percentile(searchTimes, 0.5).toFixed(3)),
    p95Ms: Number(percentile(searchTimes, 0.95).toFixed(3)),
    maxMs: Number(Math.max(...searchTimes).toFixed(3)),
    scaleWorkload: "Search timing only; for sizes above 12 the twelve OCR fixture records are repeated with distinct IDs, so no accuracy inference is made.",
    scale: searchScale,
    targetTop1: `${retrievalTop1}/${retrievalRows.length}`,
    targetRecallAt3: `${retrievalHit3}/${retrievalRows.length}`,
    meanReciprocalRank: Number(meanReciprocalRank.toFixed(4)),
  },
  perImage: ocrRows.map((row) => ({
    id: row.id,
    expected: row.expected,
    recognized: row.recognized,
    concept: row.concept,
    confidence: Number(row.confidence.toFixed(2)),
    confidenceSource: row.confidenceSource,
    normalizedCer: Number(row.normalizedCer.toFixed(4)),
    ocrMs: Math.round(row.elapsedMs),
  })),
  retrieval: retrievalRows,
};

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
const csvEscape = (value: unknown) => `"${String(value).replaceAll('"', '""')}"`;
const csvRows = [
  ["id", "expected", "recognized", "concept", "confidence", "confidence_source", "normalized_cer", "ocr_ms"],
  ...ocrRows.map((row) => [row.id, row.expected, row.recognized, row.concept, row.confidence.toFixed(2), row.confidenceSource, row.normalizedCer.toFixed(4), row.elapsedMs.toFixed(1)]),
];
await writeFile(path.join(outputDir, "ocr-results.csv"), csvRows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n");
const retrievalCsv = [
  ["query", "target_id", "rank", "top1", "reciprocal_rank"],
  ...retrievalRows.map((row) => [row.query, row.targetId, row.rank ?? "", row.top1, row.reciprocalRank.toFixed(4)]),
];
await writeFile(path.join(outputDir, "search-results.csv"), retrievalCsv.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n");
const scaleCsv = [
  ["library_size", "measured_query_runs", "p50_ms", "p95_ms", "max_ms"],
  ...searchScale.map((row) => [row.librarySize, row.measuredQueryRuns, row.p50Ms, row.p95Ms, row.maxMs]),
];
await writeFile(path.join(outputDir, "search-scale.csv"), scaleCsv.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n");
console.log(JSON.stringify(summary, null, 2));

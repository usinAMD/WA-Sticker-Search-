# Stickly OCR and multilingual-search benchmark

## Status

The checked-in `results/summary.json` is a **pre-optimization baseline**. It was measured before the current search implementation added per-sticker/query caching and the `mast`/`party`/question-word concept expansions. Do not treat its search latency or retrieval scores as measurements of the current implementation. The benchmark runner has since been extended with search scaling and confidence-source reporting; rerun it to produce current outputs.

## Baseline snapshot

This controlled set contains 12 locally generated synthetic text-sticker images and 36 English, Hinglish, and Hindi queries. It is useful for repeatable OCR and retrieval regression checks, but it is not a sample of real users' WhatsApp sticker libraries.

The recorded run used Node.js 22.23.4 on Linux x64, Tesseract.js 7.0.0, English + Hindi (`eng+hin`), and one OCR worker. The OCR language data was not cached at startup; worker/model initialization took 543 ms. Warm image recognition had 80 ms median and 183 ms p95 latency. Mean normalized character error rate was 0.216, with 5/12 exact normalized transcriptions; one Devanagari fixture produced no OCR text.

With search fields limited to OCR output, the baseline recorded 720 warmed searches over a 12-sticker collection: 32.532 ms p50 and 34.737 ms p95. The expected sticker ranked first for 23/36 queries and appeared in the top three for 30/36; mean reciprocal rank was 0.7361. Query failures informed the later synonym coverage improvements.

## Re-run

From the project root, run:

```sh
BENCH_VERBOSE=1 pnpm exec tsx benchmarks/run-benchmark.mts
```

The runner writes JSON and CSV results under `benchmarks/results/`. Its ignored `.tessdata-cache` stores downloaded benchmark language data; do not commit that cache. The updated runner also reports warm search latency at 12, 100, 500, and 1,000 records. At sizes above 12, it repeats the same fixture records with distinct IDs, so those timings measure ranking cost only—not retrieval accuracy at those library sizes.

## Interpretation limits

This benchmark evaluates the Tesseract.js path in Node, not Android's bundled on-device ML Kit OCR. Browser OCR also requires a first-use download of its worker/language resources; sticker images themselves are processed locally and are not uploaded by the benchmark or app. Performance on actual WhatsApp sticker images may differ substantially; use user-provided, permissioned images for a representative evaluation.

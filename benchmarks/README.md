# Stickly OCR and multilingual-search benchmark

## Current measured run

`results/summary.json` contains the current search-optimized run; `results/baseline-summary.json` preserves the earlier pre-optimization measurements. The fixture corpus contains 12 locally generated synthetic text stickers and 36 English, Hinglish, and Hindi queries. It is designed for repeatable regression checks, not as a representative sample of users' WhatsApp libraries.

The current run measured 720 warmed searches over the 12-record collection at **0.561 ms p50** and **0.955 ms p95**. The expected sticker ranked first for **25/36** queries and appeared in the top three for **33/36**; mean reciprocal rank was **0.8056**. Relative to the saved baseline (32.532 ms p50, 34.737 ms p95, 23/36 top-1, 30/36 top-3), search latency was about **58× faster at p50** and **36× faster at p95**. The measured retrieval gains came from the `mast`/happy and `party`/celebration expansions. Question-word aliases have separate unit coverage; the short Devanagari question sticker still has no OCR text and remains a benchmark miss.

### Warm search latency by collection size

| Records | Queries | p50 | p95 | Maximum |
| ---: | ---: | ---: | ---: | ---: |
| 12 | 180 | 0.563 ms | 1.012 ms | 1.806 ms |
| 100 | 180 | 4.905 ms | 6.275 ms | 12.120 ms |
| 500 | 180 | 24.710 ms | 31.725 ms | 49.367 ms |
| 1,000 | 180 | 48.300 ms | 61.711 ms | 97.099 ms |

At sizes above 12, the runner repeats the same 12 OCR-derived fixture records with distinct IDs. Those larger-size timings measure ranking computation only; they do **not** demonstrate retrieval accuracy for 100, 500, or 1,000 unique stickers.

## OCR results and limits

This run used Node.js 22.23.4 on Linux x64, Tesseract.js 7.0.0, English + Hindi (`eng+hin`), and one worker. Language data was already cached when the run began; worker/model initialization took 380 ms. Warm recognition had 84 ms median and 196 ms p95 latency. Mean normalized character error rate was **0.216**, with **5/12** exact normalized transcriptions; one short Devanagari fixture returned no OCR text. The reported mean confidence (75.5) is page-level confidence, not word-level confidence.

This measures the Tesseract.js path in Node, not Android's bundled on-device ML Kit OCR. Browser OCR also fetches worker/language resources on first use; sticker images are processed locally and are not uploaded by the benchmark or app. Results on real WhatsApp sticker images can differ substantially; use user-provided, permissioned images for representative evaluation.

## Re-run

From the project root:

```sh
BENCH_VERBOSE=1 pnpm exec tsx benchmarks/run-benchmark.mts
```

The runner writes JSON and CSV results under `benchmarks/results/`. Its ignored `.tessdata-cache` stores downloaded benchmark language data; do not commit that cache. The runner uses the app's search ranking over OCR output, without filename/tag leakage in its retrieval measurements.

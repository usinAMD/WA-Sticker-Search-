# Stickly implementation plan

## Product scope

Stickly is an Android-first, private sticker finder for a user's own WhatsApp sticker files, with a companion web experience for importing user-owned image files. Users can retrieve a sticker with English, Hindi, Hinglish, Romanized Hindi, or Devanagari queries; imprecise queries should still find related stickers, and a selected sticker can be shared back through the operating system's WhatsApp share flow. The app will not scrape or browse public sticker packs, and a custom keyboard is deferred.

## Implementation approach

Keep the fixed Expo Router / React Native / TypeScript starter and build one portrait-first search/library screen that runs on Android and Expo Web. Use a responsive, virtualized FlatList so hundreds of results do not all mount at once. On Android, use the system Storage Access Framework to let the user explicitly grant a WhatsApp sticker folder, copy supported sticker images into app-private document storage, persist metadata in AsyncStorage, and share a local sticker file through the native share sheet. On Web, use Expo DocumentPicker for multi-file upload, retain sticker blobs and metadata in browser IndexedDB, and offer Web Share where supported or a download fallback. No user images or metadata are sent to the app server.

Index each imported item once on-device. Use Google ML Kit OCR through an Expo-compatible native module for Latin and Devanagari on Android, and a browser OCR worker for Web. Generate a short, inspectable description and tags locally from OCR text, the source filename, and a small bilingual synonym/concept lexicon; expose the OCR result and allow tag correction when the automatic index is sparse. Do not claim image-recognition labels that are not available locally. Search locally with Unicode normalization, Devanagari-to-Roman transliteration, spelling variants, synonyms/concept expansion, token coverage, and bounded edit-distance scoring. Blend field-weighted text matches into a ranked result list and show related suggestions when the query is ambiguous or returns few exact matches. This is a privacy-preserving semantic baseline, not a remote embedding service.

Seed only clearly labeled, built-in sample records for preview/demo search. They are not presented as imported user stickers and cannot be shared. Once a user imports real stickers, prioritize the user's collection and keep sample content separate. Use the managed database/server only as unused starter infrastructure; do not create accounts, upload image assets, or persist personal sticker data remotely.

## Project structure

- `app/(tabs)/index.tsx`: main search, library, import, result, and detail/share UI.
- `app/(tabs)/_layout.tsx`: app navigation presentation, adapted from the single-screen starter.
- `lib/stickers/types.ts`: shared sticker, import, and index types.
- `lib/stickers/normalize.ts`: Unicode normalization, transliteration, spelling aliases, and query expansion.
- `lib/stickers/search.ts`: deterministic hybrid ranking and related-result selection.
- `lib/stickers/indexing.ts`: one-time local OCR orchestration, tag/description generation, and progress reporting.
- `lib/stickers/ocr.ts` / `ocr.web.ts`: native ML Kit OCR and browser-local OCR.
- `lib/stickers/storage.ts` / `storage.web.ts`: app-private file + AsyncStorage on Android and IndexedDB on Web.
- `lib/stickers/import.ts` / `import.web.ts`: SAF folder selection and browser/device multi-file import.
- `lib/stickers/share.ts` / `share.web.ts`: native share sheet and Web Share/download behavior.
- `tests/sticker-search.test.ts`: focused tests for normalization, transliteration, fuzzy ranking, and bilingual synonym cases.
- `app.config.ts` and `assets/images/*`: Stickly branding and native icon configuration, preserving generated package identifiers and required Expo starter fields.

## Design system

Three distinct styles considered: **Tactile sticker-book editorial** (0.08); **Neon chat arcade** (0.06); **Quiet utility catalog** (0.07). Chosen: Tactile sticker-book editorial.

- **Design Movement:** contemporary sticker-book editorial, translated into a crisp native app rather than a scrapbook collage.
- **Core Principles:** search is the first action; imported art stays visually dominant; playful color never obscures metadata; local processing is explained plainly.
- **Color Philosophy:** warm paper (`#FFF9F0`) and ink (`#242326`) make a calm reading surface; persimmon (`#F26B4F`) is the ownable action color; marigold (`#F4C95D`), lilac (`#CBB8F2`), and mint (`#BFE7D6`) separate moods and result groups.
- **Layout Paradigm:** a single asymmetric search shelf above horizontal intent chips and a compact two-column sticker gallery; on wider screens the gallery becomes a centered, wider desktop canvas without changing the mobile-first information order.
- **Signature Elements:** die-cut white sticker tiles with a fine ink outline; small persimmon peel-corner marks; tiny mood-color labels for detected language/tag groups.
- **Interaction Philosophy:** every import, result, and share action has a clear, low-friction next step; indexing progress is visible; destructive removal asks for confirmation.
- **Animation:** short 140–180 ms press-scale and opacity feedback, a restrained progress shimmer during indexing, and no continuous decorative motion.
- **Typography System:** native system sans for Hindi/Devanagari coverage; strong 30–34 pt display title, 16–18 pt query/result titles, 12–14 pt metadata, with weight rather than extra typefaces for hierarchy.
- **Brand Essence:** a private, meaning-aware shelf for the stickers you already use; **quick, warm, clever**.
- **Brand Voice:** direct, playful, and specific. Example lines: “Find the sticker. Keep the moment.” and “Try ‘hasna’, ‘happy’, or ‘हँसी’.”
- **Wordmark & Logo:** a compact die-cut sticker tile and magnifier forming an expressive search mark; the wordmark uses a hand-curved lower-case silhouette alongside the icon, with no generated letterforms relied on for exact text.
- **Signature Brand Color:** persimmon `#F26B4F`.

## Material constraints

WhatsApp does not expose a public API for retrieving a person's saved stickers. Android imports must therefore use an explicit system folder grant or file picker. The Web companion can import files selected by the user but cannot browse WhatsApp's private device folders. Web Tesseract.js loads its worker and English/Hindi language data from its default CDN on first OCR use; that setup is not guaranteed to work offline initially, but sticker images and OCR results stay in browser-local storage and are not uploaded. The exact native OCR model and Expo modules must be installed and configured for an EAS/native build; the current Preview validates the Web experience, not native device behavior. There is no automatic public pack discovery, cloud OCR, or custom keyboard in this MVP.

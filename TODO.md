# Build outcomes

## User-owned sticker imports and local library — in progress
- Android-first sticker library displays the user's imported WhatsApp sticker collection.
- Android lets the user choose/grant access to the WhatsApp sticker folder or select sticker files through the system picker; supported image files are copied into app-private storage, and the app does not read the folder before permission is granted.
- Companion Web experience lets the user select and import multiple sticker image files into a local library.
- Library supports user-owned imported files and packs only. Do not scrape or browse public sticker packs.

## One-time private indexing — in progress
- Each sticker is indexed once on-device using OCR plus generated tags and a short description.
- OCR and metadata indexing stay on the user's device/browser; do not upload sticker images or personal sticker metadata to the server.
- Store searchable index fields locally and allow a user to correct/add tags when OCR yields little text.

## English, Hinglish, and Hindi search — complete
- Search the user's own sticker library in English, Hinglish, and Hindi.
- Handle varied Roman spellings and Devanagari transliteration so common variants such as “accha”, “acha”, and “achha” can reach the same meaning.
- Use fuzzy matching, synonym/concept expansion, and meaning-related matches to prioritize relevant stickers rather than requiring an exact filename.

## Ranked results and related suggestions — complete
- Show ranked sticker matches for a search query.
- Suggest related matching stickers for ambiguous or imperfect queries, prioritizing the user's own collection.
- Keep any built-in sample records visibly labeled as demo content and separate from the user's imported collection.

## Share back to WhatsApp — in progress
- A user can tap a selected imported sticker and share it to WhatsApp through the Android system share sheet.
- On Web, offer Web Share when available and a download fallback where direct app sharing is unsupported.

## Android and Web experience — in progress
- Provide an Android-first, one-handed portrait interface and a companion Web import/search experience.
- The main search/library interface explains local import, indexing, and sharing clearly; no custom keyboard is part of this MVP.
- Deliver a distinct Stickly launcher icon and preserve the Expo starter's app identifiers and required configuration.

import type { StickerRecord } from "./types";

const now = Date.now();

export const DEMO_STICKERS: StickerRecord[] = [
  { id: "demo-laugh", name: "Can't stop laughing", uri: "", mimeType: "", size: 0, ocrText: "", tags: ["laugh", "funny", "hasi", "hansi", "hasna", "हँसी", "हँसना", "😂", "🤣"], description: "For the moment when the joke lands too well.", createdAt: now - 1, indexedAt: now, source: "demo" },
  { id: "demo-love", name: "Sending pyaar", uri: "", mimeType: "", size: 0, ocrText: "", tags: ["love", "pyaar", "pyar", "प्यार", "दिल", "🫶", "❤️"], description: "A warm little love note for your chat.", createdAt: now - 2, indexedAt: now, source: "demo" },
  { id: "demo-good", name: "Accha ji", uri: "", mimeType: "", size: 0, ocrText: "", tags: ["good", "nice", "accha", "acha", "achha", "अच्छा", "okay", "👍"], description: "The perfect little yes, got it, or nice one.", createdAt: now - 3, indexedAt: now, source: "demo" },
  { id: "demo-chai", name: "Chai break", uri: "", mimeType: "", size: 0, ocrText: "", tags: ["chai", "चाय", "tea", "coffee", "break", "☕"], description: "A tiny pause, preferably with chai.", createdAt: now - 4, indexedAt: now, source: "demo" },
  { id: "demo-happy", name: "Khushi mode", uri: "", mimeType: "", size: 0, ocrText: "", tags: ["happy", "joy", "khushi", "khush", "खुशी", "खुश", "smile", "😊", "🎉"], description: "A bright reaction for good news.", createdAt: now - 5, indexedAt: now, source: "demo" },
  { id: "demo-yes", name: "Haan ji", uri: "", mimeType: "", size: 0, ocrText: "", tags: ["yes", "haan", "han", "हाँ", "हां", "sure", "🙌", "✅"], description: "A cheerful, no-doubt yes.", createdAt: now - 6, indexedAt: now, source: "demo" },
  { id: "demo-sad", name: "Thoda sa sad", uri: "", mimeType: "", size: 0, ocrText: "", tags: ["sad", "udaas", "उदास", "cry", "rona", "रोना", "🥲", "😢"], description: "For the soft, slightly dramatic days.", createdAt: now - 7, indexedAt: now, source: "demo" },
  { id: "demo-shy", name: "Sharma gayi", uri: "", mimeType: "", size: 0, ocrText: "", tags: ["shy", "sharma", "sharmana", "शर्माना", "laaj", "blush", "🙈"], description: "A little shy, a little pleased.", createdAt: now - 8, indexedAt: now, source: "demo" },
  { id: "demo-angry", name: "Gussa incoming", uri: "", mimeType: "", size: 0, ocrText: "", tags: ["angry", "gussa", "गुस्सा", "mad", "😡", "🤬"], description: "When the patience meter hits zero.", createdAt: now - 9, indexedAt: now, source: "demo" },
  { id: "demo-surprise", name: "Mind blown", uri: "", mimeType: "", size: 0, ocrText: "", tags: ["surprise", "shocked", "wow", "omg", "hairaan", "हैरान", "🤯"], description: "For a plot twist no one saw coming.", createdAt: now - 10, indexedAt: now, source: "demo" },
  { id: "demo-party", name: "Full celebration", uri: "", mimeType: "", size: 0, ocrText: "", tags: ["party", "celebrate", "celebration", "dance", "nach", "नाच", "🎉", "💃"], description: "Big energy for a very good reason.", createdAt: now - 11, indexedAt: now, source: "demo" },
  { id: "demo-no", name: "Na baba", uri: "", mimeType: "", size: 0, ocrText: "", tags: ["no", "nahi", "nahin", "नहीं", "ना", "nope", "🙅", "❌"], description: "A polite but unmistakable no.", createdAt: now - 12, indexedAt: now, source: "demo" },
];

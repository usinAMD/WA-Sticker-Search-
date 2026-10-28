export type ConceptGroup = {
  label: string;
  terms: string[];
};

export const CONCEPT_GROUPS: ConceptGroup[] = [
  { label: "happy", terms: ["happy", "joy", "khush", "khushi", "खुश", "खुशी", "mast", "masti", "मस्त", "smile", "muskaan", "मुस्कान", "😊", "😄"] },
  { label: "laugh", terms: ["laugh", "laughing", "laughter", "funny", "lol", "hasna", "hasi", "hansi", "हँसना", "हँसी", "हंसी", "😂", "🤣"] },
  { label: "love", terms: ["love", "pyaar", "pyar", "प्यार", "mohabbat", "मोहब्बत", "ishq", "इश्क", "affection", "dil", "दिल", "heart", "🫶", "❤️"] },
  { label: "good", terms: ["good", "nice", "accha", "acha", "achha", "अच्छा", "ठीक", "thik", "okay", "ok", "sahi", "सही", "👍"] },
  { label: "yes", terms: ["yes", "haan", "han", "हाँ", "हां", "yep", "sure", "बिलकुल", "🙌", "✅"] },
  { label: "no", terms: ["no", "nahi", "nahin", "नहीं", "ना", "nope", "never", "🙅", "❌"] },
  { label: "sad", terms: ["sad", "udaas", "उदास", "dukh", "दुख", "rona", "रोना", "cry", "crying", "tears", "आँसू", "🥲", "😢"] },
  { label: "angry", terms: ["angry", "gussa", "गुस्सा", "mad", "irritated", "rage", "😡", "🤬"] },
  { label: "shy", terms: ["shy", "sharma", "sharmana", "शर्माना", "laaj", "लाज", "blush", "blushing", "🙈", "☺️"] },
  { label: "chai", terms: ["chai", "चाय", "tea", "coffee", "break", "☕"] },
  { label: "celebration", terms: ["party", "पार्टी", "jashn", "जश्न", "celebrate", "celebration", "dance", "nach", "नाच", "khushi", "खुशी", "yay", "🎉", "💃"] },
  { label: "surprise", terms: ["surprise", "shocked", "wow", "omg", "mindblown", "hairaan", "हैरान", "🤯", "😲"] },
  { label: "question", terms: ["question", "ask", "where", "kahan", "kahaan", "कहाँ", "कहां", "who", "kaun", "कौन", "what", "kya", "क्या", "how", "kaise", "कैसे", "kab", "कब"] },
];

const CONSONANTS: Record<string, string> = {
  क: "k", ख: "kh", ग: "g", घ: "gh", ङ: "ng",
  च: "ch", छ: "chh", ज: "j", झ: "jh", ञ: "ny",
  ट: "t", ठ: "th", ड: "d", ढ: "dh", ण: "n",
  त: "t", थ: "th", द: "d", ध: "dh", न: "n",
  प: "p", फ: "ph", ब: "b", भ: "bh", म: "m",
  य: "y", र: "r", ल: "l", व: "v", श: "sh",
  ष: "sh", स: "s", ह: "h", ळ: "l", क्ष: "ksh", त्र: "tr", ज्ञ: "gya",
};

const INDEPENDENT_VOWELS: Record<string, string> = {
  अ: "a", आ: "aa", इ: "i", ई: "ee", उ: "u", ऊ: "oo", ऋ: "ri",
  ए: "e", ऐ: "ai", ओ: "o", औ: "au",
};

const VOWEL_SIGNS: Record<string, string> = {
  "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri",
  "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
};

function stripLatinMarks(value: string): string {
  return value.normalize("NFKC").normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC");
}

export function normalizeText(value: string): string {
  const normalized = stripLatinMarks(value).toLowerCase().replace(/[\u200c\u200d\uFE0E\uFE0F]/g, "");
  return normalized
    .replace(/[^\p{L}\p{M}\p{N}\p{Extended_Pictographic}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized.match(/[\p{L}\p{M}\p{N}\p{Extended_Pictographic}]+/gu) ?? normalized.split(/\s+/).filter(Boolean);
}

export function transliterateDevanagari(value: string): string {
  const out: string[] = [];
  let pendingConsonant = false;
  const flushInherentVowel = () => {
    if (pendingConsonant) out.push("a");
    pendingConsonant = false;
  };

  for (const char of Array.from(value)) {
    if (CONSONANTS[char]) {
      flushInherentVowel();
      out.push(CONSONANTS[char]);
      pendingConsonant = true;
    } else if (VOWEL_SIGNS[char]) {
      if (pendingConsonant) {
        pendingConsonant = false;
      }
      out.push(VOWEL_SIGNS[char]);
    } else if (char === "्") {
      pendingConsonant = false;
    } else if (INDEPENDENT_VOWELS[char]) {
      flushInherentVowel();
      out.push(INDEPENDENT_VOWELS[char]);
    } else if (char === "ं" || char === "ँ") {
      out.push("n");
    } else if (char === "ः") {
      out.push("h");
    } else if (char === "़") {
      // Nukta changes the sound of the preceding consonant; the base approximation is retained.
    } else if (/\s/.test(char)) {
      pendingConsonant = false;
      out.push(" ");
    } else if (/[0-9]/.test(char)) {
      flushInherentVowel();
      out.push(char);
    } else {
      flushInherentVowel();
      out.push(char);
    }
  }

  // A terminal inherent schwa is commonly dropped in Romanized Hindi spelling.
  pendingConsonant = false;
  return out.join("").replace(/\s+/g, " ").trim();
}

const conceptTermCache = new WeakMap<ConceptGroup, Set<string>>();

function normalizedConceptTerms(group: ConceptGroup): Set<string> {
  const cached = conceptTermCache.get(group);
  if (cached) return cached;

  const terms = new Set<string>();
  for (const term of group.terms) {
    const normalized = normalizeText(term);
    if (normalized) {
      terms.add(normalized);
      const roman = normalizeText(transliterateDevanagari(normalized));
      if (roman) terms.add(roman);
    }
  }
  conceptTermCache.set(group, terms);
  return terms;
}

export function expandTokenVariants(rawToken: string): string[] {
  const token = normalizeText(rawToken);
  if (!token) return [];
  const roman = normalizeText(transliterateDevanagari(token));
  const variants = new Set([token, roman].filter(Boolean));

  for (const group of CONCEPT_GROUPS) {
    const terms = normalizedConceptTerms(group);
    if (terms.has(token) || terms.has(roman)) {
      terms.forEach((term) => variants.add(term));
    }
  }
  return Array.from(variants);
}

export function getConceptLabels(value: string): string[] {
  const tokens = new Set(tokenize(value));
  const romanTokens = new Set(Array.from(tokens, (token) => normalizeText(transliterateDevanagari(token))));
  return CONCEPT_GROUPS
    .filter((group) => {
      const terms = normalizedConceptTerms(group);
      return Array.from(terms).some((term) => tokens.has(term) || romanTokens.has(term));
    })
    .map((group) => group.label);
}

export function getConceptTerms(label: string): string[] {
  const group = CONCEPT_GROUPS.find((candidate) => candidate.label === label);
  return group ? group.terms.filter((term) => /[\p{L}\p{N}]/u.test(term)).slice(0, 5) : [];
}

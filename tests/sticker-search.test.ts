import { describe, expect, it } from "vitest";
import { DEMO_STICKERS } from "../lib/stickers/demo-data";
import { expandTokenVariants, transliterateDevanagari } from "../lib/stickers/normalize";
import { searchStickers, suggestRelatedStickers } from "../lib/stickers/search";

describe("Stickly local search", () => {
  it("transliterates common Devanagari words into Roman Hindi", () => {
    expect(transliterateDevanagari("खुश")).toBe("khush");
    expect(transliterateDevanagari("खुशी")).toBe("khushee");
  });

  it("treats common Hinglish spellings as one search concept", () => {
    const variants = expandTokenVariants("achha");
    expect(variants).toContain("acha");
    expect(variants).toContain("accha");
    expect(variants).toContain("अच्छा");
  });

  it("matches Hindi loanwords and question words across scripts", () => {
    expect(expandTokenVariants("mast")).toContain("happy");
    expect(expandTokenVariants("party")).toContain("पार्टी");
    expect(expandTokenVariants("where")).toContain("कहाँ");

    const template = DEMO_STICKERS[0]!;
    const romanMood = { ...template, id: "roman-mood", name: "", tags: [], description: "", ocrText: "Aaj mood mast hai" };
    const hindiParty = { ...template, id: "hindi-party", name: "", tags: [], description: "", ocrText: "चलो, पार्टी करें!" };
    expect(searchStickers([romanMood], "happy")[0]?.id).toBe("roman-mood");
    expect(searchStickers([hindiParty], "party")[0]?.id).toBe("hindi-party");
  });

  it("finds a laughter sticker from Hindi, Hinglish, or English queries", () => {
    expect(searchStickers(DEMO_STICKERS, "hansi")[0]?.id).toBe("demo-laugh");
    expect(searchStickers(DEMO_STICKERS, "हँसी")[0]?.id).toBe("demo-laugh");
    expect(searchStickers(DEMO_STICKERS, "laugh")[0]?.id).toBe("demo-laugh");
  });

  it("finds a matching sticker across spelling variation and a near-typo", () => {
    expect(searchStickers(DEMO_STICKERS, "achha")[0]?.id).toBe("demo-good");
    expect(searchStickers(DEMO_STICKERS, "hapy")[0]?.id).toBe("demo-happy");
  });

  it("offers related stickers from the active collection without duplicating primary hits", () => {
    const matches = searchStickers(DEMO_STICKERS, "hansi");
    const related = suggestRelatedStickers(DEMO_STICKERS, "hansi", matches);
    expect(matches[0]?.id).toBe("demo-laugh");
    expect(related.map((sticker) => sticker.id)).toContain("demo-happy");
    expect(related.map((sticker) => sticker.id)).not.toContain("demo-laugh");
  });

  it("keeps all demo examples available when the search box is empty", () => {
    expect(searchStickers(DEMO_STICKERS, "")).toHaveLength(DEMO_STICKERS.length);
  });
});

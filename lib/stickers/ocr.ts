import MlkitOcr from "rn-mlkit-ocr";

export async function recognizeStickerText(imageUri: string, _blob?: Blob): Promise<string> {
  const [latin, devanagari] = await Promise.all([
    MlkitOcr.recognizeText(imageUri, "latin"),
    MlkitOcr.recognizeText(imageUri, "devanagari"),
  ]);
  return Array.from(new Set([latin.text, devanagari.text].map((value) => value.trim()).filter(Boolean))).join(" ");
}

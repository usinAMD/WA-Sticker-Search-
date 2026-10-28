import Tesseract from "tesseract.js";

let workerPromise: ReturnType<typeof Tesseract.createWorker> | null = null;

export async function recognizeStickerText(imageUri: string, blob?: Blob): Promise<string> {
  if (!workerPromise) {
    workerPromise = Tesseract.createWorker("eng+hin", undefined, {
      logger: () => undefined,
    });
  }
  const worker = await workerPromise;
  const result = await worker.recognize(blob ?? imageUri);
  return result.data.text.trim();
}

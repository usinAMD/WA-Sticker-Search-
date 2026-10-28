import type { StickerRecord } from "./types";

type StoredSticker = StickerRecord & { imageBlob: Blob };
const DB_NAME = "stickly-local-library";
const STORE_NAME = "stickers";
let databasePromise: Promise<IDBDatabase> | null = null;
const objectUrls = new Map<string, string>();

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Browser storage could not be opened."));
  });
  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Browser storage request failed."));
  });
}

async function getStored(id: string): Promise<StoredSticker | undefined> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  return requestResult(transaction.objectStore(STORE_NAME).get(id) as IDBRequest<StoredSticker | undefined>);
}

export async function loadStickers(): Promise<StickerRecord[]> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const records = await requestResult(transaction.objectStore(STORE_NAME).getAll() as IDBRequest<StoredSticker[]>);
  return records.map((record) => {
    const oldUrl = objectUrls.get(record.id);
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    const uri = URL.createObjectURL(record.imageBlob);
    objectUrls.set(record.id, uri);
    const { imageBlob: _imageBlob, ...metadata } = record;
    return { ...metadata, uri };
  }).sort((left, right) => right.createdAt - left.createdAt);
}

export async function saveSticker(sticker: StickerRecord, blob?: Blob): Promise<void> {
  const database = await openDatabase();
  const existing = blob ? undefined : await getStored(sticker.id);
  const imageBlob = blob ?? existing?.imageBlob;
  if (!imageBlob) throw new Error("The sticker image is no longer available in browser storage.");
  const { uri: _temporaryUri, ...metadata } = sticker;
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).put({ ...metadata, uri: "", imageBlob } satisfies StoredSticker);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("The sticker could not be saved."));
    transaction.onabort = () => reject(transaction.error ?? new Error("The sticker save was cancelled."));
  });
}

export async function removeSticker(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).delete(id);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("The sticker could not be removed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("The remove action was cancelled."));
  });
  const objectUrl = objectUrls.get(id);
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrls.delete(id);
}

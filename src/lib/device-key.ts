const databaseName = "study-wiki-wall-device";
const storeName = "authorization";

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadDeviceKey(): Promise<CryptoKey | null> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(storeName).objectStore(storeName).get("843");
      request.onsuccess = () => resolve(request.result instanceof CryptoKey ? request.result : null);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

export async function saveDeviceKey(key: CryptoKey): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put(key, "843");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

export async function clearDeviceKey(): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).delete("843");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

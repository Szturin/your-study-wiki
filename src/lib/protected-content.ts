const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

type Manifest = { version: number; iterations: number; salt: string };

function decodeBase64(value: string) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

export async function unlockKey(passphrase: string): Promise<CryptoKey> {
  const response = await fetch(`${basePath}/protected/manifest.json`, { cache: "no-store" });
  if (!response.ok) throw new Error("加密题库暂不可用");
  const manifest = await response.json() as Manifest;
  if (manifest.version !== 1 || manifest.iterations !== 310000) throw new Error("题库加密版本不受支持");
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: decodeBase64(manifest.salt), iterations: manifest.iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt", "encrypt"],
  );
}

export async function decryptBytes(key: CryptoKey, url: string): Promise<ArrayBuffer> {
  const response = await fetch(`${basePath}${url}`);
  if (!response.ok) throw new Error("加密资源读取失败");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 29) throw new Error("加密资源不完整");
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
}

export async function decryptJson<T>(key: CryptoKey, url: string): Promise<T> {
  return JSON.parse(new TextDecoder().decode(await decryptBytes(key, url))) as T;
}

export async function assetObjectUrl(key: CryptoKey, path: string): Promise<string> {
  const type = path.endsWith(".pdf") ? "application/pdf" : "image/webp";
  return URL.createObjectURL(new Blob([await decryptBytes(key, `/protected${path}.enc`)], { type }));
}

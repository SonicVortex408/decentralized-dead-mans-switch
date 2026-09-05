// Browser Web Crypto helpers: AES-GCM with PBKDF2 key derivation.
// Simulates ECIES-like flow: beneficiary "private key" is really a passphrase.

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase: string, salt: BufferSource): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface EncryptedPayload {
  v: 1;
  alg: "AES-GCM+PBKDF2";
  salt: string;
  iv: string;
  ct: string;
}

export async function encryptSecret(
  plaintext: string,
  passphrase: string,
): Promise<EncryptedPayload> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const salt = saltBytes.buffer.slice(0) as ArrayBuffer;
  const iv = ivBytes.buffer.slice(0) as ArrayBuffer;
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext),
  );
  return {
    v: 1,
    alg: "AES-GCM+PBKDF2",
    salt: toB64(salt),
    iv: toB64(iv),
    ct: toB64(ct),
  };
}

export async function decryptSecret(
  payload: EncryptedPayload,
  passphrase: string,
): Promise<string> {
  const saltBytes = fromB64(payload.salt);
  const ivBytes = fromB64(payload.iv);
  const ctBytes = fromB64(payload.ct);

  const salt = saltBytes.buffer.slice(saltBytes.byteOffset, saltBytes.byteOffset + saltBytes.byteLength) as ArrayBuffer;
  const iv = ivBytes.buffer.slice(ivBytes.byteOffset, ivBytes.byteOffset + ivBytes.byteLength) as ArrayBuffer;
  const ct = ctBytes.buffer.slice(ctBytes.byteOffset, ctBytes.byteOffset + ctBytes.byteLength) as ArrayBuffer;

  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return dec.decode(pt);
}

/** Produce a deterministic sha256 hex digest that mimics an IPFS CID. */
export async function fakeIpfsHash(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(input));
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // "bafy" prefix loosely resembles a CIDv1
  return "bafy" + hex.slice(0, 52);
}

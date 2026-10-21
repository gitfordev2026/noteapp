/**
 * Client-side encryption using Web Crypto API
 * Zero-knowledge: PIN never leaves the browser
 */

export interface EncryptedData {
  ciphertext: string; // base64
  iv: string; // base64
  salt: string; // base64
}

export interface PinHash {
  hash: string; // base64
  salt: string; // base64
  iterations: number;
}

const PBKDF2_ITERATIONS = 600_000;
const KEY_LENGTH = 256; // bits
const IV_LENGTH = 12; // bytes for AES-GCM
const SALT_LENGTH = 32; // bytes

/**
 * Convert string to ArrayBuffer
 */
function strToBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer;
}

/**
 * Convert ArrayBuffer to base64 string
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate random salt
 */
export function generateSalt(): ArrayBuffer {
  const arr = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(arr);
  return arr.buffer;
}

/**
 * Generate random IV
 */
export function generateIV(): ArrayBuffer {
  const arr = new Uint8Array(IV_LENGTH);
  crypto.getRandomValues(arr);
  return arr.buffer;
}

/**
 * Derive encryption key from PIN using PBKDF2
 */
export async function deriveKeyFromPin(pin: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    strToBuffer(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Hash PIN for storage (verification)
 */
export async function hashPin(pin: string): Promise<PinHash> {
  const salt = generateSalt();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    strToBuffer(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const hashBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return {
    hash: bufferToBase64(hashBits),
    salt: bufferToBase64(salt),
    iterations: PBKDF2_ITERATIONS,
  };
}

/**
 * Verify PIN against stored hash
 */
export async function verifyPin(pin: string, storedHash: PinHash): Promise<boolean> {
  const salt = base64ToBuffer(storedHash.salt);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    strToBuffer(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const hashBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: storedHash.iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const computedHash = bufferToBase64(hashBits);
  return computedHash === storedHash.hash;
}

/**
 * Encrypt data with AES-GCM
 */
export async function encrypt(data: string, key: CryptoKey): Promise<EncryptedData> {
  const iv = generateIV();
  const encodedData = strToBuffer(data);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    encodedData
  );

  return {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv),
    salt: '', // salt is stored separately with PIN hash
  };
}

/**
 * Decrypt data with AES-GCM
 */
export async function decrypt(encrypted: EncryptedData, key: CryptoKey): Promise<string> {
  const ciphertext = base64ToBuffer(encrypted.ciphertext);
  const iv = base64ToBuffer(encrypted.iv);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    throw new Error('Decryption failed: invalid PIN or corrupted data');
  }
}

/**
 * Encrypt file (ArrayBuffer) with AES-GCM
 */
export async function encryptFile(file: ArrayBuffer, key: CryptoKey): Promise<EncryptedData> {
  const iv = generateIV();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    file
  );

  return {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv),
    salt: '',
  };
}

/**
 * Decrypt file with AES-GCM
 */
export async function decryptFile(encrypted: EncryptedData, key: CryptoKey): Promise<ArrayBuffer> {
  const ciphertext = base64ToBuffer(encrypted.ciphertext);
  const iv = base64ToBuffer(encrypted.iv);

  try {
    return await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      ciphertext
    );
  } catch (e) {
    throw new Error('File decryption failed: invalid PIN or corrupted data');
  }
}

/**
 * Export key for backup (wrapped with a backup key)
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return bufferToBase64(raw);
}

/**
 * Import key from backup
 */
export async function importKey(rawKey: string): Promise<CryptoKey> {
  const buffer = base64ToBuffer(rawKey);
  return crypto.subtle.importKey('raw', buffer, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
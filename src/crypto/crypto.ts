// AES-GCM encryption + PBKDF2 key derivation using the Web Crypto API.
// The PIN is never stored; only a PBKDF2-derived verifier is kept.

const PBKDF2_ITERATIONS = 310_000
const SALT_LENGTH = 16
const IV_LENGTH = 12
const KEY_LENGTH = 256

function buf2hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hex2buf(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes.buffer as ArrayBuffer
}

async function importKeyMaterial(pin: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ])
}

async function deriveKey(keyMaterial: CryptoKey, salt: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function hashPin(pin: string): Promise<{ hash: string; salt: string }> {
  const saltBuf = crypto.getRandomValues(new Uint8Array(SALT_LENGTH)).buffer as ArrayBuffer
  const keyMaterial = await importKeyMaterial(pin)
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBuf, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  return { hash: buf2hex(derived), salt: buf2hex(saltBuf) }
}

export async function verifyPin(
  pin: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  const salt = hex2buf(storedSalt)
  const keyMaterial = await importKeyMaterial(pin)
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  return buf2hex(derived) === storedHash
}

// Returns a CryptoKey derived from the PIN — held in memory while unlocked
export async function deriveEncryptionKey(pin: string, salt: string): Promise<CryptoKey> {
  const saltBuf = hex2buf(salt)
  const keyMaterial = await importKeyMaterial(pin)
  return deriveKey(keyMaterial, saltBuf)
}

export async function encrypt(key: CryptoKey, plaintext: string): Promise<string> {
  const ivBuf = crypto.getRandomValues(new Uint8Array(IV_LENGTH)).buffer as ArrayBuffer
  const enc = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBuf }, key, enc.encode(plaintext))
  return buf2hex(ivBuf) + ':' + buf2hex(ciphertext)
}

export async function decrypt(key: CryptoKey, encoded: string): Promise<string> {
  const [ivHex, ctHex] = encoded.split(':')
  const iv = hex2buf(ivHex)
  const ct = hex2buf(ctHex)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(plaintext)
}

export function generateSalt(): string {
  return buf2hex(crypto.getRandomValues(new Uint8Array(SALT_LENGTH)).buffer as ArrayBuffer)
}

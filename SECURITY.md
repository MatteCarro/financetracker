# Security Architecture

FinanceTracker is a **local-first, privacy-first** application. All data stays on your device.

## Data Storage

- All data is stored in **IndexedDB** via Dexie.js, never transmitted to any server.
- `navigator.storage.persist()` is requested on startup to prevent iOS eviction of local data.

## Encryption

- **Algorithm**: AES-GCM (256-bit key) via the native Web Crypto API — no third-party crypto libraries.
- **Key derivation**: PBKDF2 with SHA-256, **310,000 iterations**, random 16-byte salt per user.
- The derived `CryptoKey` is held in memory only while the app is unlocked; it is never persisted.
- The PIN is **never stored** — only its PBKDF2-derived verifier hash (+ salt) is kept in IndexedDB.

## App Lock

- On first launch, the user creates a PIN (4–6 digits).
- The app locks automatically after a configurable idle timeout (default: 5 minutes).
- It also locks on visibility change (backgrounding the app) after timeout expiry.
- Incorrect PIN attempts do not reveal timing information (constant-time comparison via PBKDF2 derivation).

## Backup / Export

- Backup files are plain JSON exported **directly to the device** — no network transfer.
- No cloud storage, no third-party service. The user controls where the file is saved.
- Import requires the app to be unlocked (PIN verified before import).

## Content Security Policy

A strict CSP header is set in `index.html`:
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:;
frame-ancestors 'none';
```

`unsafe-inline` for styles is required by Tailwind CSS runtime injection. No `eval`, no remote scripts.

## What this app does NOT do

- No analytics, tracking pixels, or telemetry.
- No third-party scripts or CDN resources.
- No real bank credentials, card numbers, CVVs, or authentication tokens are ever entered or stored.
- The app tracks amounts and metadata only.

## Future Improvements

- Argon2id for key derivation (once available in Web Crypto API).
- WebAuthn / biometric unlock as PIN alternative.
- Encrypted export (password-protected backup blob).

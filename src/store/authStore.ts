import { create } from 'zustand'
import { deriveEncryptionKey, hashPin, verifyPin } from '@/crypto/crypto'
import { db } from '@/db/schema'

type AuthStatus = 'uninitialized' | 'locked' | 'unlocked'

interface AuthState {
  status: AuthStatus
  encryptionKey: CryptoKey | null
  lastActivity: number
  initAuth: () => Promise<void>
  setupPin: (pin: string) => Promise<void>
  unlock: (pin: string) => Promise<boolean>
  lock: () => void
  resetActivity: () => void
  checkTimeout: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'uninitialized',
  encryptionKey: null,
  lastActivity: Date.now(),

  initAuth: async () => {
    const settings = await db.settings.get('singleton')
    if (!settings?.pinHash) {
      set({ status: 'uninitialized' })
    } else {
      set({ status: 'locked' })
    }
  },

  setupPin: async (pin: string) => {
    const { hash, salt } = await hashPin(pin)
    const key = await deriveEncryptionKey(pin, salt)

    // Use put (upsert) so it works even if the seeded record doesn't exist yet
    const existing = await db.settings.get('singleton')
    const now = new Date()
    await db.settings.put({
      id: 'singleton',
      lockTimeoutMinutes: 5,
      notificheAbilitate: false,
      valuta: 'EUR',
      tema: 'dark',
      mascotteName: 'Soldino',
      biometricEnabled: false,
      ...existing,
      pinHash: hash,
      pinSalt: salt,
      pinIterations: 310_000,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    set({ status: 'unlocked', encryptionKey: key, lastActivity: Date.now() })
  },

  unlock: async (pin: string) => {
    const settings = await db.settings.get('singleton')
    if (!settings?.pinHash || !settings?.pinSalt) return false
    const valid = await verifyPin(pin, settings.pinHash, settings.pinSalt)
    if (!valid) return false
    const key = await deriveEncryptionKey(pin, settings.pinSalt)
    set({ status: 'unlocked', encryptionKey: key, lastActivity: Date.now() })
    return true
  },

  lock: () => {
    set({ status: 'locked', encryptionKey: null })
  },

  resetActivity: () => {
    set({ lastActivity: Date.now() })
  },

  checkTimeout: () => {
    const { status, lastActivity } = get()
    if (status !== 'unlocked') return
    db.settings.get('singleton').then((settings) => {
      const timeoutMs = (settings?.lockTimeoutMinutes ?? 5) * 60 * 1000
      if (Date.now() - lastActivity > timeoutMs) {
        get().lock()
      }
    })
  },
}))

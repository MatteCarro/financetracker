import { create } from 'zustand'
import { deriveEncryptionKey, hashPin, verifyPin } from '@/crypto/crypto'
import { db, openProfileDb } from '@/db/schema'
import { coreDb, getProfile, resetProfilePin, seedProfiles } from '@/db/profiles'
import { seedDatabase } from '@/db/seed'
import { useSettingsStore } from '@/store/settingsStore'
import { useSyncStore } from '@/store/syncStore'

type AuthStatus = 'loading' | 'profile-select' | 'setup' | 'locked' | 'unlocked'

interface AuthState {
  status: AuthStatus
  activeProfileId: string | null
  activeProfileName: string | null
  encryptionKey: CryptoKey | null
  lastActivity: number
  // Actions
  init: () => Promise<void>
  selectProfile: (id: string) => Promise<void>
  setupPin: (pin: string) => Promise<void>
  unlock: (pin: string) => Promise<boolean>
  resetActivePin: () => Promise<void>
  lock: () => void
  switchProfile: () => void
  resetActivity: () => void
  checkTimeout: () => void
}

const PBKDF2_ITERATIONS = 310_000

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  activeProfileId: null,
  activeProfileName: null,
  encryptionKey: null,
  lastActivity: Date.now(),

  init: async () => {
    await seedProfiles()
    set({ status: 'profile-select', activeProfileId: null, activeProfileName: null, encryptionKey: null })
  },

  // Choose a profile → open its DB → decide whether to set up or unlock.
  selectProfile: async (id: string) => {
    const profile = await getProfile(id)
    if (!profile) return
    openProfileDb(id)
    set({
      activeProfileId: id,
      activeProfileName: profile.nome,
      encryptionKey: null,
      status: profile.pinHash ? 'locked' : 'setup',
    })
  },

  setupPin: async (pin: string) => {
    const { activeProfileId } = get()
    if (!activeProfileId) return
    const { hash, salt } = await hashPin(pin)
    const key = await deriveEncryptionKey(pin, salt)
    await coreDb.profiles.update(activeProfileId, {
      pinHash: hash,
      pinSalt: salt,
      pinIterations: PBKDF2_ITERATIONS,
      updatedAt: new Date(),
    })
    // Seed this profile's database (categories + settings) on first entry.
    await seedDatabase()
    await useSettingsStore.getState().load()
    set({ status: 'unlocked', encryptionKey: key, lastActivity: Date.now() })
    void useSyncStore.getState().syncNow()
  },

  unlock: async (pin: string) => {
    const { activeProfileId } = get()
    if (!activeProfileId) return false
    const profile = await getProfile(activeProfileId)
    if (!profile?.pinHash || !profile?.pinSalt) return false
    const valid = await verifyPin(pin, profile.pinHash, profile.pinSalt)
    if (!valid) return false
    const key = await deriveEncryptionKey(pin, profile.pinSalt)
    // Ensure data is seeded (no-op if already present).
    await seedDatabase()
    await useSettingsStore.getState().load()
    set({ status: 'unlocked', encryptionKey: key, lastActivity: Date.now() })
    void useSyncStore.getState().syncNow()
    return true
  },

  // Forgot PIN: clear the active profile's PIN (data is preserved) and send the
  // user to the create-PIN screen.
  resetActivePin: async () => {
    const { activeProfileId } = get()
    if (!activeProfileId) return
    await resetProfilePin(activeProfileId)
    set({ status: 'setup', encryptionKey: null })
  },

  // Lock the current profile (keeps it selected, asks for PIN again).
  lock: () => {
    set({ status: 'locked', encryptionKey: null })
  },

  // Go back to the profile picker.
  switchProfile: () => {
    set({
      status: 'profile-select',
      encryptionKey: null,
      activeProfileId: null,
      activeProfileName: null,
    })
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

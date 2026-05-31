import Dexie, { type EntityTable } from 'dexie'

// A user profile. PIN material lives here (per-profile), the financial data
// lives in a separate per-profile database (see schema.ts openProfileDb).
export interface Profile {
  id: string
  nome: string
  colore: string
  avatar: string // emoji
  pinHash?: string
  pinSalt?: string
  pinIterations?: number
  createdAt: Date
  updatedAt: Date
}

class CoreDB extends Dexie {
  profiles!: EntityTable<Profile, 'id'>

  constructor() {
    super('FinanceTrackerCore')
    this.version(1).stores({
      profiles: 'id, nome, createdAt',
    })
  }
}

export const coreDb = new CoreDB()

const DEFAULT_PROFILES: Omit<Profile, 'createdAt' | 'updatedAt'>[] = [
  { id: 'matteo', nome: 'Matteo', colore: '#7c6cf0', avatar: '🧑' },
  { id: 'alessia', nome: 'Alessia', colore: '#f472b6', avatar: '👩' },
]

// Ensure the two default profiles exist.
export async function seedProfiles(): Promise<void> {
  const now = new Date()
  for (const p of DEFAULT_PROFILES) {
    const existing = await coreDb.profiles.get(p.id)
    if (!existing) {
      await coreDb.profiles.add({ ...p, createdAt: now, updatedAt: now })
    }
  }
}

// Clear every profile's PIN — forces each profile to set a new one on next login.
export async function resetAllPins(): Promise<void> {
  const all = await coreDb.profiles.toArray()
  const now = new Date()
  for (const p of all) {
    await coreDb.profiles.update(p.id, {
      pinHash: undefined,
      pinSalt: undefined,
      pinIterations: undefined,
      updatedAt: now,
    })
  }
}

export function listProfiles(): Promise<Profile[]> {
  return coreDb.profiles.orderBy('createdAt').toArray()
}

export function getProfile(id: string): Promise<Profile | undefined> {
  return coreDb.profiles.get(id)
}

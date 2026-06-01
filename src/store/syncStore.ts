import { create } from 'zustand'
import { runSync } from '@/sync/syncEngine'
import { isSupabaseConfigured } from '@/sync/supabase'
import { useSettingsStore } from '@/store/settingsStore'

type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error'

interface SyncState {
  configured: boolean
  status: SyncStatus
  lastSyncAt: number | null
  lastError: string | null
  syncNow: () => Promise<void>
  scheduleSync: () => void
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export const useSyncStore = create<SyncState>((set, get) => ({
  configured: isSupabaseConfigured,
  status: 'idle',
  lastSyncAt: null,
  lastError: null,

  syncNow: async () => {
    const settings = useSettingsStore.getState().settings
    if (!isSupabaseConfigured || !settings?.syncEnabled || !settings.syncPassphrase) return
    if (get().status === 'syncing') return

    set({ status: 'syncing', lastError: null })
    const result = await runSync(settings.syncPassphrase)
    if (result.ok) {
      set({ status: 'ok', lastSyncAt: Date.now(), lastError: null })
    } else {
      set({ status: 'error', lastError: result.error ?? 'Errore' })
    }
  },

  // Debounced sync, e.g. after the user edits data.
  scheduleSync: () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      get().syncNow()
    }, 2500)
  },
}))

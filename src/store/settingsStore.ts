import { create } from 'zustand'
import type { Settings, Theme } from '@/lib/types'
import { db } from '@/db/schema'

interface SettingsState {
  settings: Settings | null
  load: () => Promise<void>
  update: (patch: Partial<Settings>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,

  load: async () => {
    const s = await db.settings.get('singleton')
    if (s) {
      set({ settings: s })
      applyTheme(s.tema)
    }
  },

  update: async (patch) => {
    const current = get().settings
    if (!current) return
    const updated = { ...current, ...patch, updatedAt: new Date() }
    await db.settings.put(updated)
    set({ settings: updated })
    if (patch.tema) applyTheme(patch.tema)
  },
}))

function applyTheme(tema: Theme) {
  const root = document.documentElement
  let resolved: 'dark' | 'light'
  if (tema === 'dark') {
    resolved = 'dark'
  } else if (tema === 'light') {
    resolved = 'light'
  } else {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  root.setAttribute('data-theme', resolved)
  try { localStorage.setItem('ft-theme', tema === 'system' ? resolved : tema) } catch { /* ignore */ }
}

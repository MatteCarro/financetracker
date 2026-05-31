export type TabId = 'home' | 'transactions' | 'finance' | 'insights' | 'settings'

export interface Tab {
  id: TabId
  label: string
  icon: string
}

export const TABS: Tab[] = [
  { id: 'home', label: 'Home', icon: '⊙' },
  { id: 'transactions', label: 'Movimenti', icon: '↕' },
  { id: 'finance', label: 'Finanze', icon: '🏦' },
  { id: 'insights', label: 'Insights', icon: '✦' },
  { id: 'settings', label: 'Impostazioni', icon: '⚙' },
]

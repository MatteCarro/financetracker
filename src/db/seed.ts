import { v4 as uuid } from 'uuid'
import type { Category, Settings } from '@/lib/types'
import { db } from './schema'

const DEFAULT_CATEGORIES: Omit<Category, 'createdAt' | 'updatedAt'>[] = [
  { id: uuid(), nome: 'Casa', icona: '🏠', colore: '#6366f1' },
  { id: uuid(), nome: 'Spesa alimentare', icona: '🛒', colore: '#10b981' },
  { id: uuid(), nome: 'Trasporti', icona: '🚗', colore: '#f59e0b' },
  { id: uuid(), nome: 'Bollette', icona: '⚡', colore: '#ef4444' },
  { id: uuid(), nome: 'Salute', icona: '❤️‍🩹', colore: '#ec4899' },
  { id: uuid(), nome: 'Svago', icona: '🎮', colore: '#8b5cf6' },
  { id: uuid(), nome: 'Ristoranti', icona: '🍽️', colore: '#f97316' },
  { id: uuid(), nome: 'Abbigliamento', icona: '👕', colore: '#06b6d4' },
  { id: uuid(), nome: 'Risparmio', icona: '🐷', colore: '#22c55e' },
  { id: uuid(), nome: 'Abbonamenti', icona: '📱', colore: '#a855f7' },
  { id: uuid(), nome: 'Istruzione', icona: '📚', colore: '#3b82f6' },
  { id: uuid(), nome: 'Altro', icona: '📌', colore: '#64748b' },
]

const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  lockTimeoutMinutes: 5,
  notificheAbilitate: false,
  valuta: 'EUR',
  tema: 'dark',
  mascotteName: 'Soldino',
  biometricEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export async function seedDatabase(): Promise<void> {
  const now = new Date()

  const existingSettings = await db.settings.get('singleton')
  if (!existingSettings) {
    await db.settings.add(DEFAULT_SETTINGS)
  }

  const existingCategories = await db.categories.count()
  if (existingCategories === 0) {
    await db.categories.bulkAdd(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, createdAt: now, updatedAt: now }))
    )
  }
}

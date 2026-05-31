import { v4 as uuid } from 'uuid'
import type { Category, Settings } from '@/lib/types'
import { db } from './schema'

const DEFAULT_CATEGORIES: Omit<Category, 'createdAt' | 'updatedAt'>[] = [
  // Uscite
  { id: uuid(), nome: 'Casa', icona: '🏠', colore: '#6366f1', tipo: 'uscita' },
  { id: uuid(), nome: 'Spesa alimentare', icona: '🛒', colore: '#10b981', tipo: 'uscita' },
  { id: uuid(), nome: 'Trasporti', icona: '🚗', colore: '#f59e0b', tipo: 'uscita' },
  { id: uuid(), nome: 'Benzina', icona: '⛽', colore: '#fb923c', tipo: 'uscita' },
  { id: uuid(), nome: 'Bollette', icona: '⚡', colore: '#ef4444', tipo: 'uscita' },
  { id: uuid(), nome: 'Salute', icona: '❤️‍🩹', colore: '#e87461', tipo: 'uscita' },
  { id: uuid(), nome: 'Svago', icona: '🎮', colore: '#8b5cf6', tipo: 'uscita' },
  { id: uuid(), nome: 'Ristoranti', icona: '🍽️', colore: '#f97316', tipo: 'uscita' },
  { id: uuid(), nome: 'Abbigliamento', icona: '👕', colore: '#06b6d4', tipo: 'uscita' },
  { id: uuid(), nome: 'Abbonamenti', icona: '📱', colore: '#a855f7', tipo: 'uscita' },
  { id: uuid(), nome: 'Istruzione', icona: '📚', colore: '#3b82f6', tipo: 'uscita' },
  { id: uuid(), nome: 'Altro', icona: '📌', colore: '#64748b', tipo: 'entrambi' },
  // Entrate
  { id: uuid(), nome: 'Stipendio', icona: '💼', colore: '#10b981', tipo: 'entrata' },
  { id: uuid(), nome: 'Freelance / Extra', icona: '💻', colore: '#6366f1', tipo: 'entrata' },
  { id: uuid(), nome: 'Investimenti', icona: '📈', colore: '#f59e0b', tipo: 'entrata' },
  { id: uuid(), nome: 'Rimborsi', icona: '🔄', colore: '#06b6d4', tipo: 'entrata' },
  { id: uuid(), nome: 'Regali ricevuti', icona: '🎁', colore: '#8b5cf6', tipo: 'entrata' },
  { id: uuid(), nome: 'Risparmio', icona: '🐷', colore: '#22c55e', tipo: 'entrambi' },
]

const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  lockTimeoutMinutes: 5,
  notificheAbilitate: false,
  valuta: 'EUR',
  tema: 'light',
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

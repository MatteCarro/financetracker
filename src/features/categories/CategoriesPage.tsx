import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { v4 as uuid } from 'uuid'
import { db } from '@/db/schema'
import type { Category, CategoryType } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { categorySpend } from '@/lib/finance'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ProgressBar from '@/components/ui/ProgressBar'

const EMOJI_OPTIONS = [
  '🏠','🛒','🚗','⛽','⚡','❤️‍🩹','🎮','🍽️','👕','🐷','📱','📚','📌',
  '✈️','🎬','☕','🍺','💊','🏋️','🎁','🐶','💇','🚿','🧾','💡',
  '🍕','🎵','🏥','🚌','🎓','💼','🌳','🛜','🧴','🛠️','🎂',
  '💻','📈','🔄','💰','🏦','📊','🤝','🎯',
]

const COLOR_OPTIONS = [
  '#7c6cf0','#34d399','#fbbf24','#f87171','#f0b68a','#7dd3fc',
  '#a78bfa','#6ee7b7','#fb923c','#60a5fa','#c4b5fd','#94a3b8',
]

const TIPO_OPTIONS: { id: CategoryType; label: string; icon: string }[] = [
  { id: 'uscita', label: 'Uscita', icon: '↓' },
  { id: 'entrata', label: 'Entrata', icon: '↑' },
  { id: 'entrambi', label: 'Entrambi', icon: '↕' },
]

function CategoryForm({ onSave, onClose, initial }: {
  onSave: (c: Omit<Category, 'createdAt' | 'updatedAt'>) => Promise<void>
  onClose: () => void
  initial?: Category
}) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [icona, setIcona] = useState(initial?.icona ?? '📌')
  const [colore, setColore] = useState(initial?.colore ?? COLOR_OPTIONS[0])
  const [tipo, setTipo] = useState<CategoryType>(initial?.tipo ?? 'uscita')
  const [budget, setBudget] = useState(initial?.budgetMensile?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  const handle = async () => {
    if (!nome) return
    setSaving(true)
    await onSave({
      id: initial?.id ?? uuid(),
      nome,
      icona,
      colore,
      tipo,
      budgetMensile: budget ? parseFloat(budget.replace(',', '.')) : undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Live preview */}
      <div className="flex items-center justify-center">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl"
          style={{ backgroundColor: colore + '33' }}
        >
          {icona}
        </div>
      </div>

      <Input label="Nome categoria" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Spesa alimentare" />

      {/* Tipo */}
      <div>
        <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">Tipo</label>
        <div className="grid grid-cols-3 gap-2">
          {TIPO_OPTIONS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTipo(t.id)}
              className={`py-2 rounded-xl text-sm font-medium glass glass-hover transition-all ${
                tipo === t.id
                  ? 'text-[var(--color-primary-light)] border-[var(--color-primary)]/40'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">Icona</label>
        <div className="grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              onClick={() => setIcona(e)}
              className={`aspect-square rounded-xl text-lg flex items-center justify-center transition-all ${
                icona === e ? 'bg-[var(--color-primary)]/15 ring-2 ring-[var(--color-primary)]/50 scale-105' : 'glass-subtle'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">Colore</label>
        <div className="flex gap-2 flex-wrap">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => setColore(c)}
              className={`w-9 h-9 rounded-full transition-all ${colore === c ? 'ring-2 ring-offset-2 ring-offset-[var(--color-surface-1)] scale-110' : ''}`}
              style={{ backgroundColor: c, boxShadow: colore === c ? `0 0 0 2px ${c}` : 'none' }}
            />
          ))}
        </div>
      </div>

      {tipo !== 'entrata' && (
        <Input
          label="Budget mensile (€, opzionale)"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          type="number"
          step="0.01"
          icon="€"
          placeholder="es. 400"
        />
      )}

      <Button onClick={handle} disabled={saving || !nome} fullWidth>
        {saving ? 'Salvataggio...' : initial ? 'Aggiorna categoria' : 'Aggiungi categoria'}
      </Button>
    </div>
  )
}

const TIPO_LABELS: Record<CategoryType, { title: string; icon: string }> = {
  uscita: { title: 'Uscite', icon: '↓' },
  entrata: { title: 'Entrate', icon: '↑' },
  entrambi: { title: 'Generiche', icon: '↕' },
}

export default function CategoriesPage() {
  const categories = useLiveQuery(() => db.categories.orderBy('createdAt').toArray(), []) ?? []
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? []
  const [showModal, setShowModal] = useState(false)
  const [editCat, setEditCat] = useState<Category | undefined>()

  const spendByCat = new Map(categorySpend(transactions, categories).map((c) => [c.categoriaId, c.speso]))

  const save = async (c: Omit<Category, 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    if (editCat) await db.categories.put({ ...c, createdAt: editCat.createdAt, updatedAt: now })
    else await db.categories.add({ ...c, createdAt: now, updatedAt: now })
    setEditCat(undefined)
  }

  const remove = async (cat: Category) => {
    const used = transactions.some((t) => t.categoriaId === cat.id)
    if (used) {
      alert('Questa categoria è usata da alcuni movimenti e non può essere eliminata.')
      return
    }
    if (confirm(`Eliminare la categoria "${cat.nome}"?`)) await db.categories.delete(cat.id)
  }

  // Group by tipo
  const grouped = (['uscita', 'entrata', 'entrambi'] as CategoryType[]).map((tipo) => ({
    tipo,
    ...TIPO_LABELS[tipo],
    items: categories.filter((c) => c.tipo === tipo),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Categorie</h2>
        <Button size="sm" onClick={() => { setEditCat(undefined); setShowModal(true) }}>+ Aggiungi</Button>
      </div>

      {categories.length === 0 ? (
        <Card className="text-center !py-8"><p className="text-[var(--color-text-muted)]">Nessuna categoria.</p></Card>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map((group) => (
            <div key={group.tipo}>
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>{group.icon}</span> {group.title}
              </p>
              <div className="grid grid-cols-1 gap-2">
                <AnimatePresence>
                  {group.items.map((cat) => {
                    const speso = spendByCat.get(cat.id) ?? 0
                    return (
                      <motion.div key={cat.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <Card className="!p-3.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                                style={{ backgroundColor: cat.colore + '2e' }}
                              >
                                {cat.icona}
                              </div>
                              <div>
                                <p className="font-semibold text-[var(--color-text-primary)] text-sm">{cat.nome}</p>
                                {cat.budgetMensile ? (
                                  <p className="text-xs text-[var(--color-text-muted)]">
                                    {formatCurrency(speso)} / {formatCurrency(cat.budgetMensile)}
                                  </p>
                                ) : (
                                  <p className="text-xs text-[var(--color-text-muted)]">
                                    {cat.tipo === 'entrata' ? 'Categoria entrata' : 'Nessun budget'}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setEditCat(cat); setShowModal(true) }} className="p-1.5 text-sm">✏️</button>
                              <button onClick={() => remove(cat)} className="p-1.5 text-sm text-[var(--color-danger)]">🗑</button>
                            </div>
                          </div>
                          {cat.budgetMensile && (
                            <div className="mt-2.5">
                              <ProgressBar value={speso} max={cat.budgetMensile} color={cat.colore} height={5} />
                            </div>
                          )}
                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditCat(undefined) }}
        title={editCat ? 'Modifica categoria' : 'Nuova categoria'}>
        <CategoryForm onSave={save} onClose={() => { setShowModal(false); setEditCat(undefined) }} initial={editCat} />
      </Modal>
    </div>
  )
}

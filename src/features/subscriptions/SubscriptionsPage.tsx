import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { v4 as uuid } from 'uuid'
import { db } from '@/db/schema'
import type { Subscription, Frequency } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/dates'
import { monthlySubscriptionCost } from '@/lib/finance'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const FREQ_LABELS: Record<Frequency, string> = {
  mensile: 'Mensile', annuale: 'Annuale', settimanale: 'Settimanale',
  una_tantum: 'Una tantum', personalizzata: 'Personalizzata',
}

function SubForm({ onSave, onClose, initial }: {
  onSave: (s: Omit<Subscription, 'createdAt' | 'updatedAt'>) => Promise<void>
  onClose: () => void
  initial?: Subscription
}) {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? []
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? []

  const [nome, setNome] = useState(initial?.nome ?? '')
  const [importo, setImporto] = useState(initial?.importo?.toString() ?? '')
  const [frequenza, setFrequenza] = useState<Frequency>(initial?.frequenza ?? 'mensile')
  const [prossimoRinnovo, setProssimoRinnovo] = useState(
    initial?.prossimoRinnovo ? new Date(initial.prossimoRinnovo).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [categoriaId, setCategoriaId] = useState(initial?.categoriaId ?? '')
  const [fonteId, setFonteId] = useState(initial?.fonteId ?? '')
  const [saving, setSaving] = useState(false)

  const handle = async () => {
    if (!nome || !importo) return
    setSaving(true)
    await onSave({
      id: initial?.id ?? uuid(),
      nome, importo: parseFloat(importo.replace(',', '.')) || 0,
      frequenza, prossimoRinnovo: new Date(prossimoRinnovo),
      categoriaId: categoriaId || categories[0]?.id,
      fonteId: fonteId || accounts[0]?.id || '',
      attivo: true,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <Input label="Nome abbonamento" value={nome} onChange={e => setNome(e.target.value)} placeholder="es. Netflix" />
      <Input label="Importo (€)" value={importo} onChange={e => setImporto(e.target.value)} type="number" step="0.01" icon="€" />
      <div>
        <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">Frequenza</label>
        <div className="flex flex-wrap gap-2">
          {(['mensile','annuale','settimanale'] as Frequency[]).map(f => (
            <button key={f} onClick={() => setFrequenza(f)}
              className={`px-3 py-1.5 rounded-xl text-sm glass glass-hover transition-all ${frequenza === f ? 'text-[var(--color-primary-light)] border-[var(--color-primary)]/40' : 'text-[var(--color-text-muted)]'}`}>
              {FREQ_LABELS[f]}
            </button>
          ))}
        </div>
      </div>
      <Input label="Prossimo rinnovo" value={prossimoRinnovo} onChange={e => setProssimoRinnovo(e.target.value)} type="date" />
      {categories.length > 0 && (
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">Categoria</label>
          <div className="flex flex-wrap gap-2">
            {categories.slice(0,6).map(c => (
              <button key={c.id} onClick={() => setCategoriaId(c.id)}
                className={`px-3 py-1.5 rounded-xl text-sm glass glass-hover transition-all ${categoriaId === c.id ? 'text-[var(--color-primary-light)]' : 'text-[var(--color-text-muted)]'}`}>
                {c.icona} {c.nome}
              </button>
            ))}
          </div>
        </div>
      )}
      {accounts.length > 0 && (
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">Fonte di pagamento</label>
          {accounts.map(a => (
            <button key={a.id} onClick={() => setFonteId(a.id)}
              className={`w-full text-left px-4 py-2 rounded-xl text-sm mb-1 glass glass-hover transition-all ${fonteId === a.id ? 'text-[var(--color-primary-light)]' : 'text-[var(--color-text-secondary)]'}`}>
              {a.icona} {a.nome}
            </button>
          ))}
        </div>
      )}
      <Button onClick={handle} disabled={saving || !nome || !importo} fullWidth>
        {saving ? 'Salvataggio...' : initial ? 'Aggiorna' : 'Aggiungi abbonamento'}
      </Button>
    </div>
  )
}

export default function SubscriptionsPage() {
  const subs = useLiveQuery(() => db.subscriptions.orderBy('prossimoRinnovo').toArray(), []) ?? []
  const [showModal, setShowModal] = useState(false)
  const [editSub, setEditSub] = useState<Subscription | undefined>()

  const save = async (s: Omit<Subscription, 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    if (editSub) await db.subscriptions.put({ ...s, createdAt: editSub.createdAt, updatedAt: now })
    else await db.subscriptions.add({ ...s, createdAt: now, updatedAt: now })
    setEditSub(undefined)
  }

  const monthly = monthlySubscriptionCost(subs)
  const annual = monthly * 12

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Abbonamenti</h2>
        <Button size="sm" onClick={() => { setEditSub(undefined); setShowModal(true) }}>+ Aggiungi</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card subtle className="!p-3">
          <p className="text-xs text-[var(--color-text-muted)]">Costo mensile</p>
          <p className="text-lg font-bold font-numeric text-[var(--color-danger)]">{formatCurrency(monthly)}</p>
        </Card>
        <Card subtle className="!p-3">
          <p className="text-xs text-[var(--color-text-muted)]">Costo annuale</p>
          <p className="text-lg font-bold font-numeric text-[var(--color-warning)]">{formatCurrency(annual)}</p>
        </Card>
      </div>

      {subs.length === 0 ? (
        <Card className="text-center !py-8"><p className="text-[var(--color-text-muted)]">Nessun abbonamento.</p></Card>
      ) : (
        <AnimatePresence>
          {subs.map(sub => (
            <motion.div key={sub.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl glass-subtle ${!sub.attivo ? 'opacity-50' : ''}`}>📱</div>
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)] text-sm">{sub.nome}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {FREQ_LABELS[sub.frequenza]} · Rinnovo {formatDate(new Date(sub.prossimoRinnovo))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold font-numeric text-[var(--color-danger)]">{formatCurrency(sub.importo)}</p>
                    <button onClick={() => { setEditSub(sub); setShowModal(true) }} className="text-[var(--color-text-muted)] p-1 text-sm">✏️</button>
                    <button onClick={() => confirm('Eliminare?') && db.subscriptions.delete(sub.id)} className="text-[var(--color-danger)] p-1 text-sm">🗑</button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditSub(undefined) }}
        title={editSub ? 'Modifica abbonamento' : 'Nuovo abbonamento'}>
        <SubForm onSave={save} onClose={() => { setShowModal(false); setEditSub(undefined) }} initial={editSub} />
      </Modal>
    </div>
  )
}

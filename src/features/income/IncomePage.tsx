import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { v4 as uuid } from 'uuid'
import { db, removeRecord } from '@/db/schema'
import type { Income, Frequency } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const FREQ_LABELS: Record<Frequency, string> = {
  mensile: 'Mensile', annuale: 'Annuale', settimanale: 'Settimanale',
  una_tantum: 'Una tantum', personalizzata: 'Personalizzata',
}

function IncomeForm({ onSave, onClose, initial }: {
  onSave: (i: Omit<Income, 'createdAt' | 'updatedAt'>) => Promise<void>
  onClose: () => void
  initial?: Income
}) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [importo, setImporto] = useState(initial?.importo?.toString() ?? '')
  const [frequenza, setFrequenza] = useState<Frequency>(initial?.frequenza ?? 'mensile')
  const [giornoAccredito, setGiornoAccredito] = useState(initial?.giornoAccredito?.toString() ?? '')
  const [ricorrente, setRicorrente] = useState(initial?.ricorrente ?? true)
  const [note, setNote] = useState(initial?.note ?? '')
  const [saving, setSaving] = useState(false)

  const handle = async () => {
    if (!nome || !importo) return
    setSaving(true)
    await onSave({
      id: initial?.id ?? uuid(),
      nome, importo: parseFloat(importo.replace(',', '.')) || 0,
      frequenza, ricorrente,
      giornoAccredito: giornoAccredito ? parseInt(giornoAccredito) : undefined,
      note: note || undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <Input label="Nome entrata" value={nome} onChange={e => setNome(e.target.value)} placeholder="es. Stipendio, Affitto, Freelance" />
      <Input label="Importo (€)" value={importo} onChange={e => setImporto(e.target.value)} type="number" step="0.01" icon="€" />
      <div>
        <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">Frequenza</label>
        <div className="flex flex-wrap gap-2">
          {(['mensile','annuale','settimanale','una_tantum'] as Frequency[]).map(f => (
            <button key={f} onClick={() => setFrequenza(f)}
              className={`px-3 py-1.5 rounded-xl text-sm glass glass-hover transition-all ${frequenza === f ? 'text-[var(--color-accent)] border-[var(--color-accent)]/40' : 'text-[var(--color-text-muted)]'}`}>
              {FREQ_LABELS[f]}
            </button>
          ))}
        </div>
      </div>
      {frequenza === 'mensile' && (
        <Input label="Giorno accredito (opz.)" value={giornoAccredito} onChange={e => setGiornoAccredito(e.target.value)} type="number" min="1" max="31" placeholder="es. 27" />
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setRicorrente(!ricorrente)}
          className={`w-12 h-6 rounded-full transition-all ${ricorrente ? 'bg-[var(--color-accent)]' : 'bg-white/20'}`}
        >
          <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${ricorrente ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className="text-sm text-[var(--color-text-secondary)]">Entrata ricorrente</span>
      </div>
      <Input label="Note (opz.)" value={note} onChange={e => setNote(e.target.value)} placeholder="es. Tredicesima in dicembre" />
      <Button onClick={handle} disabled={saving || !nome || !importo} fullWidth>
        {saving ? 'Salvataggio...' : initial ? 'Aggiorna' : 'Aggiungi entrata'}
      </Button>
    </div>
  )
}

export default function IncomePage() {
  const incomes = useLiveQuery(() => db.income.toArray(), []) ?? []
  const [showModal, setShowModal] = useState(false)
  const [editIncome, setEditIncome] = useState<Income | undefined>()

  const save = async (i: Omit<Income, 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    if (editIncome) await db.income.put({ ...i, createdAt: editIncome.createdAt, updatedAt: now })
    else await db.income.add({ ...i, createdAt: now, updatedAt: now })
    setEditIncome(undefined)
  }

  const monthlyTotal = incomes
    .filter(i => i.ricorrente)
    .reduce((s, i) => {
      if (i.frequenza === 'mensile') return s + i.importo
      if (i.frequenza === 'annuale') return s + i.importo / 12
      if (i.frequenza === 'settimanale') return s + i.importo * 4.33
      return s
    }, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Entrate</h2>
        <Button size="sm" onClick={() => { setEditIncome(undefined); setShowModal(true) }}>+ Aggiungi</Button>
      </div>

      <Card subtle className="!p-3 text-center">
        <p className="text-xs text-[var(--color-text-muted)]">Entrate mensili previste</p>
        <p className="text-xl font-bold font-numeric text-[var(--color-accent)]">{formatCurrency(monthlyTotal)}</p>
      </Card>

      {incomes.length === 0 ? (
        <Card className="text-center !py-8"><p className="text-[var(--color-text-muted)]">Nessuna entrata registrata.</p></Card>
      ) : (
        <AnimatePresence>
          {incomes.map(inc => (
            <motion.div key={inc.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl glass-subtle">
                      💰
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)] text-sm">{inc.nome}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {FREQ_LABELS[inc.frequenza]}
                        {inc.giornoAccredito ? ` · giorno ${inc.giornoAccredito}` : ''}
                        {!inc.ricorrente ? ' · Una tantum' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold font-numeric text-[var(--color-accent)]">+{formatCurrency(inc.importo)}</p>
                    <button onClick={() => { setEditIncome(inc); setShowModal(true) }} className="p-1 text-sm">✏️</button>
                    <button onClick={() => confirm('Eliminare?') && removeRecord('income', inc.id)} className="p-1 text-sm text-[var(--color-danger)]">🗑</button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditIncome(undefined) }}
        title={editIncome ? 'Modifica entrata' : 'Nuova entrata'}>
        <IncomeForm onSave={save} onClose={() => { setShowModal(false); setEditIncome(undefined) }} initial={editIncome} />
      </Modal>
    </div>
  )
}

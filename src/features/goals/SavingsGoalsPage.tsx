import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { v4 as uuid } from 'uuid'
import { db, removeRecord } from '@/db/schema'
import type { SavingsGoal } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { formatDate, monthsUntil } from '@/lib/dates'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ProgressBar from '@/components/ui/ProgressBar'

const GOAL_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#f0b68a','#06b6d4']
const GOAL_ICONS = ['🏠','✈️','🚗','🎓','💍','🏖️','💻','🏋️','🐶','🌟']

function GoalForm({ onSave, onClose, initial }: {
  onSave: (g: Omit<SavingsGoal, 'createdAt' | 'updatedAt'>) => Promise<void>
  onClose: () => void
  initial?: SavingsGoal
}) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [importoTarget, setImportoTarget] = useState(initial?.importoTarget?.toString() ?? '')
  const [importoAttuale, setImportoAttuale] = useState(initial?.importoAttuale?.toString() ?? '0')
  const [scadenza, setScadenza] = useState(
    initial?.scadenza ? new Date(initial.scadenza).toISOString().split('T')[0] : ''
  )
  const [icona, setIcona] = useState(initial?.icona ?? '🌟')
  const [colore, setColore] = useState(initial?.colore ?? GOAL_COLORS[0])
  const [note, setNote] = useState(initial?.note ?? '')
  const [saving, setSaving] = useState(false)

  const target = parseFloat(importoTarget.replace(',', '.')) || 0
  const attuale = parseFloat(importoAttuale.replace(',', '.')) || 0
  const mesiRimasti = scadenza ? Math.max(1, monthsUntil(new Date(scadenza))) : null
  const mensile = mesiRimasti ? (target - attuale) / mesiRimasti : null

  const handle = async () => {
    if (!nome || !importoTarget) return
    setSaving(true)
    await onSave({
      id: initial?.id ?? uuid(),
      nome, importoTarget: target, importoAttuale: attuale,
      scadenza: scadenza ? new Date(scadenza) : undefined,
      icona, colore, note: note || undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <Input label="Nome obiettivo" value={nome} onChange={e => setNome(e.target.value)} placeholder="es. Vacanze estive" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Target (€)" value={importoTarget} onChange={e => setImportoTarget(e.target.value)} type="number" step="0.01" icon="€" />
        <Input label="Già risparmiato (€)" value={importoAttuale} onChange={e => setImportoAttuale(e.target.value)} type="number" step="0.01" icon="€" />
      </div>
      <Input label="Scadenza (opz.)" value={scadenza} onChange={e => setScadenza(e.target.value)} type="date" />
      {mensile !== null && mensile > 0 && (
        <Card subtle className="!p-3 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">Risparmia al mese per raggiungerlo</p>
          <p className="text-xl font-bold font-numeric text-[var(--color-primary-light)]">{formatCurrency(mensile)}</p>
        </Card>
      )}
      <div>
        <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">Icona</label>
        <div className="flex flex-wrap gap-2">
          {GOAL_ICONS.map(i => (
            <button key={i} onClick={() => setIcona(i)}
              className={`w-10 h-10 rounded-xl text-xl glass glass-hover transition-all ${icona === i ? 'border-[var(--color-primary)]/60' : ''}`}>
              {i}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">Colore</label>
        <div className="flex gap-2 flex-wrap">
          {GOAL_COLORS.map(c => (
            <button key={c} onClick={() => setColore(c)}
              className={`w-8 h-8 rounded-full transition-all ${colore === c ? 'ring-2 ring-white/60 scale-110' : ''}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <Input label="Note (opz.)" value={note} onChange={e => setNote(e.target.value)} placeholder="Dettagli..." />
      <Button onClick={handle} disabled={saving || !nome || !importoTarget} fullWidth>
        {saving ? 'Salvataggio...' : initial ? 'Aggiorna' : 'Aggiungi obiettivo'}
      </Button>
    </div>
  )
}

export default function SavingsGoalsPage() {
  const goals = useLiveQuery(() => db.savingsGoals.toArray(), []) ?? []
  const [showModal, setShowModal] = useState(false)
  const [editGoal, setEditGoal] = useState<SavingsGoal | undefined>()

  const save = async (g: Omit<SavingsGoal, 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    if (editGoal) await db.savingsGoals.put({ ...g, createdAt: editGoal.createdAt, updatedAt: now })
    else await db.savingsGoals.add({ ...g, createdAt: now, updatedAt: now })
    setEditGoal(undefined)
  }

  const addAmount = async (goal: SavingsGoal, amount: number) => {
    await db.savingsGoals.update(goal.id, {
      importoAttuale: Math.min(goal.importoAttuale + amount, goal.importoTarget),
      updatedAt: new Date()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Obiettivi</h2>
        <Button size="sm" onClick={() => { setEditGoal(undefined); setShowModal(true) }}>+ Aggiungi</Button>
      </div>

      {goals.length === 0 ? (
        <Card className="text-center !py-8">
          <p className="text-3xl mb-2">🎯</p>
          <p className="text-[var(--color-text-muted)]">Nessun obiettivo. Aggiungine uno!</p>
        </Card>
      ) : (
        <AnimatePresence>
          {goals.map(goal => {
            const done = goal.importoAttuale >= goal.importoTarget
            const mesiRimasti = goal.scadenza ? Math.max(1, monthsUntil(new Date(goal.scadenza))) : null
            const mensile = mesiRimasti ? (goal.importoTarget - goal.importoAttuale) / mesiRimasti : null
            return (
              <motion.div key={goal.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                           style={{ backgroundColor: goal.colore + '33' }}>
                        {goal.icona}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--color-text-primary)]">{goal.nome}</p>
                        {goal.scadenza && (
                          <p className="text-xs text-[var(--color-text-muted)]">Entro {formatDate(new Date(goal.scadenza))}</p>
                        )}
                        {mensile && mensile > 0 && !done && (
                          <p className="text-xs mt-0.5" style={{ color: goal.colore }}>
                            Risparmia {formatCurrency(mensile)}/mese
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-numeric" style={{ color: goal.colore }}>
                        {formatCurrency(goal.importoAttuale)}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">di {formatCurrency(goal.importoTarget)}</p>
                    </div>
                  </div>
                  <ProgressBar value={goal.importoAttuale} max={goal.importoTarget} color={goal.colore} height={8} showLabel />
                  {done && (
                    <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                      className="text-center text-sm font-bold text-[var(--color-accent)] mt-2">
                      🎉 Obiettivo raggiunto!
                    </motion.p>
                  )}
                  <div className="flex gap-2 mt-3">
                    {!done && (
                      <Button size="sm" variant="secondary" onClick={() => {
                        const amt = parseFloat(prompt('Importo da aggiungere (€):') ?? '0') || 0
                        if (amt > 0) addAmount(goal, amt)
                      }}>+ Aggiungi</Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => { setEditGoal(goal); setShowModal(true) }}>✏️</Button>
                    <Button size="sm" variant="danger" onClick={() => confirm('Eliminare?') && removeRecord('savingsGoals', goal.id)}>🗑</Button>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditGoal(undefined) }}
        title={editGoal ? 'Modifica obiettivo' : 'Nuovo obiettivo'}>
        <GoalForm onSave={save} onClose={() => { setShowModal(false); setEditGoal(undefined) }} initial={editGoal} />
      </Modal>
    </div>
  )
}

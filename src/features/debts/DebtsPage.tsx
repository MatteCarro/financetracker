import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { v4 as uuid } from 'uuid'
import { db } from '@/db/schema'
import type { Debt } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/dates'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ProgressBar from '@/components/ui/ProgressBar'

function DebtForm({ onSave, onClose, initial }: {
  onSave: (d: Omit<Debt, 'createdAt' | 'updatedAt'>) => Promise<void>
  onClose: () => void
  initial?: Debt
}) {
  const [creditore, setCreditore] = useState(initial?.creditore ?? '')
  const [importoTotale, setImportoTotale] = useState(initial?.importoTotale?.toString() ?? '')
  const [importoResiduo, setImportoResiduo] = useState(initial?.importoResiduo?.toString() ?? '')
  const [rataMensile, setRataMensile] = useState(initial?.rataMensile?.toString() ?? '')
  const [scadenza, setScadenza] = useState(
    initial?.scadenza ? new Date(initial.scadenza).toISOString().split('T')[0] : ''
  )
  const [note, setNote] = useState(initial?.note ?? '')
  const [saving, setSaving] = useState(false)

  const handle = async () => {
    if (!creditore || !importoTotale) return
    setSaving(true)
    await onSave({
      id: initial?.id ?? uuid(),
      creditore,
      importoTotale: parseFloat(importoTotale.replace(',', '.')) || 0,
      importoResiduo: parseFloat(importoResiduo.replace(',', '.')) || parseFloat(importoTotale.replace(',', '.')) || 0,
      rataMensile: rataMensile ? parseFloat(rataMensile.replace(',', '.')) : undefined,
      scadenza: scadenza ? new Date(scadenza) : undefined,
      note: note || undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <Input label="Creditore" value={creditore} onChange={e => setCreditore(e.target.value)} placeholder="es. Banca, Amico, Finanziaria" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Importo totale (€)" value={importoTotale} onChange={e => setImportoTotale(e.target.value)} type="number" step="0.01" icon="€" />
        <Input label="Importo residuo (€)" value={importoResiduo} onChange={e => setImportoResiduo(e.target.value)} type="number" step="0.01" icon="€" />
      </div>
      <Input label="Rata mensile (€, opz.)" value={rataMensile} onChange={e => setRataMensile(e.target.value)} type="number" step="0.01" icon="€" />
      <Input label="Scadenza (opz.)" value={scadenza} onChange={e => setScadenza(e.target.value)} type="date" />
      <Input label="Note (opz.)" value={note} onChange={e => setNote(e.target.value)} placeholder="Dettagli..." />
      <Button onClick={handle} disabled={saving || !creditore || !importoTotale} fullWidth>
        {saving ? 'Salvataggio...' : initial ? 'Aggiorna' : 'Aggiungi debito'}
      </Button>
    </div>
  )
}

export default function DebtsPage() {
  const debts = useLiveQuery(() => db.debts.toArray(), []) ?? []
  const [showModal, setShowModal] = useState(false)
  const [editDebt, setEditDebt] = useState<Debt | undefined>()

  const save = async (d: Omit<Debt, 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    if (editDebt) await db.debts.put({ ...d, createdAt: editDebt.createdAt, updatedAt: now })
    else await db.debts.add({ ...d, createdAt: now, updatedAt: now })
    setEditDebt(undefined)
  }

  const totalResiduo = debts.reduce((s, d) => s + d.importoResiduo, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Debiti</h2>
        <Button size="sm" onClick={() => { setEditDebt(undefined); setShowModal(true) }}>+ Aggiungi</Button>
      </div>

      <Card subtle className="!p-3 text-center">
        <p className="text-xs text-[var(--color-text-muted)]">Debito totale residuo</p>
        <p className="text-xl font-bold font-numeric text-[var(--color-danger)]">{formatCurrency(totalResiduo)}</p>
      </Card>

      {debts.length === 0 ? (
        <Card className="text-center !py-8"><p className="text-[var(--color-text-muted)]">Nessun debito. 🎉</p></Card>
      ) : (
        <AnimatePresence>
          {debts.map(debt => {
            const paid = debt.importoTotale - debt.importoResiduo
            const mesiRimasti = debt.rataMensile && debt.rataMensile > 0
              ? Math.ceil(debt.importoResiduo / debt.rataMensile) : null

            return (
              <motion.div key={debt.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)]">{debt.creditore}</p>
                      {debt.scadenza && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Scadenza: {formatDate(new Date(debt.scadenza))}</p>
                      )}
                      {mesiRimasti && (
                        <p className="text-xs text-[var(--color-accent)] mt-0.5">Estinzione: ~{mesiRimasti} mesi</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold font-numeric text-[var(--color-danger)]">{formatCurrency(debt.importoResiduo)}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">su {formatCurrency(debt.importoTotale)}</p>
                    </div>
                  </div>
                  <ProgressBar value={paid} max={debt.importoTotale} color="#10b981" height={6} showLabel />
                  {debt.rataMensile && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-2">Rata: {formatCurrency(debt.rataMensile)}/mese</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="secondary" onClick={() => { setEditDebt(debt); setShowModal(true) }}>✏️</Button>
                    <Button size="sm" variant="danger" onClick={() => confirm('Eliminare?') && db.debts.delete(debt.id)}>🗑</Button>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditDebt(undefined) }}
        title={editDebt ? 'Modifica debito' : 'Nuovo debito'}>
        <DebtForm onSave={save} onClose={() => { setShowModal(false); setEditDebt(undefined) }} initial={editDebt} />
      </Modal>
    </div>
  )
}

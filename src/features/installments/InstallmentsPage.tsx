import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { v4 as uuid } from 'uuid'
import { db } from '@/db/schema'
import type { Installment } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { monthlyInstallmentCost } from '@/lib/finance'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ProgressBar from '@/components/ui/ProgressBar'

function InstallmentForm({ onSave, onClose, initial }: {
  onSave: (i: Omit<Installment, 'createdAt' | 'updatedAt'>) => Promise<void>
  onClose: () => void
  initial?: Installment
}) {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? []

  const [descrizione, setDescrizione] = useState(initial?.descrizione ?? '')
  const [importoTotale, setImportoTotale] = useState(initial?.importoTotale?.toString() ?? '')
  const [numeroRate, setNumeroRate] = useState(initial?.numeroRate?.toString() ?? '')
  const [dataInizio, setDataInizio] = useState(
    initial?.dataInizio ? new Date(initial.dataInizio).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [giornoAddebito, setGiornoAddebito] = useState(initial?.giornoAddebito?.toString() ?? '1')
  const [fonteId, setFonteId] = useState(initial?.fonteId ?? '')
  const [tassoInteresse, setTassoInteresse] = useState(initial?.tassoInteresse?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  const totale = parseFloat(importoTotale.replace(',', '.')) || 0
  const nRate = parseInt(numeroRate) || 1
  const rataMensile = nRate > 0 ? totale / nRate : 0

  const handle = async () => {
    if (!descrizione || !importoTotale || !numeroRate) return
    setSaving(true)
    await onSave({
      id: initial?.id ?? uuid(),
      descrizione, importoTotale: totale, numeroRate: nRate,
      rataMensile, rateResidue: initial?.rateResidue ?? nRate,
      dataInizio: new Date(dataInizio),
      giornoAddebito: parseInt(giornoAddebito) || 1,
      fonteId: fonteId || accounts[0]?.id || '',
      tassoInteresse: tassoInteresse ? parseFloat(tassoInteresse) : undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <Input label="Descrizione" value={descrizione} onChange={e => setDescrizione(e.target.value)} placeholder="es. iPhone 15 Pro" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Importo totale (€)" value={importoTotale} onChange={e => setImportoTotale(e.target.value)} type="number" step="0.01" icon="€" />
        <Input label="Numero rate" value={numeroRate} onChange={e => setNumeroRate(e.target.value)} type="number" min="1" />
      </div>
      {totale > 0 && nRate > 0 && (
        <Card subtle className="!p-3 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">Rata mensile</p>
          <p className="text-xl font-bold font-numeric text-[var(--color-primary-light)]">{formatCurrency(rataMensile)}</p>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Data inizio" value={dataInizio} onChange={e => setDataInizio(e.target.value)} type="date" />
        <Input label="Giorno addebito" value={giornoAddebito} onChange={e => setGiornoAddebito(e.target.value)} type="number" min="1" max="31" />
      </div>
      <Input label="Tasso interesse % (opz.)" value={tassoInteresse} onChange={e => setTassoInteresse(e.target.value)} type="number" step="0.01" />
      {accounts.length > 0 && (
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">Conto</label>
          {accounts.map(a => (
            <button key={a.id} onClick={() => setFonteId(a.id)}
              className={`w-full text-left px-4 py-2 rounded-xl text-sm mb-1 glass glass-hover transition-all ${fonteId === a.id ? 'text-[var(--color-primary-light)]' : 'text-[var(--color-text-secondary)]'}`}>
              {a.icona} {a.nome}
            </button>
          ))}
        </div>
      )}
      <Button onClick={handle} disabled={saving || !descrizione || !importoTotale || !numeroRate} fullWidth>
        {saving ? 'Salvataggio...' : initial ? 'Aggiorna' : 'Aggiungi rata'}
      </Button>
    </div>
  )
}

export default function InstallmentsPage() {
  const installments = useLiveQuery(() => db.installments.toArray(), []) ?? []
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Installment | undefined>()

  const save = async (i: Omit<Installment, 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    if (editItem) await db.installments.put({ ...i, createdAt: editItem.createdAt, updatedAt: now })
    else await db.installments.add({ ...i, createdAt: now, updatedAt: now })
    setEditItem(undefined)
  }

  const markPaid = async (inst: Installment) => {
    if (inst.rateResidue <= 0) return
    await db.installments.update(inst.id, { rateResidue: inst.rateResidue - 1, updatedAt: new Date() })
  }

  const monthlyTotal = monthlyInstallmentCost(installments)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Rate</h2>
        <Button size="sm" onClick={() => { setEditItem(undefined); setShowModal(true) }}>+ Aggiungi</Button>
      </div>

      <Card subtle className="!p-3 text-center">
        <p className="text-xs text-[var(--color-text-muted)]">Impegno mensile totale</p>
        <p className="text-xl font-bold font-numeric text-[var(--color-warning)]">{formatCurrency(monthlyTotal)}</p>
      </Card>

      {installments.length === 0 ? (
        <Card className="text-center !py-8"><p className="text-[var(--color-text-muted)]">Nessuna rata.</p></Card>
      ) : (
        <AnimatePresence>
          {installments.map(inst => {
            const paid = inst.numeroRate - inst.rateResidue
            const pct = (paid / inst.numeroRate) * 100
            const residuo = inst.rateResidue * inst.rataMensile
            const done = inst.rateResidue === 0
            return (
              <motion.div key={inst.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)]">{inst.descrizione}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {paid}/{inst.numeroRate} rate pagate · giorno {inst.giornoAddebito}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold font-numeric text-[var(--color-warning)]">{formatCurrency(inst.rataMensile)}/mese</p>
                      <p className="text-xs text-[var(--color-text-muted)]">Residuo: {formatCurrency(residuo)}</p>
                    </div>
                  </div>
                  <ProgressBar value={paid} max={inst.numeroRate} color="#10b981" height={6} showLabel />
                  <div className="flex gap-2 mt-3">
                    {!done && (
                      <Button size="sm" variant="secondary" onClick={() => markPaid(inst)}>✓ Segna pagata</Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => { setEditItem(inst); setShowModal(true) }}>✏️</Button>
                    <Button size="sm" variant="danger" onClick={() => confirm('Eliminare?') && db.installments.delete(inst.id)}>🗑</Button>
                  </div>
                  {done && <p className="text-xs text-[var(--color-accent)] mt-2 font-semibold">✓ Completata!</p>}
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditItem(undefined) }}
        title={editItem ? 'Modifica rata' : 'Nuova rata'}>
        <InstallmentForm onSave={save} onClose={() => { setShowModal(false); setEditItem(undefined) }} initial={editItem} />
      </Modal>
    </div>
  )
}

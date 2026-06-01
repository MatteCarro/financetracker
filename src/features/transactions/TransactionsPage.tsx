import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { v4 as uuid } from 'uuid'
import { db, removeRecord } from '@/db/schema'
import type { Transaction, TransactionType, PaymentMethod } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/dates'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

// ── Transaction form ──
function TransactionForm({ onSave, onClose }: {
  onSave: (t: Omit<Transaction, 'createdAt' | 'updatedAt'>) => Promise<void>
  onClose: () => void
}) {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? []
  const cards = useLiveQuery(() => db.creditCards.toArray(), []) ?? []
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? []

  const [tipo, setTipo] = useState<TransactionType>('uscita')
  const [importo, setImporto] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [metodo, setMetodo] = useState<PaymentMethod>('conto')
  const [fonteId, setFonteId] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  // Filter categories by transaction type
  const filteredCats = categories.filter(
    (c) => c.tipo === tipo || c.tipo === 'entrambi'
  )

  // Reset category when tipo changes
  const handleTipoChange = (t: TransactionType) => {
    setTipo(t)
    const newFiltered = categories.filter((c) => c.tipo === t || c.tipo === 'entrambi')
    if (newFiltered.length > 0 && !newFiltered.some((c) => c.id === categoriaId)) {
      setCategoriaId(newFiltered[0].id)
    }
  }

  const fonti = metodo === 'conto' ? accounts : cards

  const handle = async () => {
    if (!importo || !fonteId) return
    setSaving(true)
    await onSave({
      id: uuid(),
      importo: parseFloat(importo.replace(',', '.')) || 0,
      tipo,
      categoriaId: categoriaId || filteredCats[0]?.id,
      data: new Date(data),
      descrizione,
      fonteId,
      metodo,
      ricorrente: false,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Tipo */}
      <div className="grid grid-cols-2 gap-2">
        {(['uscita', 'entrata'] as TransactionType[]).map((t) => (
          <button key={t} onClick={() => handleTipoChange(t)}
            className={`py-3 rounded-xl text-sm font-semibold glass glass-hover transition-all ${
              tipo === t
                ? t === 'entrata' ? 'text-[var(--color-accent)] border-[var(--color-accent)]/40' : 'text-[var(--color-danger)] border-[var(--color-danger)]/40'
                : 'text-[var(--color-text-muted)]'
            }`}>
            {t === 'entrata' ? '↑ Entrata' : '↓ Uscita'}
          </button>
        ))}
      </div>

      <Input label="Importo (€)" value={importo} onChange={(e) => setImporto(e.target.value)} type="number" step="0.01" placeholder="0,00" icon="€" />
      <Input label="Descrizione" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="es. Supermercato" />
      <Input label="Data" value={data} onChange={(e) => setData(e.target.value)} type="date" />

      {/* Categoria — filtrate per tipo */}
      <div>
        <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">
          Categoria {tipo === 'entrata' ? '(entrate)' : '(uscite)'}
        </label>
        <div className="flex flex-wrap gap-2">
          {filteredCats.map((c) => (
            <button key={c.id} onClick={() => setCategoriaId(c.id)}
              className={`px-3 py-1.5 rounded-xl text-sm glass glass-hover transition-all ${categoriaId === c.id ? 'border-[var(--color-primary)]/60 text-[var(--color-primary-light)]' : 'text-[var(--color-text-muted)]'}`}>
              {c.icona} {c.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Metodo */}
      <div className="grid grid-cols-2 gap-2">
        {(['conto', 'carta'] as PaymentMethod[]).map((m) => (
          <button key={m} onClick={() => setMetodo(m)}
            className={`py-2 rounded-xl text-sm font-medium glass glass-hover transition-all ${metodo === m ? 'text-[var(--color-primary-light)] border-[var(--color-primary)]/40' : 'text-[var(--color-text-muted)]'}`}>
            {m === 'conto' ? '🏦 Conto' : '💳 Carta'}
          </button>
        ))}
      </div>

      {/* Fonte */}
      {fonti.length > 0 && (
        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">
            {metodo === 'conto' ? 'Conto' : 'Carta'}
          </label>
          <div className="flex flex-col gap-2">
            {fonti.map((f) => (
              <button key={f.id} onClick={() => setFonteId(f.id)}
                className={`px-4 py-2 rounded-xl text-sm text-left glass glass-hover transition-all ${fonteId === f.id ? 'border-[var(--color-primary)]/60 text-[var(--color-primary-light)]' : 'text-[var(--color-text-secondary)]'}`}>
                {f.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button onClick={handle} disabled={saving || !importo || !fonteId} fullWidth>
        {saving ? 'Salvataggio...' : 'Aggiungi movimento'}
      </Button>
    </div>
  )
}

// ── Main page ──
export default function TransactionsPage() {
  const transactions = useLiveQuery(() =>
    db.transactions.orderBy('data').reverse().limit(100).toArray(), []
  ) ?? []
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState<'tutti' | 'entrata' | 'uscita'>('tutti')

  const catMap = new Map(categories.map((c) => [c.id, c]))

  const filtered = transactions.filter((t) => filter === 'tutti' || t.tipo === filter)

  const saveTransaction = async (t: Omit<Transaction, 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    await db.transactions.add({ ...t, createdAt: now, updatedAt: now })
    // Update card balance if needed
    if (t.metodo === 'carta' && t.tipo === 'uscita') {
      const card = await db.creditCards.get(t.fonteId)
      if (card) {
        await db.creditCards.update(t.fonteId, {
          saldoConsumato: card.saldoConsumato + t.importo,
          updatedAt: now,
        })
      }
    }
    if (t.metodo === 'conto') {
      const acc = await db.accounts.get(t.fonteId)
      if (acc) {
        const delta = t.tipo === 'entrata' ? t.importo : -t.importo
        await db.accounts.update(t.fonteId, { saldo: acc.saldo + delta, updatedAt: now })
      }
    }
  }

  const deleteTransaction = async (tx: Transaction) => {
    if (!confirm('Eliminare questo movimento?')) return
    await removeRecord('transactions', tx.id)
    // Reverse balance update
    if (tx.metodo === 'carta' && tx.tipo === 'uscita') {
      const card = await db.creditCards.get(tx.fonteId)
      if (card) await db.creditCards.update(tx.fonteId, { saldoConsumato: Math.max(0, card.saldoConsumato - tx.importo), updatedAt: new Date() })
    }
    if (tx.metodo === 'conto') {
      const acc = await db.accounts.get(tx.fonteId)
      if (acc) {
        const delta = tx.tipo === 'entrata' ? -tx.importo : tx.importo
        await db.accounts.update(tx.fonteId, { saldo: acc.saldo + delta, updatedAt: new Date() })
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Movimenti</h1>
        <Button size="sm" onClick={() => setShowModal(true)}>+ Aggiungi</Button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {(['tutti', 'entrata', 'uscita'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium glass transition-all ${filter === f ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary-light)]' : 'text-[var(--color-text-muted)]'}`}>
            {f === 'tutti' ? 'Tutti' : f === 'entrata' ? '↑ Entrate' : '↓ Uscite'}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="text-center !py-10">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-[var(--color-text-muted)]">Nessun movimento. Aggiungine uno!</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {filtered.map((tx) => {
              const cat = catMap.get(tx.categoriaId)
              return (
                <motion.div key={tx.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                  <Card>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg glass-subtle">
                          {cat?.icona ?? '📌'}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--color-text-primary)] text-sm">
                            {tx.descrizione || cat?.nome || 'Movimento'}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">{formatDate(new Date(tx.data))}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`font-bold font-numeric text-base ${tx.tipo === 'entrata' ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]'}`}>
                          {tx.tipo === 'entrata' ? '+' : '-'}{formatCurrency(tx.importo)}
                        </p>
                        <button onClick={() => deleteTransaction(tx)} className="text-[var(--color-text-muted)] opacity-50 hover:opacity-100 p-1">×</button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nuovo movimento">
        <TransactionForm onSave={saveTransaction} onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}

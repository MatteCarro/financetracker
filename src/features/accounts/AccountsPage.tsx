import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { v4 as uuid } from 'uuid'
import { db } from '@/db/schema'
import type { Account, AccountType, CreditCard } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { cardUsagePercent, cardAvailableCredit } from '@/lib/finance'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ProgressBar from '@/components/ui/ProgressBar'

const ACCOUNT_ICONS: Record<AccountType, string> = {
  corrente: '🏦',
  risparmio: '💰',
  contanti: '💵',
  altro: '📊',
}

const CARD_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6']

// ── Account form ──
function AccountForm({ onSave, onClose, initial }: {
  onSave: (a: Omit<Account, 'createdAt' | 'updatedAt'>) => Promise<void>
  onClose: () => void
  initial?: Account
}) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [tipo, setTipo] = useState<AccountType>(initial?.tipo ?? 'corrente')
  const [saldo, setSaldo] = useState(initial?.saldo?.toString() ?? '0')
  const [colore, setColore] = useState(initial?.colore ?? CARD_COLORS[0])
  const [saving, setSaving] = useState(false)

  const handle = async () => {
    if (!nome) return
    setSaving(true)
    await onSave({
      id: initial?.id ?? uuid(),
      nome, tipo,
      saldo: parseFloat(saldo.replace(',', '.')) || 0,
      valuta: 'EUR',
      icona: ACCOUNT_ICONS[tipo],
      colore,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <Input label="Nome conto" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Conto Corrente BancaX" />
      <div>
        <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">Tipo</label>
        <div className="grid grid-cols-2 gap-2">
          {(['corrente', 'risparmio', 'contanti', 'altro'] as AccountType[]).map((t) => (
            <button key={t} onClick={() => setTipo(t)}
              className={`py-2 px-3 rounded-xl text-sm font-medium glass glass-hover transition-all ${tipo === t ? 'border-[var(--color-primary)]/60 text-[var(--color-primary-light)]' : 'text-[var(--color-text-secondary)]'}`}>
              {ACCOUNT_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <Input label="Saldo iniziale" value={saldo} onChange={(e) => setSaldo(e.target.value)} type="number" step="0.01" icon="€" />
      <div>
        <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">Colore</label>
        <div className="flex gap-2 flex-wrap">
          {CARD_COLORS.map((c) => (
            <button key={c} onClick={() => setColore(c)}
              className={`w-8 h-8 rounded-full transition-all ${colore === c ? 'ring-2 ring-white/60 scale-110' : ''}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <Button onClick={handle} disabled={saving || !nome} fullWidth>
        {saving ? 'Salvataggio...' : initial ? 'Aggiorna' : 'Aggiungi conto'}
      </Button>
    </div>
  )
}

// ── Credit card form ──
function CardForm({ onSave, onClose, initial }: {
  onSave: (c: Omit<CreditCard, 'createdAt' | 'updatedAt'>) => Promise<void>
  onClose: () => void
  initial?: CreditCard
}) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [plafond, setPlafond] = useState(initial?.plafond?.toString() ?? '')
  const [saldoConsumato, setSaldoConsumato] = useState(initial?.saldoConsumato?.toString() ?? '0')
  const [giornoChiusura, setGiornoChiusura] = useState(initial?.giornoChiusuraEstratto?.toString() ?? '25')
  const [giornoAddebito, setGiornoAddebito] = useState(initial?.giornoAddebito?.toString() ?? '15')
  const [colore, setColore] = useState(initial?.colore ?? CARD_COLORS[0])
  const [saving, setSaving] = useState(false)

  const handle = async () => {
    if (!nome || !plafond) return
    setSaving(true)
    await onSave({
      id: initial?.id ?? uuid(),
      nome,
      plafond: parseFloat(plafond.replace(',', '.')) || 0,
      saldoConsumato: parseFloat(saldoConsumato.replace(',', '.')) || 0,
      giornoChiusuraEstratto: parseInt(giornoChiusura) || 25,
      giornoAddebito: parseInt(giornoAddebito) || 15,
      colore,
      icona: '💳',
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <Input label="Nome carta" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Visa Gold" />
      <Input label="Plafond (€)" value={plafond} onChange={(e) => setPlafond(e.target.value)} type="number" step="0.01" icon="€" />
      <Input label="Saldo consumato (€)" value={saldoConsumato} onChange={(e) => setSaldoConsumato(e.target.value)} type="number" step="0.01" icon="€" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Giorno chiusura estratto" value={giornoChiusura} onChange={(e) => setGiornoChiusura(e.target.value)} type="number" min="1" max="31" />
        <Input label="Giorno addebito" value={giornoAddebito} onChange={(e) => setGiornoAddebito(e.target.value)} type="number" min="1" max="31" />
      </div>
      <div>
        <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 block">Colore</label>
        <div className="flex gap-2 flex-wrap">
          {CARD_COLORS.map((c) => (
            <button key={c} onClick={() => setColore(c)}
              className={`w-8 h-8 rounded-full transition-all ${colore === c ? 'ring-2 ring-white/60 scale-110' : ''}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <Button onClick={handle} disabled={saving || !nome || !plafond} fullWidth>
        {saving ? 'Salvataggio...' : initial ? 'Aggiorna' : 'Aggiungi carta'}
      </Button>
    </div>
  )
}

// ── Main page ──
export default function AccountsPage() {
  const accounts = useLiveQuery(() => db.accounts.orderBy('createdAt').toArray(), []) ?? []
  const cards = useLiveQuery(() => db.creditCards.orderBy('createdAt').toArray(), []) ?? []

  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | undefined>()
  const [editCard, setEditCard] = useState<CreditCard | undefined>()

  const saveAccount = async (a: Omit<Account, 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    if (editAccount) {
      await db.accounts.put({ ...a, createdAt: editAccount.createdAt, updatedAt: now })
    } else {
      await db.accounts.add({ ...a, createdAt: now, updatedAt: now })
    }
    setEditAccount(undefined)
  }

  const saveCard = async (c: Omit<CreditCard, 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    if (editCard) {
      await db.creditCards.put({ ...c, createdAt: editCard.createdAt, updatedAt: now })
    } else {
      await db.creditCards.add({ ...c, createdAt: now, updatedAt: now })
    }
    setEditCard(undefined)
  }

  const deleteAccount = async (id: string) => {
    if (confirm('Eliminare questo conto?')) await db.accounts.delete(id)
  }
  const deleteCard = async (id: string) => {
    if (confirm('Eliminare questa carta?')) await db.creditCards.delete(id)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* Accounts */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Conti</h2>
        <Button size="sm" onClick={() => { setEditAccount(undefined); setShowAccountModal(true) }}>
          + Aggiungi
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card className="text-center !py-8">
          <p className="text-[var(--color-text-muted)]">Nessun conto. Aggiungine uno!</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {accounts.map((acc) => (
              <motion.div key={acc.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                           style={{ backgroundColor: acc.colore + '33' }}>
                        {acc.icona}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--color-text-primary)]">{acc.nome}</p>
                        <p className="text-xs text-[var(--color-text-muted)] capitalize">{acc.tipo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg font-numeric" style={{ color: acc.saldo >= 0 ? '#10b981' : '#ef4444' }}>
                        {formatCurrency(acc.saldo)}
                      </p>
                      <button onClick={() => { setEditAccount(acc); setShowAccountModal(true) }}
                        className="text-[var(--color-text-muted)] p-1">✏️</button>
                      <button onClick={() => deleteAccount(acc.id)}
                        className="text-[var(--color-danger)] p-1">🗑</button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Credit Cards */}
      <div className="flex items-center justify-between mt-2">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Carte di credito</h2>
        <Button size="sm" onClick={() => { setEditCard(undefined); setShowCardModal(true) }}>
          + Aggiungi
        </Button>
      </div>

      {cards.length === 0 ? (
        <Card className="text-center !py-8">
          <p className="text-[var(--color-text-muted)]">Nessuna carta. Aggiungine una!</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {cards.map((card) => {
              const pct = cardUsagePercent(card)
              const available = cardAvailableCredit(card)
              return (
                <motion.div key={card.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Card>
                    {/* Card visual */}
                    <div className="rounded-xl p-4 mb-3" style={{ background: `linear-gradient(135deg, ${card.colore}cc, ${card.colore}66)` }}>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl">💳</span>
                        <span className="text-white/80 text-sm font-medium">{card.nome}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-white/60 text-xs">Disponibile</p>
                          <p className="text-white font-bold text-lg font-numeric">{formatCurrency(available)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/60 text-xs">Plafond</p>
                          <p className="text-white/80 font-semibold font-numeric">{formatCurrency(card.plafond)}</p>
                        </div>
                      </div>
                    </div>

                    <ProgressBar value={card.saldoConsumato} max={card.plafond} height={6} showLabel />
                    <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
                      <span>Consumato: {formatCurrency(card.saldoConsumato)}</span>
                      <span className={pct >= 80 ? 'text-[var(--color-danger)]' : pct >= 50 ? 'text-[var(--color-warning)]' : 'text-[var(--color-accent)]'}>
                        {pct.toFixed(0)}% utilizzato
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
                      <span>Chiusura estratto: giorno {card.giornoChiusuraEstratto}</span>
                      <span>Addebito: giorno {card.giornoAddebito}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="secondary" onClick={() => { setEditCard(card); setShowCardModal(true) }}>
                        ✏️ Modifica
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => deleteCard(card.id)}>
                        🗑 Elimina
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <Modal open={showAccountModal} onClose={() => { setShowAccountModal(false); setEditAccount(undefined) }}
        title={editAccount ? 'Modifica conto' : 'Nuovo conto'}>
        <AccountForm onSave={saveAccount} onClose={() => { setShowAccountModal(false); setEditAccount(undefined) }} initial={editAccount} />
      </Modal>

      <Modal open={showCardModal} onClose={() => { setShowCardModal(false); setEditCard(undefined) }}
        title={editCard ? 'Modifica carta' : 'Nuova carta'}>
        <CardForm onSave={saveCard} onClose={() => { setShowCardModal(false); setEditCard(undefined) }} initial={editCard} />
      </Modal>
    </div>
  )
}

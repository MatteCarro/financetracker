import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import type { Theme } from '@/lib/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { hashPin, verifyPin, deriveEncryptionKey } from '@/crypto/crypto'

function ExportBackup() {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = {
        accounts: await db.accounts.toArray(),
        categories: await db.categories.toArray(),
        creditCards: await db.creditCards.toArray(),
        transactions: await db.transactions.toArray(),
        subscriptions: await db.subscriptions.toArray(),
        installments: await db.installments.toArray(),
        debts: await db.debts.toArray(),
        income: await db.income.toArray(),
        savingsGoals: await db.savingsGoals.toArray(),
        exportedAt: new Date().toISOString(),
        version: 1,
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `financetracker-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button onClick={handleExport} disabled={exporting} variant="secondary" fullWidth>
      {exporting ? 'Esportazione...' : '📤 Esporta backup'}
    </Button>
  )
}

function ImportBackup() {
  const [importing, setImporting] = useState(false)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('L\'import sovrascriverà tutti i dati esistenti. Continuare?')) return
    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await db.transaction('rw', [db.accounts, db.categories, db.creditCards, db.transactions, db.subscriptions, db.installments, db.debts, db.income, db.savingsGoals], async () => {
        await db.accounts.clear(); if (data.accounts) await db.accounts.bulkAdd(data.accounts)
        await db.creditCards.clear(); if (data.creditCards) await db.creditCards.bulkAdd(data.creditCards)
        await db.transactions.clear(); if (data.transactions) await db.transactions.bulkAdd(data.transactions)
        await db.subscriptions.clear(); if (data.subscriptions) await db.subscriptions.bulkAdd(data.subscriptions)
        await db.installments.clear(); if (data.installments) await db.installments.bulkAdd(data.installments)
        await db.debts.clear(); if (data.debts) await db.debts.bulkAdd(data.debts)
        await db.income.clear(); if (data.income) await db.income.bulkAdd(data.income)
        await db.savingsGoals.clear(); if (data.savingsGoals) await db.savingsGoals.bulkAdd(data.savingsGoals)
      })
      alert('Import completato con successo!')
    } catch {
      alert('Errore durante l\'import. Verifica il file.')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <label className="cursor-pointer">
      <Button variant="secondary" fullWidth disabled={importing}>
        {importing ? 'Importazione...' : '📥 Importa backup'}
      </Button>
      <input type="file" accept=".json" className="hidden" onChange={handleImport} />
    </label>
  )
}

export default function SettingsPage() {
  const { settings, update } = useSettingsStore()
  const { lock } = useAuthStore()
  const dbSettings = useLiveQuery(() => db.settings.get('singleton'), [])

  const [showChangePIN, setShowChangePIN] = useState(false)
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')

  const handleTheme = (tema: Theme) => update({ tema })

  const handleChangePIN = async () => {
    if (!dbSettings?.pinHash || !dbSettings.pinSalt) return
    const valid = await verifyPin(oldPin, dbSettings.pinHash, dbSettings.pinSalt)
    if (!valid) { setPinError('PIN attuale errato'); return }
    if (newPin !== confirmPin) { setPinError('I nuovi PIN non corrispondono'); return }
    if (newPin.length < 4) { setPinError('Il PIN deve avere almeno 4 cifre'); return }
    const { hash, salt } = await hashPin(newPin)
    const key = await deriveEncryptionKey(newPin, salt)
    await db.settings.update('singleton', { pinHash: hash, pinSalt: salt, updatedAt: new Date() })
    useAuthStore.setState({ encryptionKey: key })
    setShowChangePIN(false)
    setOldPin(''); setNewPin(''); setConfirmPin(''); setPinError('')
  }

  const mascotteName = settings?.mascotteName ?? 'Soldino'

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Impostazioni</h1>

      {/* Mascot name */}
      <Card className="!p-4">
        <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Mascotte</p>
        <Input
          label="Nome della mascotte"
          value={mascotteName}
          onChange={(e) => update({ mascotteName: e.target.value })}
          placeholder="Soldino"
          icon="🐷"
        />
      </Card>

      {/* Theme */}
      <Card className="!p-4">
        <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Tema</p>
        <div className="grid grid-cols-3 gap-2">
          {(['dark', 'light', 'system'] as Theme[]).map((t) => (
            <button key={t} onClick={() => handleTheme(t)}
              className={`py-2 rounded-xl text-sm font-medium glass glass-hover transition-all ${settings?.tema === t ? 'text-[var(--color-primary-light)] border-[var(--color-primary)]/40' : 'text-[var(--color-text-muted)]'}`}>
              {t === 'dark' ? '🌙 Scuro' : t === 'light' ? '☀️ Chiaro' : '🔄 Sistema'}
            </button>
          ))}
        </div>
      </Card>

      {/* Lock timeout */}
      <Card className="!p-4">
        <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Blocco automatico</p>
        <div className="flex flex-wrap gap-2">
          {[1, 5, 15, 30, 60].map((min) => (
            <button key={min} onClick={() => update({ lockTimeoutMinutes: min })}
              className={`px-3 py-1.5 rounded-xl text-sm glass glass-hover transition-all ${settings?.lockTimeoutMinutes === min ? 'text-[var(--color-primary-light)] border-[var(--color-primary)]/40' : 'text-[var(--color-text-muted)]'}`}>
              {min < 60 ? `${min} min` : '1 ora'}
            </button>
          ))}
        </div>
      </Card>

      {/* Security */}
      <Card className="!p-4">
        <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Sicurezza</p>
        <div className="flex flex-col gap-2">
          <Button variant="secondary" fullWidth onClick={() => setShowChangePIN(true)}>
            🔑 Cambia PIN
          </Button>
          <Button variant="danger" fullWidth onClick={lock}>
            🔒 Blocca ora
          </Button>
        </div>
      </Card>

      {/* Backup */}
      <Card className="!p-4">
        <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Backup & Ripristino</p>
        <div className="flex flex-col gap-2">
          <ExportBackup />
          <ImportBackup />
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-2">
          Il backup è salvato localmente sul tuo dispositivo. Nessun dato viene inviato in rete.
        </p>
      </Card>

      {/* App info */}
      <Card className="!p-4 text-center">
        <p className="text-lg">🐷</p>
        <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-1">FinanceTracker</p>
        <p className="text-xs text-[var(--color-text-muted)]">v1.0.0 · Local-first · Offline</p>
      </Card>

      {/* Change PIN modal */}
      <Modal open={showChangePIN} onClose={() => setShowChangePIN(false)} title="Cambia PIN">
        <div className="flex flex-col gap-4 pb-4">
          <Input label="PIN attuale" value={oldPin} onChange={(e) => setOldPin(e.target.value)} type="password" />
          <Input label="Nuovo PIN" value={newPin} onChange={(e) => setNewPin(e.target.value)} type="password" />
          <Input label="Conferma nuovo PIN" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} type="password" />
          {pinError && <p className="text-[var(--color-danger)] text-sm">{pinError}</p>}
          <Button onClick={handleChangePIN} fullWidth>Aggiorna PIN</Button>
        </div>
      </Modal>
    </div>
  )
}

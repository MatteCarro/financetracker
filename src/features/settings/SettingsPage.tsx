import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import { useSyncStore } from '@/store/syncStore'
import { coreDb, getProfile } from '@/db/profiles'
import type { Theme } from '@/lib/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { hashPin, verifyPin, deriveEncryptionKey } from '@/crypto/crypto'
import { formatDatetime } from '@/lib/dates'
import LinkAccountModal from './LinkAccountModal'
import {
  finalizeReturn,
  hasPendingReturn,
  isBankLinkingAvailable,
  refreshConnection,
  removeConnection,
} from '@/lib/bankSync'

function SyncCard() {
  const { settings, update } = useSettingsStore()
  const { configured, status, lastSyncAt, lastError, syncNow } = useSyncStore()
  const [passphrase, setPassphrase] = useState(settings?.syncPassphrase ?? '')
  const enabled = settings?.syncEnabled ?? false

  if (!configured) {
    return (
      <Card className="!p-4">
        <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Sincronizzazione cloud</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Non configurata su questo deploy. Aggiungi le variabili d'ambiente
          <strong> VITE_SUPABASE_URL</strong> e <strong> VITE_SUPABASE_ANON_KEY</strong> su Vercel
          per attivare il sync tra dispositivi (vedi SUPABASE.md).
        </p>
      </Card>
    )
  }

  const toggle = async () => {
    if (!enabled) {
      if (passphrase.trim().length < 6) return
      await update({ syncEnabled: true, syncPassphrase: passphrase.trim() })
      await syncNow()
    } else {
      await update({ syncEnabled: false })
    }
  }

  const statusLabel =
    status === 'syncing' ? 'Sincronizzazione…'
    : status === 'ok' ? 'Sincronizzato'
    : status === 'error' ? `Errore: ${lastError}`
    : 'In attesa'

  return (
    <Card className="!p-4">
      <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Sincronizzazione cloud</p>

      <Input
        label="Passphrase di sincronizzazione"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        type="password"
        placeholder="min. 6 caratteri"
        icon="🔗"
      />
      <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-3">
        Usa la <strong>stessa passphrase</strong> su PC e iPhone per allineare i dati.
        I dati vengono cifrati: nessuno (nemmeno il server) può leggerli senza la passphrase.
      </p>

      <Button onClick={toggle} fullWidth variant={enabled ? 'danger' : 'primary'}>
        {enabled ? 'Disattiva sync' : 'Attiva sync'}
      </Button>

      {enabled && (
        <div className="mt-3 flex flex-col gap-2">
          <Button onClick={syncNow} variant="secondary" fullWidth disabled={status === 'syncing'}>
            🔄 Sincronizza ora
          </Button>
          <p className="text-xs text-center text-[var(--color-text-muted)]">
            {statusLabel}
            {lastSyncAt ? ` · ultimo: ${formatDatetime(new Date(lastSyncAt))}` : ''}
          </p>
        </div>
      )}
    </Card>
  )
}

function BankCard() {
  const available = isBankLinkingAvailable()
  const connections = useLiveQuery(
    () => db.bankConnections.orderBy('createdAt').toArray(),
    []
  ) ?? []

  const [showModal, setShowModal] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Handle the redirect back from the bank: import the freshly linked data.
  useEffect(() => {
    if (!hasPendingReturn()) return
    setFinalizing(true)
    setError('')
    finalizeReturn()
      .then((summary) => {
        if (summary) {
          setMessage(
            `Collegamento riuscito: ${summary.accountsLinked} conto/i, ${summary.transactionsAdded} movimenti importati.`
          )
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Errore durante l\'importazione'))
      .finally(() => setFinalizing(false))
  }, [])

  const handleRefresh = async (id: string) => {
    setBusyId(id)
    setError('')
    setMessage('')
    try {
      const summary = await refreshConnection(id)
      setMessage(`Aggiornato: ${summary.transactionsAdded} nuovi movimenti importati.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore durante l\'aggiornamento')
    } finally {
      setBusyId(null)
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Scollegare questa banca? I conti e i movimenti già importati restano salvati.')) return
    await removeConnection(id)
  }

  return (
    <Card className="!p-4">
      <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">
        Conti bancari (Open Banking)
      </p>

      {!available ? (
        <p className="text-xs text-[var(--color-text-muted)]">
          Non configurato su questo deploy. Serve un backend (Supabase Edge Function) con le chiavi
          GoCardless: vedi <strong>BANK_LINKING.md</strong>.
        </p>
      ) : (
        <>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            Collega la tua banca per importare automaticamente conti e movimenti (accesso in sola
            lettura, tramite il login ufficiale della banca).
          </p>

          <Button onClick={() => { setMessage(''); setError(''); setShowModal(true) }} fullWidth>
            🔗 Collega conto
          </Button>

          {finalizing && (
            <p className="text-xs text-center text-[var(--color-text-muted)] mt-3">
              Importazione dei dati dalla banca in corso…
            </p>
          )}
          {message && <p className="text-xs text-[var(--color-accent)] mt-3">{message}</p>}
          {error && <p className="text-xs text-[var(--color-danger)] mt-3">{error}</p>}

          {connections.length > 0 && (
            <div className="flex flex-col gap-2 mt-4">
              {connections.map((conn) => (
                <div key={conn.id} className="glass-subtle rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {conn.logo ? (
                        <img src={conn.logo} alt="" className="w-7 h-7 rounded-md object-contain bg-white/80 p-0.5" />
                      ) : (
                        <span className="text-lg">🏦</span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {conn.institutionName}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {conn.status === 'linked'
                            ? `${conn.localAccountIds.length} conto/i${conn.lastSyncAt ? ` · ${formatDatetime(new Date(conn.lastSyncAt))}` : ''}`
                            : conn.status === 'error'
                            ? `Errore: ${conn.error ?? ''}`
                            : 'In attesa di autorizzazione…'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleRefresh(conn.id)}
                        disabled={busyId === conn.id}
                        className="p-1.5 text-[var(--color-text-secondary)] disabled:opacity-40"
                        aria-label="Sincronizza"
                      >
                        {busyId === conn.id ? '⏳' : '🔄'}
                      </button>
                      <button
                        onClick={() => handleRemove(conn.id)}
                        className="p-1.5 text-[var(--color-danger)]"
                        aria-label="Scollega"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <LinkAccountModal open={showModal} onClose={() => setShowModal(false)} />
    </Card>
  )
}

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
  const lock = useAuthStore((s) => s.lock)
  const switchProfile = useAuthStore((s) => s.switchProfile)
  const activeProfileId = useAuthStore((s) => s.activeProfileId)
  const activeProfileName = useAuthStore((s) => s.activeProfileName)

  const [showChangePIN, setShowChangePIN] = useState(false)
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')

  const handleTheme = (tema: Theme) => update({ tema })

  const handleChangePIN = async () => {
    if (!activeProfileId) return
    const profile = await getProfile(activeProfileId)
    if (!profile?.pinHash || !profile.pinSalt) return
    const valid = await verifyPin(oldPin, profile.pinHash, profile.pinSalt)
    if (!valid) { setPinError('PIN attuale errato'); return }
    if (newPin !== confirmPin) { setPinError('I nuovi PIN non corrispondono'); return }
    if (newPin.length < 4) { setPinError('Il PIN deve avere almeno 4 cifre'); return }
    const { hash, salt } = await hashPin(newPin)
    const key = await deriveEncryptionKey(newPin, salt)
    await coreDb.profiles.update(activeProfileId, {
      pinHash: hash,
      pinSalt: salt,
      pinIterations: 310_000,
      updatedAt: new Date(),
    })
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

      {/* Profile */}
      <Card className="!p-4">
        <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Profilo</p>
        {activeProfileName && (
          <p className="text-sm text-[var(--color-text-primary)] mb-3">
            Stai usando il profilo di <strong>{activeProfileName}</strong>.
          </p>
        )}
        <Button variant="secondary" fullWidth onClick={switchProfile}>
          👥 Cambia profilo
        </Button>
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

      {/* Bank linking (Open Banking) */}
      <BankCard />

      {/* Cloud sync */}
      <SyncCard />

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

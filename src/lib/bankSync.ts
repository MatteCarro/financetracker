// ── Open Banking (GoCardless Bank Account Data) ───────────────────────────────
//
// All calls go through a Supabase Edge Function ("bank-data") that holds the
// provider secrets server-side — the browser never sees them. The function
// returns already-normalized data, so this module only handles the redirect
// dance and persisting the result into the local (Dexie) database.
//
// Flow:
//   1. listInstitutions()  → user picks a bank
//   2. startLink()         → create a requisition, redirect to the bank's login
//   3. (bank redirects back to the app with ?ref=<reference>)
//   4. finalizeReturn()    → fetch accounts + transactions, import them
//   5. refreshConnection() → re-pull data for an already linked bank

import { v4 as uuid } from 'uuid'
import { db } from '@/db/schema'
import { getSupabase, isSupabaseConfigured } from '@/sync/supabase'
import { useSyncStore } from '@/store/syncStore'
import type { Account, BankConnection, Transaction } from '@/lib/types'

const FUNCTION_NAME = 'bank-data'
// Marker added to the redirect URL so we can recognise the bank's callback.
const RETURN_FLAG = 'obconnect'

const ACCOUNT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ef4444']

export interface Institution {
  id: string
  name: string
  logo?: string
  bic?: string
}

// Shape returned by the Edge Function's `fetch-data` action.
interface NormalizedTx {
  externalId: string
  date: string
  amount: number
  currency: string
  description: string
}
interface NormalizedAccount {
  externalId: string
  iban?: string
  name?: string
  currency: string
  balance: number
  transactions: NormalizedTx[]
}
interface FetchDataResult {
  accounts: NormalizedAccount[]
}

export interface ImportSummary {
  accountsLinked: number
  transactionsAdded: number
}

export function isBankLinkingAvailable(): boolean {
  return isSupabaseConfigured
}

async function invoke<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const supabase = getSupabase()
  if (!supabase) {
    throw new Error(
      'Cloud non configurato: imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (vedi BANK_LINKING.md).'
    )
  }
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { action, ...payload },
  })
  if (error) {
    // Edge Functions return error bodies; surface the most useful message.
    let detail = error.message
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json()
        if (body?.error) detail = body.error
      }
    } catch {
      /* keep generic message */
    }
    throw new Error(detail || 'Errore nel collegamento bancario')
  }
  if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
    throw new Error((data as { error: string }).error)
  }
  return data as T
}

// ── Step 1: list banks for a country ──
export async function listInstitutions(country = 'IT'): Promise<Institution[]> {
  const res = await invoke<{ institutions: Institution[] }>('institutions', { country })
  return res.institutions ?? []
}

// ── Step 2: create a requisition and redirect to the bank ──
export async function startLink(institution: Institution): Promise<void> {
  const reference = uuid()
  const redirect = `${location.origin}${location.pathname}?${RETURN_FLAG}=1`

  const { requisitionId, link } = await invoke<{ requisitionId: string; link: string }>(
    'create-requisition',
    { institutionId: institution.id, redirect, reference }
  )

  const now = new Date()
  const connection: BankConnection = {
    id: reference,
    provider: 'gocardless',
    requisitionId,
    institutionId: institution.id,
    institutionName: institution.name,
    logo: institution.logo,
    status: 'pending',
    localAccountIds: [],
    createdAt: now,
    updatedAt: now,
  }
  await db.bankConnections.put(connection)

  // Leave the app for the bank's authentication page.
  window.location.href = link
}

// ── Step 3: detect the bank's redirect back into the app ──
export function hasPendingReturn(): boolean {
  return new URLSearchParams(location.search).has(RETURN_FLAG)
}

function clearReturnParams(): void {
  const url = new URL(location.href)
  url.searchParams.delete(RETURN_FLAG)
  url.searchParams.delete('ref')
  url.searchParams.delete('error')
  url.searchParams.delete('details')
  window.history.replaceState({}, '', url.pathname + url.search + url.hash)
}

// Called when the app loads after the bank redirect. Imports the data and
// returns a summary, or null if there's nothing to finalize.
export async function finalizeReturn(): Promise<ImportSummary | null> {
  const params = new URLSearchParams(location.search)
  if (!params.has(RETURN_FLAG)) return null

  const ref = params.get('ref')
  clearReturnParams()
  if (!ref) throw new Error('Riferimento mancante nel ritorno dalla banca.')

  const connection = await db.bankConnections.get(ref)
  if (!connection) throw new Error('Collegamento bancario non trovato.')

  return importConnection(connection)
}

// ── Step 5: re-pull data for an existing connection ──
export async function refreshConnection(connectionId: string): Promise<ImportSummary> {
  const connection = await db.bankConnections.get(connectionId)
  if (!connection) throw new Error('Collegamento non trovato.')
  return importConnection(connection)
}

export async function removeConnection(connectionId: string): Promise<void> {
  // Keep the imported accounts/transactions; only drop the link metadata.
  await db.bankConnections.delete(connectionId)
}

// ── Core import logic ──
async function importConnection(connection: BankConnection): Promise<ImportSummary> {
  let data: FetchDataResult
  try {
    data = await invoke<FetchDataResult>('fetch-data', { requisitionId: connection.requisitionId })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Errore'
    await db.bankConnections.update(connection.id, {
      status: 'error',
      error: message,
      updatedAt: new Date(),
    })
    throw e
  }

  const defaultCategoryId = await getDefaultCategoryId()
  const existingAccounts = await db.accounts.toArray()
  const now = new Date()
  const localAccountIds: string[] = []
  let transactionsAdded = 0

  for (const acc of data.accounts) {
    // Reuse an existing account previously imported from this provider account.
    const existing = existingAccounts.find((a) => a.externalAccountId === acc.externalId)
    const accountId = existing?.id ?? uuid()
    const nome = acc.name?.trim() || connection.institutionName

    const accountRecord: Account = {
      id: accountId,
      nome,
      tipo: 'corrente',
      saldo: acc.balance,
      valuta: acc.currency || 'EUR',
      icona: '🏦',
      colore: existing?.colore ?? ACCOUNT_COLORS[existingAccounts.length % ACCOUNT_COLORS.length],
      provider: 'gocardless',
      externalAccountId: acc.externalId,
      iban: acc.iban,
      bankConnectionId: connection.id,
      lastSyncedAt: now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await db.accounts.put(accountRecord)
    localAccountIds.push(accountId)

    // De-duplicate: collect external ids already imported for this account.
    const existingTx = await db.transactions.where('fonteId').equals(accountId).toArray()
    const seen = new Set(existingTx.map((t) => t.externalId).filter(Boolean) as string[])

    const toAdd: Transaction[] = []
    for (const tx of acc.transactions) {
      if (!tx.externalId || seen.has(tx.externalId)) continue
      if (!defaultCategoryId) continue // can't store a transaction without a category
      seen.add(tx.externalId)
      toAdd.push({
        id: uuid(),
        importo: Math.abs(tx.amount),
        tipo: tx.amount < 0 ? 'uscita' : 'entrata',
        categoriaId: defaultCategoryId,
        data: new Date(tx.date),
        descrizione: tx.description || 'Movimento bancario',
        fonteId: accountId,
        metodo: 'conto',
        ricorrente: false,
        externalId: tx.externalId,
        createdAt: now,
        updatedAt: now,
      })
    }
    if (toAdd.length) {
      await db.transactions.bulkAdd(toAdd)
      transactionsAdded += toAdd.length
    }
  }

  await db.bankConnections.update(connection.id, {
    status: 'linked',
    localAccountIds,
    lastSyncAt: now,
    error: undefined,
    updatedAt: now,
  })

  // Push the freshly imported data to the cloud if sync is on.
  useSyncStore.getState().scheduleSync()

  return { accountsLinked: data.accounts.length, transactionsAdded }
}

async function getDefaultCategoryId(): Promise<string | undefined> {
  const altro = await db.categories.where('nome').equals('Altro').first()
  if (altro) return altro.id
  const first = await db.categories.toCollection().first()
  return first?.id
}

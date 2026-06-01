import { db, SYNCED_TABLES, type SyncedTable } from '@/db/schema'
import type { Tombstone } from '@/lib/types'
import { deriveSyncMaterial, encrypt, decrypt } from '@/crypto/crypto'
import { getSupabase } from './supabase'

const SNAPSHOT_VERSION = 1
const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000 // prune tombstones older than 90 days

// Date fields to revive when a snapshot comes back from JSON.
const DATE_FIELDS: Record<SyncedTable, string[]> = {
  accounts: ['createdAt', 'updatedAt'],
  categories: ['createdAt', 'updatedAt'],
  creditCards: ['createdAt', 'updatedAt'],
  transactions: ['data', 'createdAt', 'updatedAt'],
  subscriptions: ['prossimoRinnovo', 'createdAt', 'updatedAt'],
  installments: ['dataInizio', 'createdAt', 'updatedAt'],
  debts: ['scadenza', 'createdAt', 'updatedAt'],
  income: ['createdAt', 'updatedAt'],
  savingsGoals: ['scadenza', 'createdAt', 'updatedAt'],
}

type Row = Record<string, unknown> & { id: string; updatedAt: Date | string | number }

interface Snapshot {
  v: number
  tables: Record<string, Row[]>
  tombstones: Tombstone[]
}

function ts(value: Date | string | number | undefined): number {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  return new Date(value).getTime()
}

function reviveDates(table: SyncedTable, row: Row): Row {
  const fields = DATE_FIELDS[table]
  const out = { ...row }
  for (const f of fields) {
    if (out[f] != null && !(out[f] instanceof Date)) {
      out[f] = new Date(out[f] as string)
    }
  }
  return out
}

async function buildLocalSnapshot(): Promise<Snapshot> {
  const tables: Record<string, Row[]> = {}
  for (const t of SYNCED_TABLES) {
    tables[t] = (await db.table(t).toArray()) as Row[]
  }
  const tombstones = await db.tombstones.toArray()
  return { v: SNAPSHOT_VERSION, tables, tombstones }
}

// Merge two snapshots: newest updatedAt wins per record; a tombstone newer than
// the surviving record removes it. Returns the merged snapshot.
function mergeSnapshots(local: Snapshot, remote: Snapshot): Snapshot {
  // Merge tombstones (newest deletedAt per key), prune very old ones.
  const now = Date.now()
  const tombMap = new Map<string, Tombstone>()
  for (const tomb of [...local.tombstones, ...remote.tombstones]) {
    if (now - tomb.deletedAt > TOMBSTONE_TTL_MS) continue
    const existing = tombMap.get(tomb.id)
    if (!existing || tomb.deletedAt > existing.deletedAt) tombMap.set(tomb.id, tomb)
  }

  const mergedTables: Record<string, Row[]> = {}
  for (const t of SYNCED_TABLES) {
    const byId = new Map<string, Row>()
    for (const r of local.tables[t] ?? []) byId.set(r.id, r)
    for (const r of remote.tables[t] ?? []) {
      const existing = byId.get(r.id)
      if (!existing || ts(r.updatedAt) > ts(existing.updatedAt)) byId.set(r.id, r)
    }
    const result: Row[] = []
    for (const [id, row] of byId) {
      const tomb = tombMap.get(`${t}:${id}`)
      if (tomb && tomb.deletedAt >= ts(row.updatedAt)) continue // deletion wins
      result.push(row)
    }
    mergedTables[t] = result
  }

  return { v: SNAPSHOT_VERSION, tables: mergedTables, tombstones: Array.from(tombMap.values()) }
}

// Write a merged snapshot back into the local database.
async function applySnapshot(snapshot: Snapshot): Promise<void> {
  const tableObjs = SYNCED_TABLES.map((t) => db.table(t))
  await db.transaction('rw', [...tableObjs, db.tombstones], async () => {
    for (const t of SYNCED_TABLES) {
      const rows = (snapshot.tables[t] ?? []).map((r) => reviveDates(t, r))
      await db.table(t).clear()
      if (rows.length) await db.table(t).bulkAdd(rows)
    }
    await db.tombstones.clear()
    if (snapshot.tombstones.length) await db.tombstones.bulkAdd(snapshot.tombstones)
  })
}

const EMPTY_SNAPSHOT: Snapshot = { v: SNAPSHOT_VERSION, tables: {}, tombstones: [] }

export interface SyncResult {
  ok: boolean
  error?: string
}

// Full bidirectional sync: pull remote, merge with local, write back, push merged.
export async function runSync(passphrase: string): Promise<SyncResult> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'Sync non configurato' }
  if (!passphrase) return { ok: false, error: 'Passphrase mancante' }

  try {
    const { groupId, key } = await deriveSyncMaterial(passphrase)

    // 1. Pull remote snapshot.
    const { data: remoteRow, error: pullErr } = await supabase
      .from('snapshots')
      .select('payload, rev')
      .eq('group_id', groupId)
      .maybeSingle()
    if (pullErr) return { ok: false, error: pullErr.message }

    let remoteSnapshot: Snapshot = EMPTY_SNAPSHOT
    let remoteRev = 0
    if (remoteRow?.payload) {
      try {
        const json = await decrypt(key, remoteRow.payload as string)
        remoteSnapshot = JSON.parse(json) as Snapshot
        remoteRev = (remoteRow.rev as number) ?? 0
      } catch {
        return { ok: false, error: 'Passphrase errata o dati non leggibili' }
      }
    }

    // 2. Merge.
    const local = await buildLocalSnapshot()
    const merged = mergeSnapshots(local, remoteSnapshot)

    // 3. Write merged back locally.
    await applySnapshot(merged)

    // 4. Push merged snapshot to the cloud.
    const payload = await encrypt(key, JSON.stringify(merged))
    const { error: pushErr } = await supabase
      .from('snapshots')
      .upsert(
        { group_id: groupId, payload, rev: remoteRev + 1, updated_at: new Date().toISOString() },
        { onConflict: 'group_id' }
      )
    if (pushErr) return { ok: false, error: pushErr.message }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore di sincronizzazione' }
  }
}

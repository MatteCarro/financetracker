import Dexie, { type EntityTable } from 'dexie'
import type {
  Account,
  BankConnection,
  Category,
  CreditCard,
  Debt,
  Income,
  Installment,
  SavingsGoal,
  Settings,
  Subscription,
  Tombstone,
  Transaction,
} from '@/lib/types'

// Tables that hold syncable financial records.
export const SYNCED_TABLES = [
  'accounts',
  'categories',
  'creditCards',
  'transactions',
  'subscriptions',
  'installments',
  'debts',
  'income',
  'savingsGoals',
] as const

export type SyncedTable = (typeof SYNCED_TABLES)[number]

export class FinanceDB extends Dexie {
  accounts!: EntityTable<Account, 'id'>
  categories!: EntityTable<Category, 'id'>
  creditCards!: EntityTable<CreditCard, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  subscriptions!: EntityTable<Subscription, 'id'>
  installments!: EntityTable<Installment, 'id'>
  debts!: EntityTable<Debt, 'id'>
  income!: EntityTable<Income, 'id'>
  savingsGoals!: EntityTable<SavingsGoal, 'id'>
  settings!: EntityTable<Settings, 'id'>
  tombstones!: EntityTable<Tombstone, 'id'>
  bankConnections!: EntityTable<BankConnection, 'id'>

  constructor(dbName: string) {
    super(dbName)
    this.version(1).stores({
      accounts: 'id, tipo, createdAt',
      categories: 'id, nome, createdAt',
      creditCards: 'id, contoCollegatoId, createdAt',
      transactions: 'id, tipo, categoriaId, data, fonteId, metodo, createdAt',
      subscriptions: 'id, attivo, prossimoRinnovo, categoriaId, fonteId, createdAt',
      installments: 'id, fonteId, createdAt',
      debts: 'id, scadenza, createdAt',
      income: 'id, ricorrente, createdAt',
      savingsGoals: 'id, scadenza, createdAt',
      settings: 'id',
    })
    this.version(2).stores({
      categories: 'id, nome, tipo, createdAt',
    }).upgrade((tx) => {
      return tx.table('categories').toCollection().modify((cat) => {
        if (!cat.tipo) cat.tipo = 'uscita'
      })
    })
    this.version(3).stores({
      tombstones: 'id, table, deletedAt',
    })
    // v4: Open Banking. `externalId` index lets us de-duplicate imported
    // transactions; `bankConnections` stores the link metadata (local only).
    this.version(4).stores({
      transactions: 'id, tipo, categoriaId, data, fonteId, metodo, createdAt, externalId',
      bankConnections: 'id, status, createdAt',
    })
  }
}

// `db` is a live binding: it points to the active profile's database. ESM
// live bindings mean every `import { db }` sees the current instance. Feature
// components read `db.<table>` at call time, so they always hit the right DB.
// Profile selection happens before the main app mounts, so this is safe.
export let db: FinanceDB = new FinanceDB('FinanceTrackerDB')

// Open (and switch to) a specific profile's database.
export function openProfileDb(profileId: string): FinanceDB {
  db = new FinanceDB(`FinanceTrackerDB_p_${profileId}`)
  return db
}

// Delete a record AND record a tombstone (so the deletion propagates via sync).
// Use this everywhere instead of `db.<table>.delete(id)`.
export async function removeRecord(table: SyncedTable, id: string): Promise<void> {
  await db.transaction('rw', db.table(table), db.tombstones, async () => {
    await db.table(table).delete(id)
    await db.tombstones.put({
      id: `${table}:${id}`,
      table,
      recordId: id,
      deletedAt: Date.now(),
    })
  })
}

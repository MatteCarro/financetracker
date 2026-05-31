import Dexie, { type EntityTable } from 'dexie'
import type {
  Account,
  Category,
  CreditCard,
  Debt,
  Income,
  Installment,
  SavingsGoal,
  Settings,
  Subscription,
  Transaction,
} from '@/lib/types'

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

  constructor() {
    super('FinanceTrackerDB')
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
  }
}

export const db = new FinanceDB()

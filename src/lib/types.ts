// ── Core financial types ──────────────────────────────────────────────────────

export type AccountType = 'corrente' | 'risparmio' | 'contanti' | 'altro'
export type TransactionType = 'entrata' | 'uscita'
export type PaymentMethod = 'conto' | 'carta'
export type Frequency = 'mensile' | 'settimanale' | 'annuale' | 'una_tantum' | 'personalizzata'
export type Theme = 'dark' | 'light' | 'system'

export interface Account {
  id: string
  nome: string
  tipo: AccountType
  saldo: number
  valuta: string
  icona: string
  colore: string
  // Open Banking link (optional): set when the account is imported from a bank.
  provider?: 'gocardless'
  externalAccountId?: string
  iban?: string
  bankConnectionId?: string
  lastSyncedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreditCard {
  id: string
  nome: string
  plafond: number
  saldoConsumato: number
  giornoChiusuraEstratto: number
  giornoAddebito: number
  contoCollegatoId?: string
  colore: string
  icona: string
  createdAt: Date
  updatedAt: Date
}

export type CategoryType = 'uscita' | 'entrata' | 'entrambi'

export interface Category {
  id: string
  nome: string
  icona: string
  colore: string
  tipo: CategoryType
  budgetMensile?: number
  createdAt: Date
  updatedAt: Date
}

export interface Transaction {
  id: string
  importo: number
  tipo: TransactionType
  categoriaId: string
  data: Date
  descrizione: string
  fonteId: string
  metodo: PaymentMethod
  ricorrente: boolean
  frequenza?: Frequency
  note?: string
  // Provider transaction id, used to de-duplicate imports from Open Banking.
  externalId?: string
  createdAt: Date
  updatedAt: Date
}

export interface Subscription {
  id: string
  nome: string
  importo: number
  frequenza: Frequency
  prossimoRinnovo: Date
  categoriaId: string
  fonteId: string
  attivo: boolean
  icona?: string
  note?: string
  createdAt: Date
  updatedAt: Date
}

export interface Installment {
  id: string
  descrizione: string
  importoTotale: number
  numeroRate: number
  rataMensile: number
  rateResidue: number
  dataInizio: Date
  giornoAddebito: number
  fonteId: string
  tassoInteresse?: number
  note?: string
  createdAt: Date
  updatedAt: Date
}

export interface Debt {
  id: string
  creditore: string
  importoTotale: number
  importoResiduo: number
  rataMensile?: number
  scadenza?: Date
  note?: string
  createdAt: Date
  updatedAt: Date
}

export interface Income {
  id: string
  nome: string
  importo: number
  frequenza: Frequency
  giornoAccredito?: number
  ricorrente: boolean
  note?: string
  createdAt: Date
  updatedAt: Date
}

export interface SavingsGoal {
  id: string
  nome: string
  importoTarget: number
  importoAttuale: number
  scadenza?: Date
  icona: string
  colore: string
  note?: string
  createdAt: Date
  updatedAt: Date
}

export interface Settings {
  id: string
  pinHash?: string
  pinSalt?: string
  pinIterations?: number
  lockTimeoutMinutes: number
  notificheAbilitate: boolean
  valuta: string
  tema: Theme
  mascotteName: string
  biometricEnabled: boolean
  // Cloud sync (per profile, per device)
  syncEnabled?: boolean
  syncPassphrase?: string
  createdAt: Date
  updatedAt: Date
}

// Bank connection (Open Banking via GoCardless). Stored locally, per device:
// the link itself doesn't sync, but the accounts/transactions it imports do.
export type BankConnectionStatus = 'pending' | 'linked' | 'error'

export interface BankConnection {
  id: string // = reference passed to the provider (uuid)
  provider: 'gocardless'
  requisitionId: string
  institutionId: string
  institutionName: string
  logo?: string
  status: BankConnectionStatus
  localAccountIds: string[]
  lastSyncAt?: Date
  error?: string
  createdAt: Date
  updatedAt: Date
}

// Tombstone: records a deletion so it can propagate during cloud sync.
export interface Tombstone {
  id: string // `${table}:${recordId}`
  table: string
  recordId: string
  deletedAt: number
}

// ── Derived / computed types ──────────────────────────────────────────────────

export interface MonthlyStats {
  entrate: number
  uscite: number
  risparmio: number
  tassoRisparmio: number
  flussoCassa: number
}

export interface UpcomingItem {
  id: string
  tipo: 'abbonamento' | 'rata' | 'debito' | 'entrata'
  nome: string
  importo: number
  data: Date
  fonteId?: string
}

export interface CategorySpend {
  categoriaId: string
  nome: string
  icona: string
  colore: string
  speso: number
  budget?: number
  percentuale: number
}

export interface InsightSuggestion {
  id: string
  tipo: 'risparmio' | 'avviso' | 'obiettivo' | 'celebrazione'
  titolo: string
  descrizione: string
  importo?: number
  icona: string
}

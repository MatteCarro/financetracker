import type {
  Account,
  CategorySpend,
  CreditCard,
  Debt,
  Income,
  Installment,
  InsightSuggestion,
  MonthlyStats,
  Subscription,
  Transaction,
  UpcomingItem,
  Category,
} from './types'
import { currentMonthRange, daysUntil } from './dates'
import { startOfMonth, endOfMonth, isBefore, isAfter } from 'date-fns'
import { v4 as uuid } from 'uuid'

export function totalBalance(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + a.saldo, 0)
}

export function cardAvailableCredit(card: CreditCard): number {
  return card.plafond - card.saldoConsumato
}

export function cardUsagePercent(card: CreditCard): number {
  if (card.plafond === 0) return 0
  return (card.saldoConsumato / card.plafond) * 100
}

export function monthlyStats(
  transactions: Transaction[],
  income: Income[],
  month = new Date()
): MonthlyStats {
  const start = startOfMonth(month)
  const end = endOfMonth(month)

  const monthTxs = transactions.filter(
    (t) => isAfter(t.data, start) && isBefore(t.data, end)
  )

  const uscite = monthTxs
    .filter((t) => t.tipo === 'uscita')
    .reduce((s, t) => s + t.importo, 0)

  const entrate = monthTxs
    .filter((t) => t.tipo === 'entrata')
    .reduce((s, t) => s + t.importo, 0)

  // Add recurring income expected this month
  const incomeRecurring = income
    .filter((i) => i.ricorrente && i.frequenza === 'mensile')
    .reduce((s, i) => s + i.importo, 0)

  const totalEntrate = entrate + incomeRecurring
  const risparmio = totalEntrate - uscite
  const tassoRisparmio = totalEntrate > 0 ? (risparmio / totalEntrate) * 100 : 0

  return {
    entrate: totalEntrate,
    uscite,
    risparmio,
    tassoRisparmio,
    flussoCassa: risparmio,
  }
}

export function monthlySubscriptionCost(subscriptions: Subscription[]): number {
  return subscriptions
    .filter((s) => s.attivo)
    .reduce((sum, s) => {
      if (s.frequenza === 'mensile') return sum + s.importo
      if (s.frequenza === 'annuale') return sum + s.importo / 12
      if (s.frequenza === 'settimanale') return sum + s.importo * 4.33
      return sum + s.importo
    }, 0)
}

export function monthlyInstallmentCost(installments: Installment[]): number {
  return installments
    .filter((i) => i.rateResidue > 0)
    .reduce((sum, i) => sum + i.rataMensile, 0)
}

export function monthlyDebtCost(debts: Debt[]): number {
  return debts
    .filter((d) => d.importoResiduo > 0)
    .reduce((sum, d) => sum + (d.rataMensile ?? 0), 0)
}

export function realAvailability(
  accounts: Account[],
  subscriptions: Subscription[],
  installments: Installment[],
  debts: Debt[]
): number {
  const balance = totalBalance(accounts)
  const subsCost = monthlySubscriptionCost(subscriptions)
  const instCost = monthlyInstallmentCost(installments)
  const debtCost = monthlyDebtCost(debts)
  return balance - subsCost - instCost - debtCost
}

export function categorySpend(
  transactions: Transaction[],
  categories: Category[],
  month = new Date()
): CategorySpend[] {
  const { start, end } = currentMonthRange()
  const monthTxs = transactions.filter(
    (t) =>
      t.tipo === 'uscita' &&
      isAfter(new Date(t.data), start) &&
      isBefore(new Date(t.data), end)
  )

  const totale = monthTxs.reduce((s, t) => s + t.importo, 0)

  const byCategory = new Map<string, number>()
  for (const tx of monthTxs) {
    byCategory.set(tx.categoriaId, (byCategory.get(tx.categoriaId) ?? 0) + tx.importo)
  }

  return Array.from(byCategory.entries())
    .map(([catId, speso]) => {
      const cat = categories.find((c) => c.id === catId)
      return {
        categoriaId: catId,
        nome: cat?.nome ?? 'Altro',
        icona: cat?.icona ?? '📌',
        colore: cat?.colore ?? '#64748b',
        speso,
        budget: cat?.budgetMensile,
        percentuale: totale > 0 ? (speso / totale) * 100 : 0,
      }
    })
    .sort((a, b) => b.speso - a.speso)

  void month // suppress unused warning — kept for future multi-month support
}

export function upcomingItems(
  subscriptions: Subscription[],
  installments: Installment[],
  debts: Debt[],
  income: Income[],
  withinDays = 30
): UpcomingItem[] {
  const items: UpcomingItem[] = []
  const now = new Date()
  const limit = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000)

  for (const sub of subscriptions) {
    if (!sub.attivo) continue
    const d = new Date(sub.prossimoRinnovo)
    if (d >= now && d <= limit) {
      items.push({ id: sub.id, tipo: 'abbonamento', nome: sub.nome, importo: sub.importo, data: d, fonteId: sub.fonteId })
    }
  }

  for (const inst of installments) {
    if (inst.rateResidue <= 0) continue
    items.push({ id: inst.id, tipo: 'rata', nome: inst.descrizione, importo: inst.rataMensile, data: new Date(), fonteId: inst.fonteId })
  }

  for (const debt of debts) {
    if (debt.importoResiduo <= 0 || !debt.scadenza) continue
    const d = new Date(debt.scadenza)
    if (d >= now && d <= limit) {
      items.push({ id: debt.id, tipo: 'debito', nome: debt.creditore, importo: debt.importoResiduo, data: d })
    }
  }

  for (const inc of income) {
    if (!inc.ricorrente || !inc.giornoAccredito) continue
    const d = new Date(now.getFullYear(), now.getMonth(), inc.giornoAccredito)
    if (d < now) d.setMonth(d.getMonth() + 1)
    if (d <= limit) {
      items.push({ id: inc.id, tipo: 'entrata', nome: inc.nome, importo: inc.importo, data: d })
    }
  }

  return items.sort((a, b) => a.data.getTime() - b.data.getTime())
}

export function generateInsights(
  transactions: Transaction[],
  categories: Category[],
  subscriptions: Subscription[],
  installments: Installment[],
  stats: MonthlyStats
): InsightSuggestion[] {
  const insights: InsightSuggestion[] = []
  const catSpend = categorySpend(transactions, categories)
  const subsCost = monthlySubscriptionCost(subscriptions)
  const instCost = monthlyInstallmentCost(installments)

  // Subscription weight
  if (subsCost > 0 && stats.entrate > 0) {
    const pct = (subsCost / stats.entrate) * 100
    if (pct > 10) {
      insights.push({
        id: uuid(),
        tipo: 'avviso',
        titolo: 'Abbonamenti pesanti',
        descrizione: `I tuoi abbonamenti costano €${subsCost.toFixed(2)}/mese (${pct.toFixed(0)}% delle entrate). Valuta quali usare davvero.`,
        importo: subsCost,
        icona: '📱',
      })
    }
  }

  // Over-budget categories
  for (const cat of catSpend) {
    if (cat.budget && cat.speso > cat.budget) {
      insights.push({
        id: uuid(),
        tipo: 'avviso',
        titolo: `Sforato budget "${cat.nome}"`,
        descrizione: `Hai speso €${cat.speso.toFixed(2)} su un budget di €${cat.budget.toFixed(2)} (+€${(cat.speso - cat.budget).toFixed(2)}).`,
        importo: cat.speso - cat.budget,
        icona: cat.icona,
      })
    }
  }

  // Good savings rate
  if (stats.tassoRisparmio >= 20) {
    insights.push({
      id: uuid(),
      tipo: 'celebrazione',
      titolo: 'Ottimo tasso di risparmio!',
      descrizione: `Stai risparmiando il ${stats.tassoRisparmio.toFixed(0)}% delle tue entrate. Continua così!`,
      icona: '🎉',
    })
  }

  // High installment burden
  if (instCost > 0 && stats.entrate > 0) {
    const pct = (instCost / stats.entrate) * 100
    if (pct > 30) {
      insights.push({
        id: uuid(),
        tipo: 'avviso',
        titolo: 'Rate elevate',
        descrizione: `Le rate mensili pesano ${pct.toFixed(0)}% delle entrate (€${instCost.toFixed(2)}). Considera di accelerare i rimborsi.`,
        importo: instCost,
        icona: '📋',
      })
    }
  }

  return insights
}

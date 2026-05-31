import { useState, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'

const AccountsPage = lazy(() => import('@/features/accounts/AccountsPage'))
const CategoriesPage = lazy(() => import('@/features/categories/CategoriesPage'))
const SubscriptionsPage = lazy(() => import('@/features/subscriptions/SubscriptionsPage'))
const InstallmentsPage = lazy(() => import('@/features/installments/InstallmentsPage'))
const DebtsPage = lazy(() => import('@/features/debts/DebtsPage'))
const IncomePage = lazy(() => import('@/features/income/IncomePage'))
const SavingsGoalsPage = lazy(() => import('@/features/goals/SavingsGoalsPage'))

type SubTab = 'conti' | 'categorie' | 'abbonamenti' | 'rate' | 'debiti' | 'entrate' | 'obiettivi'

const SUB_TABS: { id: SubTab; label: string; icon: string }[] = [
  { id: 'conti', label: 'Conti', icon: '🏦' },
  { id: 'categorie', label: 'Categorie', icon: '🏷️' },
  { id: 'abbonamenti', label: 'Abbonamenti', icon: '📱' },
  { id: 'rate', label: 'Rate', icon: '📋' },
  { id: 'debiti', label: 'Debiti', icon: '💸' },
  { id: 'entrate', label: 'Entrate', icon: '💰' },
  { id: 'obiettivi', label: 'Obiettivi', icon: '🎯' },
]

function TabFallback() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="w-6 h-6 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
    </div>
  )
}

export default function FinancePage() {
  const [sub, setSub] = useState<SubTab>('conti')

  return (
    <div className="flex flex-col">
      {/* Sub-tab pills — horizontal scroll */}
      <div className="sticky top-0 z-10 pt-4 pb-2 px-4" style={{ background: 'linear-gradient(to bottom, var(--color-surface-0) 70%, transparent)' }}>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
             style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {SUB_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${sub === t.id ? 'text-white shadow-lg' : 'glass glass-hover text-[var(--color-text-muted)]'}`}
              style={sub === t.id ? { backgroundColor: 'var(--color-primary)' } : {}}
            >
              <span className="text-base leading-none">{t.icon}</span>
              <span>{t.label}</span>
              {sub === t.id && (
                <motion.span
                  layoutId="sub-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ zIndex: -1 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-2 pb-4">
        <Suspense fallback={<TabFallback />}>
          {sub === 'conti' && <AccountsPage />}
          {sub === 'categorie' && <CategoriesPage />}
          {sub === 'abbonamenti' && <SubscriptionsPage />}
          {sub === 'rate' && <InstallmentsPage />}
          {sub === 'debiti' && <DebtsPage />}
          {sub === 'entrate' && <IncomePage />}
          {sub === 'obiettivi' && <SavingsGoalsPage />}
        </Suspense>
      </div>
    </div>
  )
}

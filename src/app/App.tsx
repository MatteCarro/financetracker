import { useEffect, useState, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import TabBar from '@/components/layout/TabBar'
import type { TabId } from './tabs'
import PinSetup from '@/features/settings/PinSetup'
import LockScreen from '@/features/settings/LockScreen'
import ProfileSelect from '@/features/profiles/ProfileSelect'

const DashboardPage = lazy(() => import('@/features/home/DashboardPage'))
const TransactionsPage = lazy(() => import('@/features/transactions/TransactionsPage'))
const FinancePage = lazy(() => import('@/features/finance/FinancePage'))
const InsightsPage = lazy(() => import('@/features/insights/InsightsPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
    </div>
  )
}

const PAGE_VARIANTS = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.22 } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.15 } },
}

export default function App() {
  const [tab, setTab] = useState<TabId>('home')
  const status = useAuthStore((s) => s.status)
  const activeProfileId = useAuthStore((s) => s.activeProfileId)
  const init = useAuthStore((s) => s.init)
  const checkTimeout = useAuthStore((s) => s.checkTimeout)

  useEffect(() => {
    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {})
    }
    init()
  }, [init])

  // Reset to Home tab whenever a different profile becomes active.
  useEffect(() => {
    setTab('home')
  }, [activeProfileId])

  // Lock timeout on visibility change
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') checkTimeout()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [checkTimeout])

  // Activity tracking
  useEffect(() => {
    const reset = () => useAuthStore.getState().resetActivity()
    const events = ['pointerdown', 'keydown', 'scroll']
    events.forEach((e) => document.addEventListener(e, reset, { passive: true }))
    return () => events.forEach((e) => document.removeEventListener(e, reset))
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-radial-primary">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    )
  }
  if (status === 'profile-select') return <ProfileSelect />
  if (status === 'setup') return <PinSetup />
  if (status === 'locked') return <LockScreen />

  return (
    <div key={activeProfileId} className="flex flex-col h-full bg-gradient-radial-primary">
      {/* Status bar spacer */}
      <div style={{ height: 'env(safe-area-inset-top)' }} />

      {/* Scrollable content area */}
      <main
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            variants={PAGE_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Suspense fallback={<PageFallback />}>
              {tab === 'home' && <DashboardPage />}
              {tab === 'transactions' && <TransactionsPage />}
              {tab === 'finance' && <FinancePage />}
              {tab === 'insights' && <InsightsPage />}
              {tab === 'settings' && <SettingsPage />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}

import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { db } from '@/db/schema'
import {
  totalBalance, monthlyStats, realAvailability,
  upcomingItems, categorySpend,
} from '@/lib/finance'
import { formatCurrency, formatPercent } from '@/lib/currency'
import { formatDateShort, daysUntil } from '@/lib/dates'
import { getMascotMood, getMascotMessage } from '@/features/mascot/mascotPersonality'
import { useSettingsStore } from '@/store/settingsStore'
import MascotSVG from '@/features/mascot/MascotSVG'
import Card from '@/components/ui/Card'
import ProgressBar from '@/components/ui/ProgressBar'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'

const STAGGER = { animate: { transition: { staggerChildren: 0.07 } } }
const FADE_UP = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export default function DashboardPage() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? []
  const cards = useLiveQuery(() => db.creditCards.toArray(), []) ?? []
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? []
  const subscriptions = useLiveQuery(() => db.subscriptions.toArray(), []) ?? []
  const installments = useLiveQuery(() => db.installments.toArray(), []) ?? []
  const debts = useLiveQuery(() => db.debts.toArray(), []) ?? []
  const income = useLiveQuery(() => db.income.toArray(), []) ?? []
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const settings = useSettingsStore((s) => s.settings)

  const balance = totalBalance(accounts)
  const stats = monthlyStats(transactions, income)
  const real = realAvailability(accounts, subscriptions, installments, debts)
  const upcoming = upcomingItems(subscriptions, installments, debts, income, 30)
  const catSpend = categorySpend(transactions, categories)

  const mood = getMascotMood(stats.tassoRisparmio, upcoming.filter((u) => daysUntil(u.data) <= 3).length)
  const message = getMascotMessage(mood)
  const mascotteName = settings?.mascotteName ?? 'Soldino'

  const pieData = catSpend.slice(0, 5).map((c) => ({ name: c.nome, value: c.speso, color: c.colore, icona: c.icona }))
  const totalSpent = catSpend.reduce((acc, c) => acc + c.speso, 0)

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* Mascot hero — big, cute & playful */}
      <motion.div
        variants={FADE_UP}
        initial="initial"
        animate="animate"
        className="relative flex flex-col items-center pt-2 pb-1"
      >
        {/* Soft glow behind mascot */}
        <div
          className="absolute top-0 w-56 h-56 rounded-full blur-3xl opacity-55"
          style={{
            background:
              mood === 'alert' || mood === 'worried'
                ? 'radial-gradient(circle, rgba(248,113,113,0.4), transparent 65%)'
                : 'radial-gradient(circle, rgba(124,108,240,0.35), rgba(52,211,153,0.15), transparent 65%)',
          }}
        />
        {/* Decorative sparkles */}
        <motion.span
          className="absolute text-lg"
          style={{ top: '10px', left: 'calc(50% - 90px)' }}
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.1, 0.8], rotate: [0, 15, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0 }}
        >✨</motion.span>
        <motion.span
          className="absolute text-sm"
          style={{ top: '30px', right: 'calc(50% - 85px)' }}
          animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.8 }}
        >💰</motion.span>
        <motion.span
          className="absolute text-xs"
          style={{ top: '5px', right: 'calc(50% - 60px)' }}
          animate={{ opacity: [0.5, 1, 0.5], y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
        >⭐</motion.span>

        <MascotSVG mood={mood} size={180} />

        {/* Speech bubble — overlapping below */}
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
          className="glass relative -mt-4 px-5 py-3 max-w-[19rem] text-center z-10"
          style={{ borderRadius: 20 }}
        >
          {/* Bubble tail */}
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-[var(--color-surface-1)]"
            style={{ borderLeft: '1px solid rgba(139,124,246,0.10)', borderTop: '1px solid rgba(139,124,246,0.10)' }}
          />
          <p className="text-xs font-bold text-[var(--color-primary)] mb-0.5 flex items-center justify-center gap-1">
            🐷 {mascotteName}
          </p>
          <p className="text-sm font-medium text-[var(--color-text-primary)] leading-snug">
            {message}
          </p>
        </motion.div>
      </motion.div>

      {/* Main balance */}
      <motion.div variants={FADE_UP} initial="initial" animate="animate">
        <Card glow className="!p-5 text-center">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Saldo totale</p>
          <motion.p
            className="text-4xl font-bold font-numeric"
            style={{ color: balance >= 0 ? 'var(--color-accent-light)' : 'var(--color-danger)' }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
          >
            {formatCurrency(balance)}
          </motion.p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {accounts.length} {accounts.length === 1 ? 'conto' : 'conti'}
            {cards.length > 0 && ` · ${cards.length} carte`}
          </p>
        </Card>
      </motion.div>

      {/* Stats row */}
      <motion.div variants={STAGGER} initial="initial" animate="animate" className="grid grid-cols-2 gap-3">
        {[
          { label: 'Disponibilità reale', value: real, isAmount: true, color: real >= 0 ? '#10b981' : '#ef4444' },
          { label: 'Tasso di risparmio', value: stats.tassoRisparmio, isAmount: false, color: stats.tassoRisparmio >= 20 ? '#10b981' : stats.tassoRisparmio >= 0 ? '#f59e0b' : '#ef4444' },
          { label: 'Entrate mese', value: stats.entrate, isAmount: true, color: '#10b981' },
          { label: 'Uscite mese', value: stats.uscite, isAmount: true, color: '#ef4444' },
        ].map((item) => (
          <motion.div key={item.label} variants={FADE_UP}>
            <Card subtle className="!p-3">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">{item.label}</p>
              <p className="text-lg font-bold font-numeric" style={{ color: item.color }}>
                {item.isAmount ? formatCurrency(item.value) : formatPercent(item.value)}
              </p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Cash flow indicator */}
      {(stats.entrate > 0 || stats.uscite > 0) && (
        <motion.div variants={FADE_UP} initial="initial" animate="animate">
          <Card className="!p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[var(--color-text-secondary)]">Flusso di cassa</p>
              <p className={`text-sm font-bold font-numeric ${stats.flussoCassa >= 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]'}`}>
                {stats.flussoCassa >= 0 ? '+' : ''}{formatCurrency(stats.flussoCassa)}
              </p>
            </div>
            <ProgressBar
              value={stats.entrate}
              max={Math.max(stats.entrate, stats.uscite) * 1.2}
              color="#10b981"
              height={8}
            />
            <ProgressBar
              value={stats.uscite}
              max={Math.max(stats.entrate, stats.uscite) * 1.2}
              color="#ef4444"
              height={8}
              className="mt-1"
            />
            <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#10b981] inline-block" />
                Entrate {formatCurrency(stats.entrate)}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#ef4444] inline-block" />
                Uscite {formatCurrency(stats.uscite)}
              </span>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Category breakdown — cute cards */}
      {catSpend.length > 0 && (
        <motion.div variants={FADE_UP} initial="initial" animate="animate">
          <Card className="!p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5">
                🏷️ Spese per categoria
              </p>
              <span className="text-xs text-[var(--color-text-muted)] font-numeric">
                Totale: {formatCurrency(totalSpent)}
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {catSpend.slice(0, 6).map((c, i) => (
                <motion.div
                  key={c.categoriaId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: c.colore + '25' }}
                    >
                      {c.icona}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{c.nome}</span>
                        <span className="text-sm font-bold font-numeric text-[var(--color-text-primary)] flex-shrink-0 ml-2">
                          {formatCurrency(c.speso)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={c.speso}
                          max={c.budget ?? catSpend[0].speso * 1.2}
                          color={c.colore}
                          height={5}
                        />
                        {c.budget && (
                          <span className="text-[10px] text-[var(--color-text-muted)] font-numeric flex-shrink-0">
                            / {formatCurrency(c.budget)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Category pie chart */}
      {pieData.length > 0 && (
        <motion.div variants={FADE_UP} initial="initial" animate="animate">
          <Card className="!p-4">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3 flex items-center gap-1.5">
              📊 Distribuzione spese
            </p>
            <div className="flex gap-4 items-center">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#ffffff', border: '1px solid rgba(139,124,246,0.15)', borderRadius: 16, boxShadow: '0 4px 16px rgba(139,124,246,0.12)' }}
                    labelStyle={{ color: '#8b84a3' }}
                    itemStyle={{ color: '#3b3354' }}
                    formatter={(v) => formatCurrency(v as number)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 flex flex-col gap-1.5">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-[var(--color-text-secondary)]">{d.icona} {d.name}</span>
                    </div>
                    <span className="text-xs font-numeric font-medium text-[var(--color-text-primary)]">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <motion.div variants={FADE_UP} initial="initial" animate="animate">
          <Card className="!p-4">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Prossime scadenze</p>
            <div className="flex flex-col gap-2">
              {upcoming.slice(0, 5).map((item) => {
                const days = daysUntil(item.data)
                const isUrgent = days <= 3
                const tipoIcons: Record<string, string> = { abbonamento: '📱', rata: '📋', debito: '💸', entrata: '💰' }
                return (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{tipoIcons[item.tipo]}</span>
                      <div>
                        <p className="text-sm text-[var(--color-text-primary)]">{item.nome}</p>
                        <p className={`text-xs ${isUrgent ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}>
                          {days <= 0 ? 'Oggi' : days === 1 ? 'Domani' : `tra ${days} giorni`} · {formatDateShort(item.data)}
                        </p>
                      </div>
                    </div>
                    <p className={`text-sm font-bold font-numeric ${item.tipo === 'entrata' ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]'}`}>
                      {item.tipo === 'entrata' ? '+' : '-'}{formatCurrency(item.importo)}
                    </p>
                  </div>
                )
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Empty state */}
      {accounts.length === 0 && transactions.length === 0 && (
        <motion.div variants={FADE_UP} initial="initial" animate="animate">
          <Card className="!p-6 text-center">
            <p className="text-4xl mb-3">✨</p>
            <p className="font-semibold text-[var(--color-text-primary)]">Benvenuto in FinanceTracker!</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Vai su <strong>Conti</strong> per aggiungere il tuo primo conto e inizia a tracciare le spese.
            </p>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

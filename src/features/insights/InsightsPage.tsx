import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import Card from '@/components/ui/Card'
import { formatCurrency, formatPercent } from '@/lib/currency'
import { generateInsights, categorySpend, monthlyStats } from '@/lib/finance'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { startOfMonth, subMonths } from 'date-fns'
import { formatMonthYear } from '@/lib/dates'
import ProgressBar from '@/components/ui/ProgressBar'

export default function InsightsPage() {
  const transactions = useLiveQuery(() => db.transactions.toArray(), []) ?? []
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const subscriptions = useLiveQuery(() => db.subscriptions.toArray(), []) ?? []
  const installments = useLiveQuery(() => db.installments.toArray(), []) ?? []
  const income = useLiveQuery(() => db.income.toArray(), []) ?? []

  const stats = monthlyStats(transactions, income)
  const catSpend = categorySpend(transactions, categories)
  const insights = generateInsights(transactions, categories, subscriptions, installments, stats)

  // Last 6 months trend
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i)
    const s = monthlyStats(transactions, income, month)
    return {
      name: formatMonthYear(month).slice(0, 3),
      entrate: s.entrate,
      uscite: s.uscite,
      risparmio: s.risparmio,
    }
  })

  const moodColor: Record<string, string> = {
    risparmio: '#10b981',
    avviso: '#f59e0b',
    obiettivo: '#6366f1',
    celebrazione: '#ec4899',
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Come risparmiare</h1>

      {/* Insights / suggestions */}
      {insights.length > 0 && (
        <div className="flex flex-col gap-3">
          {insights.map((ins) => (
            <Card key={ins.id} className="!p-4">
              <div className="flex gap-3 items-start">
                <span className="text-2xl">{ins.icona}</span>
                <div>
                  <p className="font-semibold text-[var(--color-text-primary)] text-sm"
                     style={{ color: moodColor[ins.tipo] }}>
                    {ins.titolo}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{ins.descrizione}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 6-month trend */}
      <Card className="!p-4">
        <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Ultimi 6 mesi</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} width={45} tickFormatter={(v) => `€${v}`} />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(v: number) => formatCurrency(v)}
            />
            <Line type="monotone" dataKey="entrate" stroke="#10b981" strokeWidth={2} dot={false} name="Entrate" />
            <Line type="monotone" dataKey="uscite" stroke="#ef4444" strokeWidth={2} dot={false} name="Uscite" />
            <Line type="monotone" dataKey="risparmio" stroke="#6366f1" strokeWidth={2} dot={false} name="Risparmio" />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-center">
          {[['Entrate', '#10b981'], ['Uscite', '#ef4444'], ['Risparmio', '#6366f1']].map(([label, color]) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-3 h-0.5 rounded" style={{ backgroundColor: color }} />
              <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Category breakdown */}
      <Card className="!p-4">
        <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Spese per categoria</p>
        {catSpend.length === 0 ? (
          <p className="text-[var(--color-text-muted)] text-sm text-center py-4">Nessuna spesa questo mese</p>
        ) : (
          <div className="flex flex-col gap-3">
            {catSpend.slice(0, 8).map((c) => (
              <div key={c.categoriaId}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{c.icona}</span>
                    <span className="text-sm text-[var(--color-text-primary)]">{c.nome}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold font-numeric text-[var(--color-text-primary)]">
                      {formatCurrency(c.speso)}
                    </span>
                    {c.budget && (
                      <span className="text-xs text-[var(--color-text-muted)] ml-1">
                        / {formatCurrency(c.budget)}
                      </span>
                    )}
                  </div>
                </div>
                <ProgressBar
                  value={c.speso}
                  max={c.budget ?? catSpend[0].speso}
                  color={c.colore}
                  height={4}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Monthly comparison */}
      <Card className="!p-4">
        <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Questo mese</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Entrate', value: stats.entrate, color: '#10b981' },
            { label: 'Uscite', value: stats.uscite, color: '#ef4444' },
            { label: 'Risparmio', value: stats.risparmio, color: '#6366f1' },
            { label: 'Tasso risparmio', value: null, pct: stats.tassoRisparmio, color: '#6366f1' },
          ].map((item) => (
            <div key={item.label} className="glass-subtle rounded-xl p-3">
              <p className="text-xs text-[var(--color-text-muted)]">{item.label}</p>
              <p className="text-lg font-bold font-numeric mt-1" style={{ color: item.color }}>
                {item.value !== null
                  ? formatCurrency(item.value ?? 0)
                  : formatPercent(item.pct ?? 0)}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

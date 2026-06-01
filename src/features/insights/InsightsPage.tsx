import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import Card from '@/components/ui/Card'
import { formatCurrency, formatPercent } from '@/lib/currency'
import { generateInsights, categorySpend, monthlyStats } from '@/lib/finance'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, Legend,
} from 'recharts'
import { subMonths, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns'
import { formatMonthYear } from '@/lib/dates'
import ProgressBar from '@/components/ui/ProgressBar'
import type { Transaction } from '@/lib/types'

// ── Palette ──
const C = {
  entrate: '#34d399',
  uscite: '#fb7185',
  risparmio: '#8b7cf6',
  grid: 'rgba(139,124,246,0.12)',
  axis: '#8b84a3',
}
const PIE_COLORS = ['#8b7cf6', '#34d399', '#fbbf24', '#fb7185', '#7dd3fc', '#f0b68a', '#a78bfa', '#6ee7b7']

const tooltipStyle = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid rgba(139,124,246,0.2)',
    borderRadius: 12,
    boxShadow: '0 4px 16px rgba(139,124,246,0.15)',
  },
  labelStyle: { color: '#8b84a3' },
  itemStyle: { color: '#3b3354' },
}

function SectionTitle({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="mb-3">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{children}</p>
      {hint && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{hint}</p>}
    </div>
  )
}

export default function InsightsPage() {
  const transactions = (useLiveQuery(() => db.transactions.toArray(), []) ?? []) as Transaction[]
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const subscriptions = useLiveQuery(() => db.subscriptions.toArray(), []) ?? []
  const installments = useLiveQuery(() => db.installments.toArray(), []) ?? []
  const income = useLiveQuery(() => db.income.toArray(), []) ?? []

  const now = new Date()
  const stats = monthlyStats(transactions, income)
  const catSpend = categorySpend(transactions, categories)
  const insights = generateInsights(transactions, categories, subscriptions, installments, stats)

  // ── Helpers ──
  const catMap = new Map(categories.map((c) => [c.id, c]))

  function uscitePerCategoria(month: Date): Map<string, number> {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const m = new Map<string, number>()
    for (const t of transactions) {
      if (t.tipo !== 'uscita') continue
      const d = new Date(t.data)
      if (d >= start && d <= end) m.set(t.categoriaId, (m.get(t.categoriaId) ?? 0) + t.importo)
    }
    return m
  }

  // 6-month trend (entrate / uscite / risparmio)
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(now, 5 - i)
    const s = monthlyStats(transactions, income, month)
    return {
      name: formatMonthYear(month).slice(0, 3),
      entrate: Math.round(s.entrate),
      uscite: Math.round(s.uscite),
      risparmio: Math.round(s.risparmio),
      tasso: Math.round(s.tassoRisparmio),
    }
  })

  // Donut: spese per categoria (mese corrente), top 7 + "Altro"
  const pieData = (() => {
    const top = catSpend.slice(0, 7).map((c) => ({ name: c.nome, value: Math.round(c.speso), icona: c.icona }))
    const restTot = catSpend.slice(7).reduce((s, c) => s + c.speso, 0)
    if (restTot > 0) top.push({ name: 'Altro', value: Math.round(restTot), icona: '•' })
    return top
  })()
  const totaleUscite = catSpend.reduce((s, c) => s + c.speso, 0)

  // Spesa giornaliera del mese corrente
  const daysInMonth = getDaysInMonth(now)
  const dailySpend = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, speso: 0 }))
  for (const t of transactions) {
    if (t.tipo !== 'uscita') continue
    const d = new Date(t.data)
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      dailySpend[d.getDate() - 1].speso += t.importo
    }
  }
  const giornoCorrente = now.getDate()
  const speseMese = dailySpend.reduce((s, d) => s + d.speso, 0)
  const mediaGiornaliera = giornoCorrente > 0 ? speseMese / giornoCorrente : 0
  const giornoPiuCostoso = dailySpend.reduce((max, d) => (d.speso > max.speso ? d : max), { day: 0, speso: 0 })

  // Confronto categorie: mese corrente vs precedente
  const curMap = uscitePerCategoria(now)
  const prevMap = uscitePerCategoria(subMonths(now, 1))
  const compareIds = new Set<string>([...curMap.keys(), ...prevMap.keys()])
  const compareData = Array.from(compareIds)
    .map((id) => ({
      nome: catMap.get(id)?.nome ?? 'Altro',
      icona: catMap.get(id)?.icona ?? '•',
      corrente: Math.round(curMap.get(id) ?? 0),
      precedente: Math.round(prevMap.get(id) ?? 0),
    }))
    .sort((a, b) => b.corrente + b.precedente - (a.corrente + a.precedente))
    .slice(0, 6)

  const moodColor: Record<string, string> = {
    risparmio: C.entrate,
    avviso: '#fbbf24',
    obiettivo: C.risparmio,
    celebrazione: '#fbbf24',
  }

  const hasData = transactions.length > 0

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Insights</h1>

      {!hasData && (
        <Card className="!p-6 text-center">
          <p className="text-3xl mb-2">📊</p>
          <p className="font-semibold text-[var(--color-text-primary)]">Ancora nessun dato</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Registra qualche movimento e qui vedrai grafici e analisi dettagliate.
          </p>
        </Card>
      )}

      {/* ── Suggerimenti ── */}
      {insights.length > 0 && (
        <div className="flex flex-col gap-3">
          {insights.map((ins) => (
            <Card key={ins.id} className="!p-4">
              <div className="flex gap-3 items-start">
                <span className="text-2xl">{ins.icona}</span>
                <div>
                  <p className="font-semibold text-sm" style={{ color: moodColor[ins.tipo] }}>
                    {ins.titolo}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{ins.descrizione}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── KPI mese corrente ── */}
      <Card className="!p-4">
        <SectionTitle hint={formatMonthYear(now)}>Questo mese</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Entrate', value: formatCurrency(stats.entrate), color: C.entrate },
            { label: 'Uscite', value: formatCurrency(stats.uscite), color: C.uscite },
            { label: 'Risparmio', value: formatCurrency(stats.risparmio), color: C.risparmio },
            { label: 'Tasso di risparmio', value: formatPercent(stats.tassoRisparmio), color: C.risparmio },
            { label: 'Spesa media/giorno', value: formatCurrency(mediaGiornaliera), color: C.uscite },
            {
              label: 'Giorno più costoso',
              value: giornoPiuCostoso.speso > 0 ? `${giornoPiuCostoso.day} (${formatCurrency(giornoPiuCostoso.speso)})` : '—',
              color: '#fbbf24',
            },
          ].map((item) => (
            <div key={item.label} className="glass-subtle rounded-xl p-3">
              <p className="text-xs text-[var(--color-text-muted)]">{item.label}</p>
              <p className="text-base font-bold font-numeric mt-1" style={{ color: item.color }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Donut spese per categoria ── */}
      {pieData.length > 0 && (
        <Card className="!p-4">
          <SectionTitle hint="Mese corrente">Ripartizione delle spese</SectionTitle>
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="none"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v) => formatCurrency(v as number)} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center total */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-[var(--color-text-muted)]">Totale</span>
              <span className="text-lg font-bold font-numeric text-[var(--color-text-primary)]">
                {formatCurrency(totaleUscite)}
              </span>
            </div>
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-[var(--color-text-secondary)] truncate">{d.icona} {d.name}</span>
                </div>
                <span className="text-xs font-numeric text-[var(--color-text-muted)]">
                  {totaleUscite > 0 ? `${Math.round((d.value / totaleUscite) * 100)}%` : '0%'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Entrate vs Uscite (barre) ── */}
      <Card className="!p-4">
        <SectionTitle hint="Ultimi 6 mesi">Entrate vs Uscite</SectionTitle>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={trendData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.axis, fontSize: 10 }} width={42} tickFormatter={(v) => `€${v}`} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(139,124,246,0.06)' }} formatter={(v) => formatCurrency(v as number)} />
            <Bar dataKey="entrate" name="Entrate" fill={C.entrate} radius={[6, 6, 0, 0]} />
            <Bar dataKey="uscite" name="Uscite" fill={C.uscite} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Andamento risparmio (area) ── */}
      <Card className="!p-4">
        <SectionTitle hint="Ultimi 6 mesi">Andamento del risparmio</SectionTitle>
        <ResponsiveContainer width="100%" height={170}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="risparmioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.risparmio} stopOpacity={0.35} />
                <stop offset="100%" stopColor={C.risparmio} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.axis, fontSize: 10 }} width={42} tickFormatter={(v) => `€${v}`} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} formatter={(v) => formatCurrency(v as number)} />
            <Area type="monotone" dataKey="risparmio" name="Risparmio" stroke={C.risparmio} strokeWidth={3} fill="url(#risparmioGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Tasso di risparmio (linea %) ── */}
      <Card className="!p-4">
        <SectionTitle hint="Ultimi 6 mesi">Tasso di risparmio</SectionTitle>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.axis, fontSize: 10 }} width={36} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} />
            <Line type="monotone" dataKey="tasso" name="Tasso" stroke={C.entrate} strokeWidth={3} dot={{ r: 3, fill: C.entrate }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Spesa giornaliera ── */}
      {speseMese > 0 && (
        <Card className="!p-4">
          <SectionTitle hint={`Media ${formatCurrency(mediaGiornaliera)}/giorno`}>Spesa giornaliera</SectionTitle>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={dailySpend}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: C.axis, fontSize: 9 }} interval={4} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.axis, fontSize: 10 }} width={42} tickFormatter={(v) => `€${v}`} axisLine={false} tickLine={false} />
              <Tooltip
                {...tooltipStyle}
                cursor={{ fill: 'rgba(139,124,246,0.06)' }}
                formatter={(v) => formatCurrency(v as number)}
                labelFormatter={(l) => `Giorno ${l}`}
              />
              <Bar dataKey="speso" name="Speso" fill={C.uscite} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── Confronto categorie: mese corrente vs precedente ── */}
      {compareData.length > 0 && (
        <Card className="!p-4">
          <SectionTitle hint="Mese corrente vs precedente">Confronto per categoria</SectionTitle>
          <ResponsiveContainer width="100%" height={Math.max(160, compareData.length * 44)}>
            <BarChart data={compareData} layout="vertical" barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
              <XAxis type="number" tick={{ fill: C.axis, fontSize: 10 }} tickFormatter={(v) => `€${v}`} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" tick={{ fill: C.axis, fontSize: 11 }} width={90} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(139,124,246,0.06)' }} formatter={(v) => formatCurrency(v as number)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="precedente" name="Mese scorso" fill="#cbb8f0" radius={[0, 4, 4, 0]} />
              <Bar dataKey="corrente" name="Questo mese" fill={C.risparmio} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── Spese per categoria vs budget ── */}
      {catSpend.length > 0 && (
        <Card className="!p-4">
          <SectionTitle hint="Speso e budget mensile">Categorie e budget</SectionTitle>
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
                      <span className="text-xs text-[var(--color-text-muted)] ml-1">/ {formatCurrency(c.budget)}</span>
                    )}
                  </div>
                </div>
                <ProgressBar value={c.speso} max={c.budget ?? catSpend[0].speso} color={c.colore} height={5} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

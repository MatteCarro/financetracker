import { motion } from 'framer-motion'

interface Props {
  value: number
  max?: number
  color?: string
  height?: number
  showLabel?: boolean
  className?: string
}

function getColor(pct: number, customColor?: string): string {
  if (customColor) return customColor
  if (pct >= 90) return '#ef4444'
  if (pct >= 70) return '#f59e0b'
  return '#10b981'
}

export default function ProgressBar({ value, max = 100, color, height = 6, showLabel, className = '' }: Props) {
  const pct = Math.min((value / max) * 100, 100)
  const barColor = getColor(pct, color)

  return (
    <div className={`w-full ${className}`}>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height, backgroundColor: 'rgba(139, 124, 246, 0.10)' }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-[var(--color-text-muted)] mt-1 text-right font-numeric">
          {pct.toFixed(0)}%
        </p>
      )}
    </div>
  )
}

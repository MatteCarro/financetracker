import { useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  currency?: string
}

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', '⌫']

export default function AmountInput({ value, onChange, placeholder = '0,00', currency = '€' }: Props) {
  const [focused, setFocused] = useState(false)

  const handleKey = (k: string) => {
    if (k === '⌫') { onChange(value.slice(0, -1)); return }
    if (k === ',' && value.includes(',')) return
    if (value === '0' && k !== ',') { onChange(k); return }
    // Max 2 decimal places
    const parts = (value + k).split(',')
    if (parts[1] && parts[1].length > 2) return
    onChange(value + k)
  }

  return (
    <div>
      {/* Display */}
      <motion.div
        animate={{ borderColor: focused ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)' }}
        className="glass flex items-center px-4 py-4 mb-4 rounded-2xl cursor-pointer"
        onClick={() => setFocused(true)}
      >
        <span className="text-[var(--color-text-secondary)] text-2xl mr-2">{currency}</span>
        <span className={`text-3xl font-bold font-numeric flex-1 ${value ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>
          {value || placeholder}
        </span>
      </motion.div>

      {/* Custom numeric keypad */}
      {focused && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-2"
        >
          {KEYS.map((k) => (
            <motion.button
              key={k}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleKey(k)}
              className={`
                h-14 rounded-xl text-xl font-semibold glass glass-hover
                text-[var(--color-text-primary)]
                ${k === '⌫' ? 'text-[var(--color-text-secondary)]' : ''}
              `}
            >
              {k}
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  )
}

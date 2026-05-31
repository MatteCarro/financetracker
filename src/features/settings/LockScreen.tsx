import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import MascotSVG from '@/features/mascot/MascotSVG'

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']

export default function LockScreen() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const unlock = useAuthStore((s) => s.unlock)

  const handleDigit = (d: string) => {
    if (d === '⌫') { setPin((p) => p.slice(0, -1)); setError(''); return }
    if (d === '✓') { handleUnlock(); return }
    if (pin.length >= 6) return
    const next = pin + d
    setPin(next)
    setError('')
    // Auto-submit at 4-6 digits if user doesn't press ✓
    if (next.length === 6) setTimeout(() => handleUnlockWith(next), 100)
  }

  const handleUnlock = () => handleUnlockWith(pin)

  const handleUnlockWith = async (p: string) => {
    if (p.length < 4) { setError('PIN troppo corto'); return }
    setLoading(true)
    const ok = await unlock(p)
    setLoading(false)
    if (!ok) {
      setError('PIN errato. Riprova.')
      setShake(true)
      setPin('')
      setTimeout(() => setShake(false), 600)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen pt-safe pb-safe px-6 bg-gradient-radial-primary">
      <motion.div
        animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-6 w-full max-w-sm"
      >
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <MascotSVG mood={error ? 'worried' : 'neutral'} size={90} />
        </motion.div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Inserisci il PIN</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            I tuoi dati sono al sicuro
          </p>
        </div>

        {/* PIN dots */}
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{ scale: pin.length > i ? 1.2 : 1 }}
              className={`w-3 h-3 rounded-full transition-all ${
                pin.length > i ? 'bg-[var(--color-primary)]' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[var(--color-danger)] text-sm"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {DIGITS.map((d) => (
            <motion.button
              key={d}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleDigit(d)}
              disabled={loading}
              className={`
                h-16 rounded-2xl text-xl font-semibold glass glass-hover
                text-[var(--color-text-primary)] transition-all
                ${d === '✓' ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary-light)]' : ''}
                ${d === '⌫' ? 'text-[var(--color-text-secondary)]' : ''}
                disabled:opacity-50
              `}
            >
              {loading && d === '✓' ? '⏳' : d}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

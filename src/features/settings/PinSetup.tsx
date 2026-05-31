import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import MascotSVG from '@/features/mascot/MascotSVG'

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']

export default function PinSetup() {
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setupPin = useAuthStore((s) => s.setupPin)

  const current = step === 'enter' ? pin : confirmPin
  const setter = step === 'enter' ? setPin : setConfirmPin

  const handleDigit = (d: string) => {
    if (d === '⌫') {
      setter((p) => p.slice(0, -1))
      setError('')
      return
    }
    if (d === '✓') {
      handleConfirm()
      return
    }
    if (current.length >= 6) return
    setter((p) => p + d)
    setError('')
  }

  const handleConfirm = async () => {
    if (step === 'enter') {
      if (current.length < 4) { setError('Il PIN deve avere almeno 4 cifre'); return }
      setStep('confirm')
      return
    }
    // Confirm step
    if (current.length < 4) { setError('Inserisci il PIN di conferma'); return }
    if (pin !== confirmPin) {
      setError('I PIN non corrispondono. Riprova.')
      setConfirmPin('')
      setStep('enter')
      setPin('')
      return
    }
    setLoading(true)
    try {
      await setupPin(pin)
    } catch {
      setError('Errore durante la configurazione. Riprova.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen pt-safe pb-safe px-6 bg-gradient-radial-primary">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 w-full max-w-sm"
      >
        <MascotSVG mood="happy" size={100} />

        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {step === 'enter' ? 'Crea il tuo PIN' : 'Conferma il PIN'}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            {step === 'enter'
              ? 'Scegli un PIN sicuro da 4–6 cifre per proteggere i tuoi dati.'
              : 'Reinserisci il PIN per confermare.'}
          </p>
        </div>

        {/* PIN dots */}
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{ scale: current.length > i ? 1.15 : 1 }}
              className={`w-3 h-3 rounded-full transition-colors ${
                current.length > i
                  ? 'bg-[var(--color-primary)]'
                  : 'bg-[var(--color-primary)]/15'
              }`}
            />
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[var(--color-danger)] text-sm text-center"
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
              whileTap={{ scale: 0.92 }}
              onClick={() => handleDigit(d)}
              disabled={loading}
              className={`
                h-16 rounded-2xl text-xl font-semibold glass glass-hover
                text-[var(--color-text-primary)]
                ${d === '✓' ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary-light)]' : ''}
                ${d === '⌫' ? 'text-[var(--color-text-secondary)]' : ''}
                disabled:opacity-50
              `}
            >
              {loading && d === '✓' ? '...' : d}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

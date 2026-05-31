import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { listProfiles, type Profile } from '@/db/profiles'
import MascotSVG from '@/features/mascot/MascotSVG'

export default function ProfileSelect() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const selectProfile = useAuthStore((s) => s.selectProfile)

  useEffect(() => {
    listProfiles().then(setProfiles)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen pt-safe pb-safe px-6 bg-gradient-radial-primary">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-7 w-full max-w-sm"
      >
        <MascotSVG mood="happy" size={120} />

        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Chi sei?</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1.5">
            Scegli il tuo profilo per accedere al conto
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          {profiles.map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => selectProfile(p.id)}
              className="glass glass-hover w-full p-4 flex items-center gap-4"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                style={{ backgroundColor: p.colore + '2e' }}
              >
                {p.avatar}
              </div>
              <div className="flex-1 text-left">
                <p className="text-lg font-bold text-[var(--color-text-primary)]">{p.nome}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {p.pinHash ? '🔒 Inserisci il PIN' : '✨ Crea il tuo PIN'}
                </p>
              </div>
              <span className="text-[var(--color-text-muted)] text-xl">›</span>
            </motion.button>
          ))}
        </div>

        <p className="text-xs text-[var(--color-text-muted)] text-center mt-2">
          Ogni profilo ha i propri dati e il proprio PIN.
        </p>
      </motion.div>
    </div>
  )
}

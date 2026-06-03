import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { listInstitutions, startLink, type Institution } from '@/lib/bankSync'

export default function LinkAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError('')
    setQuery('')
    setLoading(true)
    listInstitutions('IT')
      .then((list) => setInstitutions(list))
      .catch((e) => setError(e instanceof Error ? e.message : 'Errore nel caricamento delle banche'))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return institutions
    return institutions.filter((i) => i.name.toLowerCase().includes(q))
  }, [institutions, query])

  const handlePick = async (inst: Institution) => {
    setConnecting(inst.id)
    setError('')
    try {
      await startLink(inst) // redirects away on success
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nel collegamento')
      setConnecting(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Collega un conto bancario">
      <div className="flex flex-col gap-3 pb-4">
        <p className="text-xs text-[var(--color-text-muted)]">
          Scegli la tua banca. Verrai reindirizzato alla pagina ufficiale della banca per
          autorizzare l'accesso in <strong>sola lettura</strong>. Al ritorno, conti e movimenti
          verranno importati automaticamente.
        </p>

        <Input
          label="Cerca la tua banca"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="es. Intesa, Unicredit, Revolut…"
          icon="🔍"
        />

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
            {filtered.length === 0 && !error && (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
                Nessuna banca trovata.
              </p>
            )}
            {filtered.map((inst) => (
              <button
                key={inst.id}
                onClick={() => handlePick(inst)}
                disabled={connecting !== null}
                className="glass glass-hover rounded-xl p-3 flex items-center gap-3 text-left transition-all disabled:opacity-50"
              >
                {inst.logo ? (
                  <img src={inst.logo} alt="" className="w-9 h-9 rounded-lg object-contain bg-white/80 p-1" />
                ) : (
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg bg-[var(--color-primary)]/15">
                    🏦
                  </div>
                )}
                <span className="flex-1 text-sm font-medium text-[var(--color-text-primary)]">
                  {inst.name}
                </span>
                {connecting === inst.id && (
                  <div className="w-4 h-4 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

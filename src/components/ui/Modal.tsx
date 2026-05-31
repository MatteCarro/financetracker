import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export default function Modal({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Render through a portal on <body> so the sheet escapes any page-level
  // stacking context (Framer Motion page transitions apply transforms, which
  // would otherwise trap our fixed positioning below the tab bar).
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          />
          {/* Sheet — flex column: header fixed, body scrolls, never hidden by tab bar */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-[110] glass rounded-t-3xl flex flex-col max-h-[90vh]"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-[var(--color-text-muted)]/40" />
            </div>
            {title && (
              <div className="flex items-center justify-between px-5 pb-3 shrink-0">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full glass-subtle flex items-center justify-center text-[var(--color-text-muted)] text-xl leading-none"
                  aria-label="Chiudi"
                >
                  ×
                </button>
              </div>
            )}
            {/* Scrollable body — flex-1 + min-h-0 so it bounds to the sheet and scrolls internally */}
            <div
              className="px-5 overflow-y-auto flex-1 min-h-0"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 28px)' }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

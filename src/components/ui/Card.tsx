import { type ReactNode } from 'react'
import { motion } from 'framer-motion'

interface Props {
  children: ReactNode
  className?: string
  onClick?: () => void
  glow?: boolean
  subtle?: boolean
}

export default function Card({ children, className = '', onClick, glow, subtle }: Props) {
  const base = subtle ? 'glass-subtle' : 'glass'
  const glowStyle = glow ? { boxShadow: '0 0 40px rgba(99 102 241 / 0.2)' } : {}

  if (onClick) {
    return (
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        style={glowStyle}
        className={`${base} glass-hover w-full text-left p-4 ${className}`}
      >
        {children}
      </motion.button>
    )
  }

  return (
    <div className={`${base} p-4 ${className}`} style={glowStyle}>
      {children}
    </div>
  )
}

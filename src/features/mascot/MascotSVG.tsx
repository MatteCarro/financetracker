import { motion, type Variants } from 'framer-motion'
import type { MascotMood } from './mascotPersonality'

interface Props {
  mood: MascotMood
  size?: number
  animate?: boolean
}

// Cute pastel pig palette — warm & neutral
const moodColors: Record<MascotMood, { body: string; belly: string; cheek: string }> = {
  excited: { body: '#f0c6a8', belly: '#faeadc', cheek: '#e8a87c' },
  happy: { body: '#dcc8f5', belly: '#eee5fb', cheek: '#b99ee8' },
  neutral: { body: '#c4b5fd', belly: '#ede9fe', cheek: '#a78bfa' },
  worried: { body: '#a5b4fc', belly: '#e0e7ff', cheek: '#818cf8' },
  alert: { body: '#f5b0a1', belly: '#fde4de', cheek: '#e8806e' },
}

// Eye/mouth expressions
const expressions: Record<MascotMood, { leftEye: string; rightEye: string; mouth: string }> = {
  excited: {
    leftEye: 'M 30 44 Q 34 37 38 44',
    rightEye: 'M 52 44 Q 56 37 60 44',
    mouth: 'M 35 57 Q 45 69 55 57',
  },
  happy: {
    leftEye: 'M 30 44 Q 34 39 38 44',
    rightEye: 'M 52 44 Q 56 39 60 44',
    mouth: 'M 37 57 Q 45 65 53 57',
  },
  neutral: {
    leftEye: 'M 30 45 Q 34 42 38 45',
    rightEye: 'M 52 45 Q 56 42 60 45',
    mouth: 'M 38 59 Q 45 62 52 59',
  },
  worried: {
    leftEye: 'M 30 47 Q 34 43 38 47',
    rightEye: 'M 52 47 Q 56 43 60 47',
    mouth: 'M 38 63 Q 45 57 52 63',
  },
  alert: {
    leftEye: 'M 30 47 Q 34 41 38 47',
    rightEye: 'M 52 47 Q 56 41 60 47',
    mouth: 'M 38 63 Q 45 56 52 63',
  },
}

export default function MascotSVG({ mood, size = 120, animate = true }: Props) {
  const colors = moodColors[mood]
  const expr = expressions[mood]

  const floatVariants: Variants = {
    animate: {
      y: [0, -10, 0],
      rotate: [0, -3, 3, 0],
      transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' as const },
    },
  }

  const bounceVariants: Variants = {
    animate: {
      scale: [1, 1.1, 1],
      rotate: [0, -4, 4, 0],
      transition: { duration: 0.7, repeat: Infinity, repeatDelay: 0.8 },
    },
  }

  return (
    <motion.div
      variants={animate ? (mood === 'excited' ? bounceVariants : floatVariants) : undefined}
      animate={animate ? 'animate' : undefined}
      whileHover={animate ? { scale: 1.08, rotate: [0, -5, 5, 0] } : undefined}
      whileTap={animate ? { scale: 0.92 } : undefined}
      style={{ width: size, height: size, display: 'inline-block', cursor: 'pointer', position: 'relative' }}
    >
      <svg
        viewBox="0 0 90 100"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`Mascotte in stato: ${mood}`}
      >
        {/* Soft shadow under */}
        <ellipse cx="45" cy="94" rx="26" ry="5" fill={colors.cheek} opacity="0.18" />

        {/* Ears (rounder, cuter) */}
        <ellipse cx="22" cy="36" rx="11" ry="13" fill={colors.body} transform="rotate(-18 22 36)" />
        <ellipse cx="68" cy="36" rx="11" ry="13" fill={colors.body} transform="rotate(18 68 36)" />
        <ellipse cx="23" cy="38" rx="5" ry="7" fill={colors.cheek} opacity="0.55" transform="rotate(-18 23 38)" />
        <ellipse cx="67" cy="38" rx="5" ry="7" fill={colors.cheek} opacity="0.55" transform="rotate(18 67 38)" />

        {/* Body (big round and chubby) */}
        <ellipse cx="45" cy="56" rx="38" ry="36" fill={colors.body} />

        {/* Belly highlight */}
        <ellipse cx="45" cy="62" rx="26" ry="24" fill={colors.belly} opacity="0.7" />

        {/* Coin slot */}
        <rect x="36" y="24" width="18" height="4.5" rx="2.25" fill="#fff" opacity="0.85" />
        <rect x="36" y="24" width="18" height="4.5" rx="2.25" fill={colors.cheek} opacity="0.35" />

        {/* Cheeks blush */}
        <ellipse cx="24" cy="58" rx="7" ry="5" fill={colors.cheek} opacity="0.55" />
        <ellipse cx="66" cy="58" rx="7" ry="5" fill={colors.cheek} opacity="0.55" />

        {/* Snout */}
        <ellipse cx="45" cy="62" rx="15" ry="11" fill={colors.cheek} opacity="0.45" />
        <circle cx="40" cy="63" r="2.6" fill="#7a5a6e" opacity="0.6" />
        <circle cx="50" cy="63" r="2.6" fill="#7a5a6e" opacity="0.6" />

        {/* Eyes */}
        <motion.path
          d={expr.leftEye}
          stroke="#5b4a6b"
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
          animate={animate && mood === 'excited' ? { d: [expr.leftEye, expressions.happy.leftEye, expr.leftEye] } : {}}
          transition={{ duration: 1, repeat: Infinity, repeatDelay: 1.5 }}
        />
        <motion.path
          d={expr.rightEye}
          stroke="#5b4a6b"
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        />
        {/* Sparkle eyes */}
        <circle cx="36" cy="42" r="1.3" fill="#fff" opacity="0.9" />
        <circle cx="58" cy="42" r="1.3" fill="#fff" opacity="0.9" />

        {/* Mouth */}
        <path
          d={expr.mouth}
          stroke="#5b4a6b"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        />

        {/* Feet */}
        <ellipse cx="30" cy="89" rx="9" ry="6" fill={colors.body} />
        <ellipse cx="60" cy="89" rx="9" ry="6" fill={colors.body} />

        {/* Shine */}
        <ellipse cx="32" cy="40" rx="6" ry="5" fill="white" opacity="0.4" transform="rotate(-20 32 40)" />
      </svg>
    </motion.div>
  )
}

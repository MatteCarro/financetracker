import { motion, type Variants } from 'framer-motion'
import type { MascotMood } from './mascotPersonality'

interface Props {
  mood: MascotMood
  size?: number
  animate?: boolean
}

const moodColors: Record<MascotMood, { body: string; cheek: string }> = {
  excited: { body: '#f97316', cheek: '#fb923c' },
  happy: { body: '#f59e0b', cheek: '#fbbf24' },
  neutral: { body: '#6366f1', cheek: '#818cf8' },
  worried: { body: '#8b5cf6', cheek: '#a78bfa' },
  alert: { body: '#ef4444', cheek: '#f87171' },
}

// Eye/mouth expressions
const expressions: Record<MascotMood, { leftEye: string; rightEye: string; mouth: string }> = {
  excited: {
    leftEye: 'M 30 44 Q 34 38 38 44',
    rightEye: 'M 52 44 Q 56 38 60 44',
    mouth: 'M 36 58 Q 45 68 54 58',
  },
  happy: {
    leftEye: 'M 30 44 Q 34 40 38 44',
    rightEye: 'M 52 44 Q 56 40 60 44',
    mouth: 'M 36 57 Q 45 64 54 57',
  },
  neutral: {
    leftEye: 'M 30 44 Q 34 42 38 44',
    rightEye: 'M 52 44 Q 56 42 60 44',
    mouth: 'M 37 58 Q 45 60 53 58',
  },
  worried: {
    leftEye: 'M 30 46 Q 34 42 38 46',
    rightEye: 'M 52 46 Q 56 42 60 46',
    mouth: 'M 37 62 Q 45 56 53 62',
  },
  alert: {
    leftEye: 'M 30 46 Q 34 40 38 46',
    rightEye: 'M 52 46 Q 56 40 60 46',
    mouth: 'M 37 62 Q 45 55 53 62',
  },
}

export default function MascotSVG({ mood, size = 96, animate = true }: Props) {
  const colors = moodColors[mood]
  const expr = expressions[mood]

  const floatVariants: Variants = {
    animate: {
      y: [0, -6, 0],
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const },
    },
  }

  const bounceVariants: Variants = {
    animate: {
      scale: [1, 1.08, 1],
      transition: { duration: 0.6, repeat: Infinity, repeatDelay: 2 },
    },
  }

  return (
    <motion.div
      variants={animate ? (mood === 'excited' ? bounceVariants : floatVariants) : undefined}
      animate={animate ? 'animate' : undefined}
      style={{ width: size, height: size, display: 'inline-block' }}
    >
      <svg
        viewBox="0 0 90 100"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`Mascotte in stato: ${mood}`}
      >
        {/* Body */}
        <ellipse cx="45" cy="58" rx="35" ry="32" fill={colors.body} />

        {/* Coin slot on top */}
        <ellipse cx="45" cy="26" rx="20" ry="18" fill={colors.body} />
        <ellipse cx="45" cy="26" rx="20" ry="18" fill="url(#headShading)" />
        <rect x="38" y="14" width="14" height="4" rx="2" fill="#0f172a" opacity="0.6" />

        {/* Ears */}
        <ellipse cx="16" cy="52" rx="8" ry="10" fill={colors.body} />
        <ellipse cx="74" cy="52" rx="8" ry="10" fill={colors.body} />
        <ellipse cx="16" cy="52" rx="4" ry="6" fill={colors.cheek} opacity="0.5" />
        <ellipse cx="74" cy="52" rx="4" ry="6" fill={colors.cheek} opacity="0.5" />

        {/* Snout */}
        <ellipse cx="45" cy="63" rx="14" ry="10" fill={colors.cheek} opacity="0.7" />
        {/* Nostrils */}
        <circle cx="40" cy="64" r="2.5" fill="#0f172a" opacity="0.5" />
        <circle cx="50" cy="64" r="2.5" fill="#0f172a" opacity="0.5" />

        {/* Cheeks blush */}
        <ellipse cx="27" cy="60" rx="6" ry="4" fill={colors.cheek} opacity="0.5" />
        <ellipse cx="63" cy="60" rx="6" ry="4" fill={colors.cheek} opacity="0.5" />

        {/* Eyes */}
        <motion.path
          d={expr.leftEye}
          stroke="#0f172a"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          animate={animate && mood === 'excited' ? { d: [expr.leftEye, expressions.happy.leftEye, expr.leftEye] } : {}}
          transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.5 }}
        />
        <motion.path
          d={expr.rightEye}
          stroke="#0f172a"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* Mouth */}
        <motion.path
          d={expr.mouth}
          stroke="#0f172a"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Belly highlight */}
        <ellipse cx="45" cy="68" rx="18" ry="14" fill="white" opacity="0.08" />

        {/* Legs */}
        <ellipse cx="32" cy="88" rx="8" ry="5" fill={colors.body} />
        <ellipse cx="58" cy="88" rx="8" ry="5" fill={colors.body} />

        {/* Shine */}
        <ellipse cx="38" cy="38" rx="5" ry="4" fill="white" opacity="0.25" transform="rotate(-20 38 38)" />

        <defs>
          <radialGradient id="headShading" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="white" stopOpacity="0.2" />
            <stop offset="100%" stopColor="black" stopOpacity="0.1" />
          </radialGradient>
        </defs>
      </svg>
    </motion.div>
  )
}

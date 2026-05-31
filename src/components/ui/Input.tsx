import { type InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: string
}

export default function Input({ label, error, icon, className = '', ...props }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-[var(--color-text-secondary)]">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">{icon}</span>
        )}
        <input
          {...props}
          className={`
            w-full glass rounded-xl h-12 px-4 text-[var(--color-text-primary)]
            bg-transparent outline-none
            placeholder:text-[var(--color-text-muted)]
            focus:border-[var(--color-primary)]/60
            transition-all duration-200
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-[var(--color-danger)]/60' : ''}
            ${className}
          `}
        />
      </div>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  )
}

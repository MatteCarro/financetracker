// Italian locale currency and number formatting

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatCompact(amount: number, currency = 'EUR'): string {
  if (Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount)
  }
  return formatCurrency(amount, currency)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

export function formatPercent(n: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(n / 100)
}

export function parseItalianNumber(s: string): number {
  // Replace Italian thousands separator and decimal comma
  return parseFloat(s.replace(/\./g, '').replace(',', '.'))
}

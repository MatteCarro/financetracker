export type MascotMood = 'happy' | 'excited' | 'neutral' | 'worried' | 'alert'

export interface MascotMessage {
  mood: MascotMood
  text: string
}

export function getMascotMood(savingsRate: number, overdueItems: number): MascotMood {
  if (overdueItems > 2) return 'alert'
  if (savingsRate >= 20) return 'excited'
  if (savingsRate >= 5) return 'happy'
  if (savingsRate < 0) return 'worried'
  return 'neutral'
}

const messages: Record<MascotMood, string[]> = {
  excited: [
    'Fantastico! Stai risparmiando alla grande! 🎉',
    'Che mese brillante! Il tuo salvadanaio è felice!',
    'Wow, stai davvero spaccando! Continua così!',
  ],
  happy: [
    'Tutto sotto controllo, bravo!',
    'Le tue finanze sono in buona salute.',
    'Stai andando bene! Tieni il ritmo.',
  ],
  neutral: [
    'Ciao! Come posso aiutarti oggi?',
    'Ricordati di registrare le spese!',
    'Un piccolo passo alla volta verso i tuoi obiettivi.',
  ],
  worried: [
    'Attenzione: stai spendendo più di quanto guadagni.',
    'Questo mese le uscite superano le entrate. Rivediamo il budget?',
    'Qualcosa non torna. Controlliamo le spese insieme.',
  ],
  alert: [
    'Hai diverse scadenze imminenti! Preparati.',
    'Ci sono pagamenti urgenti in arrivo, non dimenticarli!',
    'Allerta scadenze! Verifica i prossimi impegni.',
  ],
}

export function getMascotMessage(mood: MascotMood): string {
  const list = messages[mood]
  return list[Math.floor(Math.random() * list.length)]
}

export const GREETINGS = [
  'Ciao! Sono {name}, il tuo assistente finanziario.',
  'Bentornato! Vediamo come stai con le finanze.',
  'Pronto per gestire i tuoi soldi? Ci penso io!',
]

export function getGreeting(name: string): string {
  const base = GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
  return base.replace('{name}', name)
}

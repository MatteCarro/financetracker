# FinanceTracker 🐷

Un tracker finanziario personale **PWA installabile su iPhone**, completamente locale e sicuro.

## Funzionalità

- **Dashboard** — saldo aggregato, disponibilità reale, flusso di cassa, tasso di risparmio, grafici spese
- **Movimenti** — entrate e uscite con categoria, conto/carta, date e filtri
- **Finanze** (tab con sub-navigazione):
  - **Conti** — CRUD conti correnti, risparmio, contanti con saldo aggiornato dai movimenti
  - **Carte di credito** — plafond, saldo consumato/residuo, date estratto conto
  - **Abbonamenti** — CRUD con frequenza, prossimo rinnovo, riepilogo costi mensili/annuali
  - **Rate** — CRUD con importo totale, numero rate, avanzamento e segna-pagata
  - **Debiti** — CRUD con importo residuo, rata mensile e proiezione estinzione
  - **Entrate** — CRUD entrate ricorrenti con giorno accredito previsto
  - **Obiettivi di risparmio** — CRUD con barra avanzamento e calcolo importo mensile necessario
- **Insights** — trend 6 mesi, spese per categoria, suggerimenti automatici di risparmio
- **Mascotte "Soldino"** — salvadanaio SVG animato con umore reattivo alle finanze
- **Backup/Ripristino** — export/import JSON locale (nessun cloud)

## Sicurezza

Vedi [`SECURITY.md`](./SECURITY.md).

- 100% locale, nessun backend, nessun analytics
- PIN con derivazione PBKDF2 (310.000 iterazioni)
- Crittografia AES-GCM a riposo
- Lock automatico con timeout configurabile

## Setup locale

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # build di produzione
npm run preview   # preview del build
```

## Stack

| Libreria | Versione | Scopo |
|---|---|---|
| Vite + React + TypeScript | 6/19/5 | Build, UI, tipizzazione |
| Tailwind CSS v4 | — | Styling utility-first |
| vite-plugin-pwa | — | PWA, Service Worker, manifest |
| Dexie.js | — | IndexedDB wrapper |
| Zustand | — | State management |
| Framer Motion | — | Animazioni mascotte e UI |
| Recharts | — | Grafici |
| date-fns | — | Gestione date in italiano |
| Web Crypto API | nativa | Crittografia AES-GCM + PBKDF2 |

## Installazione su iPhone

1. Apri Safari e naviga all'URL del server (o build hostato)
2. Tap su **Condividi** → **Aggiungi alla schermata Home**
3. L'app funziona offline dopo la prima visita

## Struttura del progetto

```
src/
  app/              # App root, routing, layout
  components/
    ui/             # Card, Button, Input, Modal, ProgressBar, AmountInput
    layout/         # TabBar
  features/
    home/           # Dashboard
    transactions/   # Movimenti
    accounts/       # Conti + Carte
    subscriptions/  # Abbonamenti
    installments/   # Rate
    debts/          # Debiti
    income/         # Entrate
    goals/          # Obiettivi di risparmio
    insights/       # Come risparmiare
    mascot/         # SVG mascotte + personalità
    finance/        # Tab Finanze (sub-navigazione)
    settings/       # Impostazioni + PinSetup + LockScreen
  db/               # Dexie schema + seed
  crypto/           # AES-GCM, PBKDF2
  store/            # Zustand stores
  lib/              # Tipi, currency, dates, finance calc
```

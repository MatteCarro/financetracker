# Sincronizzazione cloud (Supabase)

L'app è **local-first**: funziona offline e tiene i dati sul dispositivo. La
sincronizzazione cloud è **opzionale** e serve per allineare i dati tra PC e
iPhone. I dati vengono **cifrati end-to-end** (AES-GCM) con una *passphrase di
sincronizzazione*: il server vede solo testo cifrato e un identificativo di
gruppo che è un hash della passphrase. Senza la passphrase nessuno — nemmeno
Supabase — può leggere i tuoi dati.

## 1. Crea un progetto Supabase

1. Vai su https://supabase.com → **New project** (il piano gratuito basta).
2. Scegli nome e password del DB, attendi il provisioning.

## 2. Crea la tabella

Nel progetto: **SQL Editor → New query**, incolla ed esegui:

```sql
create table if not exists public.snapshots (
  group_id   text primary key,
  payload    text not null,
  rev        bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.snapshots enable row level security;

-- Le policy aperte sono sicure: il payload è cifrato end-to-end e group_id è
-- un hash di una passphrase segreta (le righe trapelate sono inutili senza di essa).
create policy "anon select" on public.snapshots for select to anon using (true);
create policy "anon insert" on public.snapshots for insert to anon with check (true);
create policy "anon update" on public.snapshots for update to anon using (true) with check (true);
```

## 3. Prendi le chiavi

**Project Settings → API**:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon public key** → `VITE_SUPABASE_ANON_KEY`

## 4. Configura le variabili d'ambiente

### In locale
Crea un file `.env` nella root (vedi `.env.example`):
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Su Vercel
**Project → Settings → Environment Variables** → aggiungi le due variabili per
*Production* (e *Preview* se vuoi) → **Redeploy**.

## 5. Attiva il sync nell'app

1. Apri l'app → **Impostazioni → Sincronizzazione cloud**.
2. Inserisci una **passphrase** (almeno 6 caratteri) e premi **Attiva sync**.
3. Sull'altro dispositivo, nello stesso profilo, inserisci **la stessa
   passphrase**: i dati si allineano automaticamente.

La sincronizzazione avviene allo sblocco, periodicamente, quando l'app torna in
primo piano e col pulsante **Sincronizza ora**.

## Note

- La passphrase di sync è **diversa** dal PIN del profilo. Scegline una che
  ricordi: senza, i dati cifrati nel cloud non sono recuperabili.
- Ogni profilo (Matteo / Alessia) sincronizza separatamente: usa una passphrase
  per profilo (o la stessa, ma su gruppi diversi i dati restano comunque distinti
  perché parti da database locali distinti).
- I conflitti si risolvono per record con strategia *last-write-wins* sul campo
  `updatedAt`; le cancellazioni si propagano tramite tombstone.

# Collega un conto bancario (Open Banking)

Questa funzione aggiunge in **Impostazioni** un pulsante **"Collega conto"**: scegli
la tua banca, ti autentichi sul **sito ufficiale della banca** (accesso in sola
lettura, PSD2) e l'app importa **conti e movimenti** in automatico nel tracker.

L'app è una PWA che gira nel browser, quindi le chiavi segrete dell'aggregatore
bancario **non possono** stare nel frontend. Usiamo perciò una piccola
**Supabase Edge Function** (`bank-data`) come backend, che tiene i segreti lato
server. Il provider è **GoCardless Bank Account Data** (ex Nordigen): gratuito e
con ottima copertura delle banche italiane/EU.

> Prerequisito: il **sync cloud Supabase** deve essere già configurato
> (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`). Vedi `SUPABASE.md`.

## 1. Crea un account GoCardless Bank Account Data

1. Registrati su <https://bankaccountdata.gocardless.com/> (piano gratuito).
2. Vai su **Developers → User secrets → Create new** e copia:
   - **Secret ID** → `GOCARDLESS_SECRET_ID`
   - **Secret Key** → `GOCARDLESS_SECRET_KEY`

## 2. Imposta i segreti su Supabase

Servono solo lato server (Edge Function), **mai** nel frontend:

```bash
supabase secrets set \
  GOCARDLESS_SECRET_ID=la-tua-secret-id \
  GOCARDLESS_SECRET_KEY=la-tua-secret-key
```

## 3. Fai il deploy della Edge Function

La function è già nel repo in `supabase/functions/bank-data/`.

```bash
# una tantum, se non l'hai già fatto:
supabase login
supabase link --project-ref <il-tuo-project-ref>

# deploy:
supabase functions deploy bank-data
```

L'app la invoca con l'**anon key** (lo stesso client Supabase del sync), quindi
non serve altra configurazione lato frontend.

## 4. Usa la funzione nell'app

1. Apri l'app → **Impostazioni → Conti bancari (Open Banking)**.
2. Premi **🔗 Collega conto**, cerca e seleziona la tua banca.
3. Verrai reindirizzato al login ufficiale della banca: autorizza l'accesso.
4. Al ritorno nell'app, conti e movimenti vengono importati in automatico.
5. In seguito puoi premere **🔄** accanto alla banca per ri-sincronizzare.

## Come funziona / Note

- **Sola lettura**: l'autorizzazione PSD2 consente solo di leggere conti e
  movimenti, mai di disporre pagamenti.
- **Importazione**: ogni conto bancario diventa un *Conto* nel tracker; i
  movimenti diventano transazioni (categoria predefinita **"Altro"**, da
  ricategorizzare a piacere). I movimenti sono **deduplicati** tramite l'id
  della banca, quindi ri-sincronizzare non crea doppioni.
- **Sync cloud**: i conti e i movimenti importati seguono il normale sync cifrato
  tra dispositivi. Il *collegamento* in sé (token/requisizione) resta invece
  **solo sul dispositivo** che ha effettuato il login.
- **Rate limit**: GoCardless limita le letture (qualche richiesta al giorno per
  conto), quindi evita di premere 🔄 troppe volte di seguito.
- **Scadenza consenso**: il consenso PSD2 dura ~90 giorni; dopo va rinnovato
  ripetendo il collegamento.
- **Sandbox**: per provare senza una banca vera, in fase di selezione cerca
  *"Sandbox Finance"* (istituto di test di GoCardless).

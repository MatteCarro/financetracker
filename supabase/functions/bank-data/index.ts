// Supabase Edge Function: Open Banking proxy for GoCardless Bank Account Data.
//
// The browser must NEVER hold the GoCardless secrets, so all provider calls go
// through here. Set the secrets once with:
//
//   supabase secrets set GOCARDLESS_SECRET_ID=... GOCARDLESS_SECRET_KEY=...
//
// Deploy with:
//
//   supabase functions deploy bank-data
//
// The frontend calls it via `supabase.functions.invoke('bank-data', { body })`.
// See BANK_LINKING.md for the full setup.

// @ts-nocheck — this file runs on Deno (Edge runtime), not in the app's TS build.

const GC_BASE = 'https://bankaccountdata.gocardless.com/api/v2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function getToken(): Promise<string> {
  const secret_id = Deno.env.get('GOCARDLESS_SECRET_ID')
  const secret_key = Deno.env.get('GOCARDLESS_SECRET_KEY')
  if (!secret_id || !secret_key) {
    throw new Error('Secrets GoCardless mancanti sul server (GOCARDLESS_SECRET_ID / KEY).')
  }
  const res = await fetch(`${GC_BASE}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ secret_id, secret_key }),
  })
  if (!res.ok) {
    throw new Error(`Autenticazione GoCardless fallita (${res.status}).`)
  }
  const data = await res.json()
  return data.access as string
}

async function gcGet(path: string, token: string): Promise<any> {
  const res = await fetch(`${GC_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GoCardless ${path} → ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

async function gcPost(path: string, token: string, body: unknown): Promise<any> {
  const res = await fetch(`${GC_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GoCardless ${path} → ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

// Pick the most representative balance from the list GoCardless returns.
const BALANCE_PRIORITY = [
  'closingBooked',
  'expected',
  'interimAvailable',
  'interimBooked',
  'openingBooked',
  'forwardAvailable',
]
function pickBalance(balances: any[]): { amount: number; currency: string } {
  if (!Array.isArray(balances) || balances.length === 0) return { amount: 0, currency: 'EUR' }
  let chosen = balances[0]
  for (const type of BALANCE_PRIORITY) {
    const found = balances.find((b) => b.balanceType === type)
    if (found) {
      chosen = found
      break
    }
  }
  return {
    amount: parseFloat(chosen?.balanceAmount?.amount ?? '0') || 0,
    currency: chosen?.balanceAmount?.currency ?? 'EUR',
  }
}

function describe(t: any): string {
  const r = t.remittanceInformationUnstructured
  if (r) return String(r)
  if (Array.isArray(t.remittanceInformationUnstructuredArray)) {
    return t.remittanceInformationUnstructuredArray.join(' ')
  }
  return t.creditorName || t.debtorName || t.additionalInformation || 'Movimento bancario'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, ...payload } = await req.json()
    const token = await getToken()

    if (action === 'institutions') {
      const country = (payload.country as string) || 'IT'
      const list = await gcGet(`/institutions/?country=${encodeURIComponent(country)}`, token)
      const institutions = (list as any[]).map((i) => ({
        id: i.id,
        name: i.name,
        logo: i.logo,
        bic: i.bic,
      }))
      return json({ institutions })
    }

    if (action === 'create-requisition') {
      const { institutionId, redirect, reference } = payload
      if (!institutionId || !redirect) {
        return json({ error: 'Parametri mancanti (institutionId/redirect).' }, 400)
      }
      const req = await gcPost(`/requisitions/`, token, {
        redirect,
        institution_id: institutionId,
        reference,
        user_language: 'IT',
      })
      return json({ requisitionId: req.id, link: req.link })
    }

    if (action === 'fetch-data') {
      const { requisitionId } = payload
      if (!requisitionId) return json({ error: 'requisitionId mancante.' }, 400)

      const requisition = await gcGet(`/requisitions/${requisitionId}/`, token)
      const accountIds: string[] = requisition.accounts ?? []
      const accounts = []

      for (const accId of accountIds) {
        // These three calls are rate-limited by GoCardless (a few per day).
        const [details, balances, txResp] = await Promise.all([
          gcGet(`/accounts/${accId}/details/`, token).catch(() => ({})),
          gcGet(`/accounts/${accId}/balances/`, token).catch(() => ({ balances: [] })),
          gcGet(`/accounts/${accId}/transactions/`, token).catch(() => ({ transactions: { booked: [] } })),
        ])

        const acc = (details as any).account ?? {}
        const balance = pickBalance((balances as any).balances ?? [])
        const booked = (txResp as any).transactions?.booked ?? []

        const transactions = booked.map((t: any) => ({
          externalId: t.transactionId || t.internalTransactionId || `${t.bookingDate}-${t.transactionAmount?.amount}-${describe(t)}`,
          date: t.bookingDate || t.valueDate || new Date().toISOString().slice(0, 10),
          amount: parseFloat(t.transactionAmount?.amount ?? '0') || 0,
          currency: t.transactionAmount?.currency ?? balance.currency,
          description: describe(t),
        }))

        accounts.push({
          externalId: accId,
          iban: acc.iban,
          name: acc.name || acc.ownerName || acc.product,
          currency: acc.currency || balance.currency,
          balance: balance.amount,
          transactions,
        })
      }

      return json({ accounts })
    }

    return json({ error: `Azione sconosciuta: ${action}` }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Errore interno' }, 500)
  }
})
